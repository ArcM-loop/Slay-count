// src/lib/agents/scanAgent.js
/**
 * ScanAgent – encapsulates the full pipeline for scanning a receipt image.
 * 1. Run OCR using tesseract.js (supports Indonesian language).
 * 2. Build a prompt (EXPERT_PROMPT) with the raw text and available account names.
 * 3. Call Gemini (GoogleGenerativeAI.generate) to obtain structured JSON.
 * 4. Return the parsed result together with duplicate‑check flag.
 */
import { createWorker } from 'tesseract.js';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { EXPERT_PROMPT } from '@/components/transactions/ScanNotaModal.jsx'; // reuse existing prompt helper

export const scanAgent = {
  name: 'scanAgent',
  description: 'OCR + LLM extraction for receipt images',
  /**
   * @param {File} file – image or PDF (PDF is first converted to image elsewhere)
   * @param {string} businessId – current business identifier for duplicate check
   * @returns {Promise<Object>} parsed transaction data + receipt_url + isDuplicate
   */
  async process(file, businessId) {
    // 1️⃣ OCR
    const worker = await createWorker();
    const { data: { text: rawText } } = await worker.recognize(file);
    await worker.terminate();

    // 2️⃣ Build LLM prompt (reuse same prompt as UI)
    const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: businessId });
    const accountNames = accounts.map(a => a.name);
    const prompt = EXPERT_PROMPT(rawText, accountNames);

    // 3️⃣ Call Gemini (temperature low for deterministic output)
    const llmRes = await GoogleGenerativeAI.generate({
      prompt,
      temperature: 0.2,
      maxTokens: 1024,
      jsonMode: true,
    });
    const parsed = JSON.parse(llmRes?.choices?.[0]?.message?.content || '{}');

    // 4️⃣ Duplicate detection (same logic as UI)
    const duplicates = await GoogleGenerativeAI.entities.Transaction.filter({
      business_id: businessId,
      merchant_name: parsed.merchant_name,
      amount: parsed.total_amount,
      date: parsed.date,
    });
    const isDuplicate = duplicates.length > 0;

    return { ...parsed, receipt_url: URL.createObjectURL(file), isDuplicate };
  },
};
