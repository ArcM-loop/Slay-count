/**
 * AGENT PPh 25 (Monthly Installments)
 * Focus: Angsuran PPh Badan berjalan, Monitoring pembayaran rutin
 */
export const PPh25InstallmentAgent = {
  name: 'PPh25Installment',
  tier: 1,
  weight: 0.6,
  async run(payload, context) {
    const isTaxPayment = payload.category === 'TAX_PAYMENT' && (payload.description || '').toLowerCase().includes('pph 25');
    if (!isTaxPayment) return { status: 'ADVISORY', message: 'Bukan pembayaran angsuran PPh 25.' };

    return {
      status: 'APPROVED',
      message: 'Mencatat angsuran PPh 25 sebagai pengurang PPh 29 di akhir tahun.',
      tax_type: 'PPh 25',
      is_tax_credit: true
    };
  }
};

/**
 * AGENT PPh 26 (International Specialist)
 * Focus: Pembayaran ke Subjek Pajak Luar Negeri, DTA/P3B, COD/DGT Form
 */
export const PPh26InternationalAgent = {
  name: 'PPh26International',
  tier: 2, // Tier 2 karena butuh validasi treaty yang kompleks
  weight: 1.2,
  async run(payload, context) {
    const isInternational = payload.counterparty?.is_foreign === true || (payload.tags || []).includes('FOREIGN_VENDOR');
    if (!isInternational) return { status: 'ADVISORY', message: 'Bukan transaksi luar negeri.' };

    const hasDgtForm = payload.documents?.dgt_form_valid === true;
    
    return {
      status: hasDgtForm ? 'APPROVED' : 'WARNING',
      message: hasDgtForm 
        ? 'Form DGT valid, menerapkan tarif sesuai P3B/Treaty.' 
        : 'Form DGT tidak ditemukan/tidak valid, wajib potong tarif standar 20%.',
      tax_type: 'PPh 26',
      action: hasDgtForm ? 'APPLY_TREATY_RATE' : 'APPLY_STANDARD_RATE'
    };
  }
};

/**
 * AGENT PPh 4(2) (Final Tax Specialist)
 * Focus: Sewa Tanah/Bangunan, Jasa Konstruksi, Dividen OP, Hadiah Undian
 */
export const PPh42FinalAgent = {
  name: 'PPh42Final',
  tier: 1,
  weight: 1.0,
  async run(payload, context) {
    const finalKeywords = ['sewa tanah', 'sewa bangunan', 'konstruksi', 'hadiah', 'bunga deposito'];
    const desc = (payload.description || '').toLowerCase();
    const isPph42 = finalKeywords.some(k => desc.includes(k)) || payload.category === 'EXPENSE_RENT_PROPERTY';

    if (!isPph42) return { status: 'ADVISORY', message: 'Bukan objek PPh 4 ayat 2.' };

    return {
      status: 'APPROVED',
      message: 'Objek Pajak Final terdeteksi. Validasi tarif (10% Sewa, 1.75-6% Konstruksi).',
      tax_type: 'PPh 4(2)',
      is_final: true
    };
  }
};

/**
 * AGENT PPh 29 (Corporate Tax Credit Auditor)
 * Focus: Kredit pajak (PPh 22, 23, 24, 25) sebagai pengurang PPh Badan akhir tahun
 */
export const PPh29CorporateCreditAgent = {
  name: 'PPh29CorporateCredit',
  tier: 2,
  weight: 0.9,
  async run(payload, context) {
    const isCredit = payload.is_tax_credit === true || payload.category === 'TAX_CREDIT';
    if (!isCredit) return { status: 'ADVISORY', message: 'Bukan komponen kredit pajak.' };

    if (!payload.documents?.tax_withholding_slip) {
      return { status: 'WARNING', message: 'Kredit pajak diklaim tanpa Bukti Potong fisik/digital.' };
    }

    return {
      status: 'APPROVED',
      message: 'Kredit pajak diverifikasi, siap dikompensasikan ke SPT Tahunan Badan.',
      tax_type: 'PPh 29 Accumulator'
    };
  }
};
