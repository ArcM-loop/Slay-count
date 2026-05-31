/**
 * MULTI-MODEL SWARM GATEWAY
 * ==========================================
 * Orchestrates calls between different LLM providers (Google & Meta/OpenRouter).
 * 
 * Flow:
 * - Tier 1: Gemini 3 Flash (Fast validation)
 * - Tier 2: Llama 3.3 70B (Deep audit & senior consensus)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenRouter } from "@openrouter/sdk";

// 1. Gemini Configuration
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// 2. Llama & GPT (OpenRouter) Configuration
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});
const LLAMA_MODEL = process.env.LLAMA_MODEL || 'meta-llama/llama-3.3-70b-instruct';
const GPT_MODEL = process.env.GPT_MODEL || 'openai/gpt-oss-120b:free';

/**
 * Call Gemini (Primary Worker - Round Robin & Dynamic Fallback Chain)
 */
export async function callGemini(prompt, options = {}) {
  // Gunakan load balancing antar key jika ada
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
  
  if (API_KEYS.length === 0) {
    throw new Error('Tidak ada Gemini API Key yang dikonfigurasi di server.');
  }

  const apiKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
  
  const modelsToTry = [
    GEMINI_MODEL,
    'gemini-3-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash'
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[MultiGateway] Mencoba model Gemini: ${modelName}...`);
      const genAI_instance = new GoogleGenerativeAI(apiKey);
      const model = genAI_instance.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      return options.jsonMode ? parseJSON(text) : text;
    } catch (err) {
      console.warn(`[MultiGateway] Model Gemini ${modelName} gagal: ${err.message}. Mencoba fallback berikutnya...`);
      lastError = err;
    }
  }

  console.error('[MultiGateway] Semua model fallback Gemini gagal.');
  throw lastError;
}

/**
 * Generic OpenRouter Call (Llama, GPT, etc.) with Timeout & Gemini Failover
 */
async function callOpenRouter(model, prompt, options = {}) {
  try {
    console.log(`[MultiGateway] Memanggil OpenRouter model ${model} (Timeout: 6 detik)...`);
    
    // Gunakan Promise.race untuk memberikan batas waktu 6 detik
    const response = await Promise.race([
      openrouter.chat.send({
        model: model,
        messages: [
          {
            role: "system",
            content: options.systemPrompt || "Anda adalah pakar akuntansi & audit. Jawab selalu dalam format JSON."
          },
          { role: "user", content: prompt }
        ],
        generationConfig: {
          temperature: options.temperature || 0.1,
          response_format: { type: "json_object" }
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenRouter request timed out after 6 seconds')), 6000)
      )
    ]);

    const text = response.choices[0]?.message?.content || '';
    return options.jsonMode ? parseJSON(text) : text;
  } catch (err) {
    console.warn(`[MultiGateway] OpenRouter ${model} Gagal/Timeout: ${err.message}. Melakukan failover dinamis ke Gemini...`);
    // Failover instan ke Gemini jika OpenRouter bermasalah atau lambat!
    return callGemini(prompt, options);
  }
}

export async function callLlama(prompt, options = {}) {
  return callOpenRouter(LLAMA_MODEL, prompt, { ...options, systemPrompt: "Anda adalah Senior Auditor Perpajakan Indonesia." });
}

export async function callGPT(prompt, options = {}) {
  return callOpenRouter(GPT_MODEL, prompt, { ...options, systemPrompt: "Anda adalah Spesifik Forensic Accountant & Fraud Detection Expert." });
}

function parseJSON(text) {
  try {
    return JSON.parse(text.match(/\{.*\}/s)?.[0] || text);
  } catch (e) {
    return { raw: text, error: 'JSON_PARSE_FAILED' };
  }
}

