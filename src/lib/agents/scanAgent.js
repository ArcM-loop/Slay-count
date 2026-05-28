// src/lib/agents/scanAgent.js
/**
 * ScanAgent – encapsulates the full pipeline for scanning a receipt image.
 * 1. Run OCR using tesseract.js (supports Indonesian language).
 * 2. Build a prompt (EXPERT_PROMPT) with the raw text and available account names.
 * 3. Call Gemini (GoogleGenerativeAI.generate) to obtain structured JSON.
 * 4. Return the parsed result together with duplicate‑check flag.
 */
// Removed Tesseract import – Gemini Vision is used directly in the processing function.

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
      // Convert file to base64
      const toBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      const base64Image = await toBase64(file);

      const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: businessId });
      const accountNames = accounts.map(a => a.name);
      const visionPrompt = `Kamu adalah Biyo, akuntan senior ahli akuntansi Indonesia (SAK EMKM & PSAK) dan perpajakan DJP.
Daftar Akun Tersedia: ${accountNames.join(', ')}
Ekstrak informasi dari gambar nota dalam format JSON:
{
  "total_amount": number,
  "date": "YYYY-MM-DD",
  "merchant_name": "string",
  "type": "Pemasukan" atau "Pengeluaran",
  "suggested_category": "nama akun dari daftar tersedia",
  "confidence": number (0-100),
  "reason": "alasan singkat santai",
  "is_efaktur": boolean,
  "nomor_faktur": "string atau null",
  "npwp_lawan": "string atau null",
  "dpp": number atau null,
  "ppn": number atau null
}`;

      const llmResult = await GoogleGenerativeAI.generate({
        prompt: visionPrompt,
        temperature: 0.1,
        jsonMode: true,
        image: base64Image,
        mimeType: file.type || 'image/jpeg'
      });

      const parsed = JSON.parse(llmResult?.choices?.[0]?.message?.content ?? '{}');

      // Duplicate detection
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
