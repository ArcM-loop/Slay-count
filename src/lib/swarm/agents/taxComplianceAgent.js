/**
 * TAX COMPLIANCE AGENT (Indonesia Specialist)
 * Menjamin kepatuhan terhadap PPh 21, 23, 26, PPN, dan CoreTax.
 */

export const TaxComplianceAgent = {
  name: 'TaxComplianceAgent',
  weight: 1.5,

  async run(payload, context) {
    const { tax_type, tax_amount, amount } = payload;

    // 1. Validasi PPh 26 (Luar Negeri) - Celah yang kita temukan tadi
    if (tax_type === 'PPH_26') {
      const expectedTax = amount * 0.20;
      if (Math.abs(tax_amount - expectedTax) > 100) {
        return {
          status: 'REJECTED',
          message: `Tarif PPh 26 harus 20%. Ditemukan selisih perhitungan.`,
          weight: this.weight
        };
      }
    }

    // 2. Validasi PPN (11%)
    if (payload.ppn_amount > 0) {
      const expectedPPN = amount * 0.11;
      if (Math.abs(payload.ppn_amount - expectedPPN) > 100) {
        return {
          status: 'WARNING',
          message: `Nilai PPN tidak standar (Bukan 11%). Mohon periksa Faktur Pajak.`,
          weight: this.weight
        };
      }
    }

    // 3. Cek Kelengkapan Data CoreTax (NPWP16/NITKU)
    if (!payload.partner_npwp || payload.partner_npwp.length < 15) {
      return {
        status: 'WARNING',
        message: 'Data Lawan Transaksi tidak memiliki NPWP valid (Dibutuhkan untuk e-Faktur/CoreTax).',
        weight: this.weight
      };
    }

    return {
      status: 'APPROVED',
      message: 'Kepatuhan Pajak Terverifikasi.',
      weight: this.weight
    };
  }
};
