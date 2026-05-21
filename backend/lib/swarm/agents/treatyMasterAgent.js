/**
 * TREATY MASTER AGENT (International Tax Specialist)
 * Menangani PPh 26, P3B (Tax Treaty), dan Form DGT.
 */

const log = (...args) => console.log('[TreatyMaster]', ...args);

export const TreatyMasterAgent = {
  name: 'TreatyMaster',
  tier: 2, // Arbitrator / Specialist
  weight: 2.0,

  // Contoh data treaty sederhana (Bisa diperluas)
  treatyRates: {
    'Singapore': { dividend: 0.10, interest: 0.10, royalty: 0.15, service: 0.10 },
    'USA': { dividend: 0.15, interest: 0.10, royalty: 0.10, service: 0.15 },
    'Japan': { dividend: 0.10, interest: 0.10, royalty: 0.10, service: 0.10 }
  },

  async run(payload, context) {
    log('[TreatyMaster] Analyzing international tax treaty benefits...');
    
    // Hanya bekerja jika jenis pajaknya PPh 26
    if (payload.tax_type === 'PPH_26') {
      const country = payload.partner_country || 'Unknown';
      const hasDGT = payload.has_dgt_form || false;

      if (!hasDGT) {
        return {
          status: 'WARNING',
          message: `Transaksi dengan ${country} tanpa Form DGT. Tarif PPh 26 tetap 20%. Potensi penghematan pajak (Tax Saving) hilang jika tidak ada SKD/DGT.`,
          weight: this.weight
        };
      }

      const treaty = this.treatyRates[country];
      if (treaty) {
        const expectedRate = treaty.service; // Asumsi jasa
        if (payload.applied_rate > expectedRate) {
          return {
            status: 'ADVISORY',
            message: `Berdasarkan Tax Treaty Indonesia-${country}, Anda bisa menggunakan tarif ${expectedRate * 100}% (saat ini ${payload.applied_rate * 100}%).`,
            weight: this.weight
          };
        }
      }
    }

    return {
      status: 'APPROVED',
      message: 'Analisis Treaty Internasional selesai.',
      weight: this.weight
    };
  }
};
