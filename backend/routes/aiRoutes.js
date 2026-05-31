/**
 * [CVE-2 Fixed by Herta] — Secure AI Proxy Route
 * ================================================
 * Semua panggilan ke Gemini API WAJIB melewati endpoint ini.
 * API Keys Gemini disimpan di server (.env), TIDAK pernah dikirim ke browser.
 *
 * Frontend hanya mengirim: { prompt, purpose, temperature, jsonMode }
 * Backend yang memanggil Gemini dengan key yang aman.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken.js';

const router = express.Router();

// Ambil konfigurasi dari .env (AMAN — tidak pernah terekspos ke browser)
const API_KEYS = [
  process.env.GEMINI_API_KEY_PRIMARY,
  process.env.GEMINI_API_KEY_SECONDARY,
  process.env.GEMINI_API_KEY_TERTIARY,
  process.env.GEMINI_API_KEY_QUATERNARY,
  process.env.GEMINI_API_KEY_FIFTH,
  process.env.GEMINI_API_KEY_SIXTH,
  process.env.GEMINI_API_KEY_SEVENTH,
  process.env.GEMINI_API_KEY_EIGHTH
].filter(Boolean);

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Rate Limiter khusus AI — cegah pengguna menghabiskan kuota
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 60, // Maks 60 panggilan AI per jam per IP
  message: { error: 'Kuota AI Anda habis untuk jam ini. Silakan coba lagi nanti.' }
});

// Middleware Terpadu Herta: Mendukung Firebase ID Token (Header) dan JWT Cookie (Fallback)
async function requireAuthOrFirebaseToken(req, res, next) {
  // 1. Coba Authorization Header (Firebase ID Token) dahulu
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyFirebaseToken(req, res, next);
  }

  // 2. Fallback ke JWT Cookie
  const token = req.cookies?.slaycount_token;
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Sesi tidak ditemukan atau token otorisasi tidak disertakan.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesi tidak valid atau sudah kadaluarsa.' });
  }
}

// State Round-Robin untuk load balancing antar key
let currentKeyIndex = 0;
function getNextKey() {
  if (API_KEYS.length === 0) throw new Error('Tidak ada Gemini API Key di server.');
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

// Algoritma Cerdas Herta untuk Memperbaiki JSON Terpotong (Truncated JSON Auto-Repair)
// Menangani secara elegan jika respons Gemini Vision terpotong di tengah jalan.
function repairTruncatedJson(str) {
  try {
    str = str.trim();
    if (str.startsWith('{') && str.endsWith('}')) {
      return JSON.parse(str);
    }
    
    if (str.includes('```')) {
      str = str.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    let inString = false;
    let escaped = false;
    let cleaned = "";

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      if (char === '\\' && !escaped) {
        escaped = true;
      } else {
        escaped = false;
      }
      cleaned += char;
    }

    if (inString) {
      cleaned += '"';
    }

    let success = false;
    let resultObj = {};
    
    for (let braces = 1; braces <= 3; braces++) {
      try {
        const candidate = cleaned + "}".repeat(braces);
        resultObj = JSON.parse(candidate);
        success = true;
        break;
      } catch (e) {}
    }

    if (success) return resultObj;

    let temp = cleaned;
    while (temp.length > 0 && !success) {
      temp = temp.slice(0, -1).trim();
      if (temp.endsWith(',')) {
        temp = temp.slice(0, -1).trim();
      }
      for (let braces = 1; braces <= 2; braces++) {
        try {
          const candidate = temp + "}".repeat(braces);
          resultObj = JSON.parse(candidate);
          success = true;
          break;
        } catch (e) {}
      }
    }

    if (success) return resultObj;
  } catch (err) {
    console.warn('[JSON Repair] Gagal memperbaiki:', err.message);
  }
  return null;
}

/**
 * POST /api/ai/generate
 * Endpoint proxy yang aman untuk memanggil Gemini
 */
router.post('/generate', requireAuthOrFirebaseToken, aiLimiter, async (req, res) => {
  const { prompt, purpose = 'worker', temperature = 0.1, jsonMode = true } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 20000) {
    return res.status(400).json({ error: 'Prompt tidak valid atau terlalu panjang.' });
  }

  let lastError = null;
  const maxRetries = API_KEYS.length;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextKey();

    const modelName = MODEL;

    try {
      const url = `${GEMINI_API_BASE}/${modelName}:generateContent?key=${apiKey}`;

      const parts = [];
      if (req.body.image && req.body.mimeType) {
        parts.push({
          inlineData: {
            mimeType: req.body.mimeType,
            data: req.body.image
          }
        });
      }
      parts.push({ text: prompt });

      const requestBody = {
        contents: [{ parts }],
        generationConfig: {
          temperature,
          maxOutputTokens: purpose === 'worker' ? 1024 : 2048,
          ...(jsonMode && { responseMimeType: 'application/json' }),
          ...(req.body.stopSequences && { stopSequences: req.body.stopSequences })
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      };

      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      // Failover Dinamis Herta Tahap 1: Jika model yang direquest (gemini-3.5-flash) belum didukung/404, fallback ke gemini-3-flash
      if (!response.ok && (response.status === 404 || response.status === 400)) {
        console.warn(`[Proxy AI] Model ${modelName} tidak didukung atau 404/400. Melakukan failover dinamis ke gemini-3-flash...`);
        const fallbackUrl1 = `${GEMINI_API_BASE}/gemini-3-flash:generateContent?key=${apiKey}`;
        response = await fetch(fallbackUrl1, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
      }

      // Failover Dinamis Herta Tahap 1.5: Jika gemini-3-flash gagal, fallback ke gemini-3-flash-preview
      if (!response.ok && (response.status === 429 || response.status === 404 || response.status === 400)) {
        console.warn(`[Proxy AI] Model gemini-3-flash gagal. Melakukan failover ke gemini-3-flash-preview...`);
        const fallbackUrl2 = `${GEMINI_API_BASE}/gemini-3-flash-preview:generateContent?key=${apiKey}`;
        response = await fetch(fallbackUrl2, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
      }

      // Failover Dinamis Herta Tahap 2: Jika gemini-3-flash-preview gagal, coba gemini-2.5-flash
      if (!response.ok && (response.status === 429 || response.status === 404 || response.status === 400)) {
        console.warn(`[Proxy AI] Model gemini-3-flash-preview gagal. Melakukan failover ke gemini-2.5-flash...`);
        const ultimateUrl = `${GEMINI_API_BASE}/gemini-2.5-flash:generateContent?key=${apiKey}`;
        response = await fetch(ultimateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
      }

      // Failover Dinamis Herta Tahap 3: Jika gemini-2.5-flash juga gagal, coba gemini-1.5-flash sebagai cadangan ultra-stabil akhir
      if (!response.ok && (response.status === 429 || response.status === 404 || response.status === 400)) {
        console.warn(`[Proxy AI] Model gemini-2.5-flash gagal. Melakukan failover ke gemini-1.5-flash...`);
        const legacyUrl = `${GEMINI_API_BASE}/gemini-1.5-flash:generateContent?key=${apiKey}`;
        response = await fetch(legacyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429 || response.status === 403 || response.status === 401) {
          console.warn(`[Proxy AI] Key ke-${attempt+1} gagal dengan status ${response.status}. Mencoba key berikutnya...`);
          lastError = new Error(`API Key error: ${response.status}`);
          continue;
        }
        throw new Error(errData?.error?.message || `Gemini API Error ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON jika diminta
      if (jsonMode) {
        try {
          let cleanText = text.trim();
          if (cleanText.includes('```')) {
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
          }
          return res.json({ result: JSON.parse(cleanText) });
        } catch {
          // Percobaan perbaikan otomatis Herta untuk JSON terpotong
          const repaired = repairTruncatedJson(text);
          if (repaired) {
            console.log(`[Proxy AI] Berhasil memperbaiki JSON terpotong secara otomatis!`);
            return res.json({ result: repaired });
          }
          // Coba cari pola {...} menggunakan regex sebagai upaya terakhir
          try {
            const match = text.match(/\{.*\}/s)?.[0];
            if (match) {
              return res.json({ result: JSON.parse(match) });
            }
          } catch {}
          console.warn(`[Proxy AI] Gagal mem-parse JSON dari AI. Raw text: ${text}`);
          return res.json({ result: { raw: text, parseError: true } });
        }
      }

      return res.json({ result: text });

    } catch (error) {
      lastError = error;
    }
  }

  // ==========================================
  // FAILOVER DINAMIS HERTA TAHAP 4: OPENROUTER
  // Jika seluruh API key Gemini langsung di Google Cloud diblokir/gagal,
  // lakukan failover otomatis menggunakan OpenRouter API Key yang aktif!
  // Ini menjamin sistem scan nota tetap berjalan 100% andal & tahan banting.
  // ==========================================
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      console.warn(`[Proxy AI] Seluruh API key Gemini langsung gagal/diblokir. Melakukan failover darurat ke OpenRouter...`);
      
      const messages = [];
      const userContent = [{ type: 'text', text: prompt }];
      
      if (req.body.image && req.body.mimeType) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${req.body.mimeType};base64,${req.body.image}`
          }
        });
      }
      
      messages.push({ role: 'user', content: userContent });
      
      const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
          max_tokens: purpose === 'worker' ? 1000 : 2048,
          temperature,
          ...(jsonMode && { response_format: { type: 'json_object' } })
        })
      });
      
      if (openRouterResponse.ok) {
        const orData = await openRouterResponse.json();
        const text = orData.choices?.[0]?.message?.content || '';
        console.log(`[Proxy AI] Sukses via OpenRouter Failover! Model: ${orData.model}`);
        
        let cleanText = text.trim();
        if (cleanText.includes('```')) {
          cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
        }
        
        if (jsonMode) {
          try {
            return res.json({ result: JSON.parse(cleanText) });
          } catch {
            const match = text.match(/\{.*\}/s)?.[0];
            if (match) {
              return res.json({ result: JSON.parse(match) });
            }
            return res.json({ result: { raw: text, parseError: true } });
          }
        }
        return res.json({ result: text });
      } else {
        const orErr = await openRouterResponse.json().catch(() => ({}));
        console.error(`[Proxy AI] OpenRouter Failover gagal dengan status ${openRouterResponse.status}:`, orErr.error?.message);
      }
    } catch (orErr) {
      console.error(`[Proxy AI] Error pada OpenRouter Failover:`, orErr.message);
    }
  }

  res.status(502).json({ error: 'Layanan AI tidak tersedia saat ini. Silakan coba lagi.' });
});

export default router;

