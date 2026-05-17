/**
 * TAX EXPERT AGENT (The Tax Jurist)
 * Agen spesialis hukum perpajakan Indonesia & Koreksi Fiskal.
 * Mengetahui detail UU HPP, UU PPh, dan UU PPN.
 */

import { log } from '@/lib/logger'; // [CVE-6 Fixed by Herta]

export const TaxExpertAgent = {
  name: 'TaxExpert',
  tier: 2, // Arbitrator / Auditor
  weight: 4, // Bobot suara sangat besar untuk urusan pajak

  // Database rujukan hukum (Bisa diupdate via Regulatory Scout)
  jurisprudence: {
    'NON_DEDUCTIBLE_EXPENSE': {
      article: 'Pasal 9 ayat (1) UU PPh',
      criteria: ['Sembako', 'Biaya Pribadi', 'Pajak Penghasilan', 'Sanksi Admin', 'Harta Hibahan']
    },
    'FISCAL_CORRECTION_POSITIVE': ['Biaya Entertainment tanpa Nominatif', 'Pemberian dalam bentuk natura'],
    'FISCAL_CORRECTION_NEGATIVE': ['Penghasilan Bunga Deposito (Final)', 'Dividen non-objek pajak']
  },

  async run(payload, context) {
    log('[TaxExpert] Conducting legal fiscal audit...');
    
    const objections = [];
    const corrections = [];

    // 1. Audit Biaya Natura/Personal
    if (payload.category === 'Personal' || payload.description?.toLowerCase().includes('sembako')) {
      corrections.push({
        type: 'POSITIVE',
        reason: `Berdasarkan ${this.jurisprudence.NON_DEDUCTIBLE_EXPENSE.article}, biaya natura/kenikmatan adalah non-deductible.`,
        amount: payload.amount
      });
    }

    // 2. Audit Biaya Entertainment
    if (payload.category === 'Entertainment' && !payload.has_nominative_list) {
      corrections.push({
        type: 'POSITIVE',
        reason: 'Biaya entertainment tanpa Daftar Nominatif harus dikoreksi fiskal positif.',
        amount: payload.amount
      });
    }

    // 3. Keputusan Konsensus
    if (corrections.length > 0) {
      return {
        status: 'APPROVED_WITH_CORRECTION',
        message: 'Transaksi disetujui untuk akuntansi, namun memerlukan koreksi fiskal.',
        fiscal_impact: corrections,
        weight: this.weight
      };
    }

    return {
      status: 'APPROVED',
      message: 'Sesuai dengan kriteria pengurangan pajak (3M).',
      weight: this.weight
    };
  }
};
