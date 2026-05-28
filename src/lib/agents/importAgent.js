// src/lib/agents/importAgent.js
/**
 * ✦ Madam Herta's Smart Import Agent ✦
 * ====================================
 * A high-class programmatic financial agent designed to parse, classify,
 * and reconcile CSV/Excel transaction entries with supreme elegance.
 * 
 * "I don't have time for messy spreadsheets. Let's make this perfect."
 */
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';

export const importAgent = {
  name: 'importAgent',
  description: 'Smart parser and AI categorization advisor for Excel/CSV transaction data import',
  tier: 1, // Fast Scan level

  /**
   * Main entry point to programmatically run against a payload or transaction batch
   * @param {Object} payload - Transaction row context
   * @param {Object} context - Execution context with business accounts
   * @returns {Promise<Object>} Verification status
   */
  async run(payload, context = {}) {
    // Elegant classification & mathematical integrity check in Herta style!
    const description = payload.description || payload.keterangan || '';
    const amountStr = String(payload.amount || payload.nominal || '0');
    
    // Normalize clean numeric values
    let amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ''));
    if (isNaN(amount)) amount = 0;

    // Fast-path category suggestion using keywords first to save energy, then LLM if needed
    let suggestedCategory = 'Belum Ditentukan';
    let confidence = 0.5;

    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('gaji') || lowerDesc.includes('salary')) {
      suggestedCategory = 'Beban Gaji';
      confidence = 0.95;
    } else if (lowerDesc.includes('pln') || lowerDesc.includes('listrik') || lowerDesc.includes('token')) {
      suggestedCategory = 'Beban Listrik & Air';
      confidence = 0.95;
    } else if (lowerDesc.includes('admin') || lowerDesc.includes('biaya bulanan')) {
      suggestedCategory = 'Beban Administrasi Bank';
      confidence = 0.9;
    } else if (lowerDesc.includes('tokopedia') || lowerDesc.includes('laptop') || lowerDesc.includes('beli')) {
      suggestedCategory = 'Beban Perlengkapan Kantor';
      confidence = 0.85;
    } else if (lowerDesc.includes('pajak') || lowerDesc.includes('ppn') || lowerDesc.includes('pph')) {
      suggestedCategory = 'Beban Pajak';
      confidence = 0.95;
    }

    return {
      status: confidence >= 0.8 ? 'APPROVED' : 'WARNING',
      message: `[ImportAgent] Menganalisis "${description}" senilai ${amount.toLocaleString('id-ID')}. Kategori disarankan: ${suggestedCategory} (${Math.round(confidence * 100)}% yakin).`,
      suggestedCategory,
      confidence,
      weight: 1.2
    };
  },

  /**
   * Batch process import rows elegantly
   * @param {Array<Object>} rows - Raw rows parsed from excel/csv
   * @param {string} businessId - Business context ID
   * @returns {Promise<Array<Object>>} Enriched rows ready for ingestion
   */
  async processBatch(rows, businessId) {
    let accounts = [];
    try {
      accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: businessId });
    } catch (e) {
      console.warn('[ImportAgent] Failed fetching accounts context, proceeding with default set.', e);
    }
    const accountNames = accounts.map(a => a.name);

    return Promise.all(rows.map(async (row) => {
      const description = row.keterangan || row.Keterangan || row.description || '';
      const amountStr = String(row.nominal || row.Nominal || row.amount || '0');
      let amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ''));
      if (isNaN(amount)) amount = 0;

      // Fallback clean parsing of serial excel dates
      let finalDate = row.tanggal || row.Tanggal || row.date || new Date().toISOString().split('T')[0];
      if (!isNaN(finalDate) && Number(finalDate) > 40000) {
        // Excel epoch date conversion
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const msPerDay = 24 * 60 * 60 * 1000;
        finalDate = new Date(excelEpoch.getTime() + Number(finalDate) * msPerDay).toISOString().split('T')[0];
      }

      // Quick heuristics
      let category = 'Belum Ditentukan';
      let confidence = 0.55;
      
      const prompt = `
        Tinjau entri transaksi Excel berikut:
        Keterangan: ${description}
        Nominal: Rp ${amount.toLocaleString('id-ID')}
        
        Akun yang Tersedia di Sistem:
        ${JSON.stringify(accountNames.length ? accountNames : ['Beban Gaji', 'Beban Perlengkapan Kantor', 'Beban Listrik & Air', 'Beban Administrasi Bank', 'Beban Pajak', 'Pendapatan Usaha'])}
        
        Tentukan Akun/Kategori paling sesuai dari daftar di atas. Jika tidak ada yang cocok secara masuk akal, pilih kategori fallback yang paling prudent.
        Berikan jawaban dalam JSON format:
        { "kategori": "Nama Akun Terpilih", "confidence": 0.95, "catatan": "Alasan singkat" }
      `;

      try {
        const response = await GoogleGenerativeAI.generate({
          prompt,
          temperature: 0.1,
          jsonMode: true
        });
        const parsed = JSON.parse(response?.choices?.[0]?.message?.content || '{}');
        if (parsed.kategori) {
          category = parsed.kategori;
          confidence = parsed.confidence || 0.8;
        }
      } catch (err) {
        console.error('[ImportAgent] LLM categorization failed, using heuristic fallback', err);
        // Heuristic fallback
        const lowerDesc = description.toLowerCase();
        if (lowerDesc.includes('gaji')) category = 'Beban Gaji';
        else if (lowerDesc.includes('pln') || lowerDesc.includes('listrik')) category = 'Beban Listrik & Air';
        else if (lowerDesc.includes('admin')) category = 'Beban Administrasi Bank';
        else if (lowerDesc.includes('tokopedia') || lowerDesc.includes('laptop')) category = 'Beban Perlengkapan Kantor';
        else if (lowerDesc.includes('pajak')) category = 'Beban Pajak';
      }

      return {
        ...row,
        tanggal: finalDate,
        nominal: amount,
        kategori: category,
        ai_confidence: `${Math.round(confidence * 100)}%`,
        status: 'Processed'
      };
    }));
  }
};
