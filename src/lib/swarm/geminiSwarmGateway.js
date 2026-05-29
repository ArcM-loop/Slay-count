/**
 * GEMINI SWARM GATEWAY — [CVE-2 Fixed by Herta]
 * ================================================
 * SEBELUM: Memanggil Gemini API langsung dari browser (API key terekspos!)
 * SESUDAH:  Memanggil backend proxy kita — API key TIDAK pernah menyentuh browser.
 *
 * Arsitektur:
 *   Browser → POST /api/ai/generate (backend kita) → Gemini API
 *
 * Frontend tidak perlu tahu tentang API key. Zero exposure.
 */

const getBackendUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.startsWith('http')) {
    if (import.meta.env.PROD && (window.location.hostname.includes('slaycount') || window.location.hostname.includes('run.app') || window.location.hostname.includes('web.app') || window.location.hostname.includes('firebaseapp'))) {
      return window.location.origin;
    }
    return envUrl;
  }
  return 'http://localhost:5000';
};
const BACKEND_URL = getBackendUrl();

// State internal untuk usage tracking (statistik saja, bukan key)
let usageStats = {
  totalCalls: 0,
  errors: 0,
  lastCallTime: null
};

/**
 * [CVE-2 Fixed] Memanggil Gemini MELALUI backend proxy yang aman.
 * API Key tidak pernah ada di browser — hanya ada di server.
 */
export async function callGemini(prompt, options = {}) {
  const {
    purpose = 'worker',
    temperature = 0.1,
    jsonMode = true,
  } = options;

  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Sertakan HttpOnly cookie untuk autentikasi
      body: JSON.stringify({ prompt, purpose, temperature, jsonMode })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      usageStats.errors++;

      // Jika sesi kadaluarsa, arahkan ke login
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Sesi berakhir. Silakan login kembali.');
      }

      throw new Error(errData.error || `AI request gagal: HTTP ${response.status}`);
    }

    const data = await response.json();

    usageStats.totalCalls++;
    usageStats.lastCallTime = new Date().toISOString();

    return data.result;

  } catch (error) {
    usageStats.errors++;
    throw error;
  }
}

/**
 * Panggilan khusus untuk Worker Agents (Hemat token, deterministik)
 */
export async function callWorkerSwarm(prompt) {
  return callGemini(prompt, {
    purpose: 'worker',
    temperature: 0.0,
    jsonMode: true
  });
}

/**
 * Panggilan khusus untuk Auditor/Expert Agents (Lebih dalam)
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
 */
export async function callCFOSwarm(prompt) {
  return callGemini(prompt, {
    purpose: 'cfo',
    temperature: 0.5,
    jsonMode: false
  });
}

/**
 * Mendapatkan statistik penggunaan lokal (tanpa informasi key)
 */
export function getSwarmUsageStats() {
  return { ...usageStats };
}

/**
 * Reset statistik penggunaan
 */
export function resetSwarmUsageStats() {
  usageStats = { totalCalls: 0, errors: 0, lastCallTime: null };
}
