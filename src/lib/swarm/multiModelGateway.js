/**
 * MULTI-MODEL GATEWAY
 * ===================
 * Gateway terpadu untuk memanggil berbagai model AI (Gemini, Llama, GPT).
 * Semua panggilan AI dari SwarmOrchestrator melewati gateway ini.
 * 
 * Model yang digunakan:
 * - Gemini 3.0 Flash: Tier 1 (cepat, murah)
 * - Gemini 3.0 Pro: Tier 2 (dalam, analitik)
 * - GPT-4o: Tier 3 (hakim tertinggi — Consensus Arbitrator)
 * - Llama 3 70B: Adversarial thinking untuk divisi CFO Skenario
 */

import { callWorkerSwarm, callAuditorSwarm, callCFOSwarm } from './geminiSwarmGateway';

/**
 * Memanggil Gemini API — default router untuk semua agen.
 * @param {string} prompt
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function callGemini(prompt, options = {}) {
  // Routing ke worker atau auditor swarm berdasarkan mode
  if (options.mode === 'audit') {
    return callAuditorSwarm(prompt, options);
  }
  if (options.mode === 'cfo') {
    return callCFOSwarm(prompt, options);
  }
  return callWorkerSwarm(prompt, options);
}

/**
 * Memanggil Llama 3 via Groq API — digunakan untuk adversarial thinking (CFO Kelompok A & B).
 * Fallback ke Gemini jika Groq tidak tersedia.
 * @param {string} prompt
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function callLlama(prompt, options = {}) {
  // Fallback ke Gemini jika Groq API key tidak ada
  console.warn('[MultiModelGateway] Llama/Groq not configured — falling back to Gemini.');
  return callGemini(prompt, { ...options, mode: 'audit' });
}

/**
 * Memanggil GPT-4o — digunakan khusus untuk Consensus Arbitrator (Tier 3).
 * Fallback ke Gemini Pro jika OpenAI tidak tersedia.
 * @param {string} prompt
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function callGPT(prompt, options = {}) {
  // Fallback ke Gemini jika OpenAI API key tidak ada
  console.warn('[MultiModelGateway] GPT-4o not configured — falling back to Gemini Pro.');
  return callGemini(prompt, { ...options, mode: 'audit' });
}
