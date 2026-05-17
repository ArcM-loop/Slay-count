/**
 * CORETAX AGENT (CTAS Specialist)
 * ==========================================
 * Agen khusus untuk menyelaraskan SlayCount dengan sistem CoreTax (CTAS) DJP 2025.
 * Fokus: NPWP 16 Digit (NIK), Pre-populated data, dan Skema Integrasi API CoreTax.
 */

export const CoreTaxAgent = {
  name: 'CoreTaxAgent',
  weight: 4, // Bobot sangat tinggi karena kegagalan CoreTax = kegagalan hukum
  tier: 2,

  async run(payload, context) {
    const findings = [];
    let status = 'APPROVED';
    let message = 'Selaras dengan standar CoreTax 2025.';

    const { tx = payload } = payload; // Support both flat and nested payloads

    // 1. Validasi NPWP 16 Digit (Mandatory CoreTax 2025)
    const npwp = tx.npwp || tx.vendor_npwp;
    if (npwp) {
      const cleanNPWP = npwp.toString().replace(/[^0-9]/g, '');
      if (cleanNPWP.length !== 16) {
        status = 'REJECTED';
        findings.push('CoreTax 2025 mewajibkan NPWP 16 digit (NIK). NPWP ini tidak valid.');
      }
    } else if (tx.amount > 5000000 && !tx.is_foreign) {
      // Ambang batas transaksi tanpa NPWP di CoreTax biasanya lebih ketat
      status = 'WARNING';
      findings.push('Transaksi > Rp 5 Juta tanpa NPWP akan dikenakan tarif pajak lebih tinggi (100% lebih mahal) di sistem CoreTax.');
    }

    // 2. Skema Kategorisasi CoreTax (Mapping check)
    // CoreTax menggunakan kode objek pajak yang sangat spesifik
    if (tx.category === 'Service' && !tx.tax_object_code) {
      status = 'WARNING';
      findings.push('Missing tax_object_code: CoreTax membutuhkan kode objek pajak (contoh: 24-104-01) untuk automasi Bukti Potong.');
    }

    // 3. Validasi Faktur Terintegrasi
    if (tx.vat_included && !tx.faktur_number) {
      status = 'REJECTED';
      findings.push('CoreTax mengintegrasikan e-Faktur secara real-time. Transaksi PPN tanpa nomor Faktur akan ditolak oleh sistem DJP.');
    }

    if (findings.length > 0) {
      message = findings.join(' | ');
    }

    return {
      status,
      message,
      weight: this.weight,
      code: 'CORETAX_VALIDATION'
    };
  }
};
