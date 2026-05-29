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
import { fuzzyMatchAccount } from '@/lib/smartImportEngine';

export const scanAgent = {
  name: 'scanAgent',
  description: 'OCR + LLM extraction for receipt images',
  
  // Fungsi Kompresi Gambar Cerdas Herta (Client-Side Compression)
  compressImage(file) {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_DIM = 1200;
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.85);
        };
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  },

  /**
   * @param {File} rawFile – image or PDF
   * @param {string} businessId – current business identifier for duplicate check
   * @returns {Promise<Object>} parsed transaction data + receipt_url + isDuplicate
   */
  async process(rawFile, businessId) {
      // Kompres gambar agar efisien & stabil saat dikirim lewat API
      const file = await this.compressImage(rawFile);

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
Analisis GAMBAR dokumen keuangan/nota/struk/invoice/faktur ini secara langsung dan ekstrak datanya.

KETENTUAN SANGAT PENTING (ANTI-TEMPLATE-COPYING):
1. JANGAN PERNAH mengembalikan nilai placeholder seperti kata "string", "number", "YYYY-MM-DD", "nama akun dari daftar tersedia", atau "pilih salah satu..." ke dalam isi JSON.
2. Jika ada informasi yang TIDAK dapat dibaca atau TIDAK ada di gambar, isi dengan null (misalnya: "merchant_name": null, atau "npwp_lawan": null).
3. Jika gambar sama sekali tidak berkaitan dengan transaksi keuangan/nota belanja (seperti foto pemandangan, barang random, wajah orang), jawab dengan JSON: {"error": "Gambar bukan merupakan dokumen nota/transaksi yang valid."}
4. Ekstrak total_amount sebagai angka murni (number), bukan string. Jika tertulis "Rp 150.000", jadikan 150000.

Daftar Akun Tersedia: ${accountNames.join(', ')}

Ekstrak informasi dari gambar nota dalam format JSON:
{
  "total_amount": number_atau_null,
  "date": "YYYY-MM-DD_atau_null",
  "merchant_name": "nama_merchant_atau_null",
  "type": "Pemasukan" atau "Pengeluaran",
  "suggested_category": "pilih salah satu nama akun paling relevan dari daftar tersedia di atas, atau null jika ragu",
  "confidence": number (0-100),
  "reason": "alasan singkat santai",
  "is_efaktur": boolean,
  "nomor_faktur": "string_atau_null",
  "npwp_lawan": "string_atau_null",
  "dpp": number_atau_null,
  "ppn": number_atau_null
}`;

      const llmResult = await GoogleGenerativeAI.generate({
        prompt: visionPrompt,
        temperature: 0.1,
        jsonMode: true,
        image: base64Image,
        mimeType: file.type || 'image/jpeg'
      });

      let rawContent = llmResult?.choices?.[0]?.message?.content ?? '{}';
      if (rawContent.includes('```')) {
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const parsed = JSON.parse(rawContent);

      // Bersihkan jika model tidak sengaja memulangkan placeholder harfiah
      if (parsed.merchant_name === 'string' || parsed.merchant_name === 'nama_merchant_atau_null') parsed.merchant_name = null;
      if (parsed.date === 'YYYY-MM-DD' || parsed.date === 'YYYY-MM-DD_atau_null') parsed.date = null;
      if (parsed.suggested_category && parsed.suggested_category.includes('pilih salah satu')) parsed.suggested_category = null;

      // Pencocokan fuzzy Herta: Hubungkan kategori saran AI ke ID akun COA yang asli
      const matchedAccount = fuzzyMatchAccount(parsed.suggested_category, accounts);
      if (matchedAccount) {
        parsed.suggested_category = matchedAccount.name;
        parsed.type = matchedAccount.type === 'Beban' ? 'Pengeluaran' : (matchedAccount.type === 'Pendapatan' ? 'Pemasukan' : parsed.type);
      }

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
