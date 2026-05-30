/**
 * GEMINI SWARM GATEWAY (Dual-API Load Balancer)
 * 
 * Mengatur penggunaan API Gemini secara cerdas:
 * - Round-Robin: Bergantian antara API Key Primary & Secondary.
 * - Auto-Failover: Jika satu API gagal (rate limit), otomatis pakai yang lain.
 * - Usage Tracking: Melacak penggunaan API untuk monitoring biaya.
 * 
 * Model: gemini-3-flash (via .env: VITE_GEMINI_MODEL)
 */

const API_KEYS = [
  process.env.GEMINI_API_KEY_PRIMARY,
  process.env.GEMINI_API_KEY_SECONDARY,
  process.env.GEMINI_API_KEY_TERTIARY,
  process.env.GEMINI_API_KEY_QUATERNARY,
  process.env.GEMINI_API_KEY_FIFTH,
  process.env.GEMINI_API_KEY_SIXTH,
  process.env.GEMINI_API_KEY_SEVENTH,
  process.env.GEMINI_API_KEY_EIGHTH
].filter(Boolean); // Hanya masukkan key yang ada

const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// State internal gateway
let currentKeyIndex = 0;
let usageStats = {
  totalCalls: 0,
  keyUsage: {},        // { 'key_prefix': count }
  errors: 0,
  lastCallTime: null
};

/**
 * Mendapatkan API key berikutnya (Round-Robin)
 */
function getNextKey() {
  if (API_KEYS.length === 0) {
    throw new Error('[SwarmGateway] Tidak ada API Key yang dikonfigurasi. Periksa file .env Anda.');
  }
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

/**
 * Memanggil Gemini API dengan auto-failover dan retry
 * 
 * @param {string} prompt - Prompt yang akan dikirim ke Gemini
 * @param {Object} options - Opsi tambahan
 * @param {string} options.purpose - Tujuan panggilan ('worker' | 'auditor' | 'cfo')
 * @param {number} options.temperature - Kreativitas respons (0.0 = deterministik, 1.0 = kreatif)
 * @param {boolean} options.jsonMode - Jika true, minta respons dalam format JSON
 * @returns {Promise<Object>} Respons dari Gemini
 */
export async function callGemini(prompt, options = {}) {
  const {
    purpose = 'worker',
    temperature = 0.1,  // Default: Sangat deterministik untuk akuntansi
    jsonMode = true,
    maxRetries = 2
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const apiKey = getNextKey();
    const keyPrefix = apiKey.substring(0, 8) + '...';

    try {
      const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature,
          maxOutputTokens: purpose === 'worker' ? 512 : 2048,
          ...(jsonMode && { responseMimeType: 'application/json' })
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Jika rate limited (429), coba key berikutnya
        if (response.status === 429) {
          console.warn(`[SwarmGateway] Rate limited on ${keyPrefix}. Switching to next key...`);
          usageStats.errors++;
          lastError = new Error(`Rate limited: ${errorData.error?.message || 'Unknown'}`);
          continue;
        }
        
        throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Update usage stats
      usageStats.totalCalls++;
      usageStats.keyUsage[keyPrefix] = (usageStats.keyUsage[keyPrefix] || 0) + 1;
      usageStats.lastCallTime = new Date().toISOString();

      console.log(`[SwarmGateway] Success via ${keyPrefix} | Purpose: ${purpose} | Total calls: ${usageStats.totalCalls}`);

      // Parse JSON jika diminta
      if (jsonMode) {
        try {
          return JSON.parse(text);
        } catch {
          return { raw: text, parseError: true };
        }
      }

      return text;
    } catch (error) {
      lastError = error;
      console.error(`[SwarmGateway] Attempt ${attempt + 1} failed:`, error.message);
    }
  }

  throw lastError || new Error('[SwarmGateway] Semua API key gagal setelah retry.');
}

/**
 * Panggilan khusus untuk Worker Agents (Hemat token)
 * Digunakan untuk validasi cepat dan deterministic
 */
export async function callWorkerSwarm(prompt) {
  return callGemini(prompt, {
    purpose: 'worker',
    temperature: 0.0, // 100% deterministik
    jsonMode: true
  });
}

/**
 * Panggilan khusus untuk Auditor/Expert Agents (Lebih dalam)
 * Digunakan untuk interpretasi hukum dan strategi
 */
export async function callAuditorSwarm(prompt) {
  return callGemini(prompt, {
    purpose: 'auditor',
    temperature: 0.2,
    jsonMode: true
  });
}

/**
 * Panggilan khusus untuk CFO Intelligence (Kreatif)
 * Digunakan untuk saran strategis dan simulasi
 */
export async function callCFOSwarm(prompt) {
  return callGemini(prompt, {
    purpose: 'cfo',
    temperature: 0.5, // Sedikit kreatif untuk saran bisnis
    jsonMode: false     // Format bebas untuk narasi
  });
}

/**
 * Mendapatkan statistik penggunaan API
 */
export function getSwarmUsageStats() {
  return { ...usageStats };
}

/**
 * Reset statistik penggunaan
 */
export function resetSwarmUsageStats() {
  usageStats = { totalCalls: 0, keyUsage: {}, errors: 0, lastCallTime: null };
}
