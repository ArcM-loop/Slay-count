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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_PRIMARY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash';

// 2. Llama & GPT (OpenRouter) Configuration
const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});
const LLAMA_MODEL = process.env.LLAMA_MODEL || 'meta-llama/llama-3.3-70b-instruct';
const GPT_MODEL = process.env.GPT_MODEL || 'openai/gpt-oss-120b:free';

/**
 * Call Gemini (Primary Worker - Round Robin)
 */
export async function callGemini(prompt, options = {}) {
  // Gunakan load balancing antar key jika ada (seperti di gateway sebelumnya)
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
  
  const apiKey = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
  
  try {
    const genAI_instance = new GoogleGenerativeAI(apiKey);
    const model = genAI_instance.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    return options.jsonMode ? parseJSON(text) : text;
  } catch (err) {
    console.error('[MultiGateway] Gemini Error:', err.message);
    throw err;
  }
}

/**
 * Generic OpenRouter Call (Llama, GPT, etc.)
 */
async function callOpenRouter(model, prompt, options = {}) {
  try {
    const response = await openrouter.chat.send({
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
    });

    const text = response.choices[0]?.message?.content || '';
    return options.jsonMode ? parseJSON(text) : text;
  } catch (err) {
    console.error(`[MultiGateway] OpenRouter Error (${model}):`, err.message);
    throw err;
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
