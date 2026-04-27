/**
 * poMatchingEngine.js — PO Matching Logic
 * Mencocokkan Invoice/Nota masuk dengan Purchase Order yang sudah ada.
 * Menggunakan Tolerance Level: 2-5% (normal), max 10%.
 */

/**
 * Hasil analisa pencocokan PO
 * @typedef {Object} MatchResult
 * @property {'exact'|'variance'|'mismatch'|'no_po'} status
 * @property {number} varianceAmount - Selisih nominal (bisa negatif jika diskon)
 * @property {number} variancePercent - Selisih dalam persen
 * @property {string} varianceLabel - Label yang user-friendly
 * @property {string} recommendation - Saran AI untuk user
 */

const TOLERANCE = {
  NORMAL_MAX: 5,   // 5% dianggap normal (diskon, ongkir kecil)
  HARD_MAX: 10,    // 10% batas absolut, di atasnya = Mismatch
};

/**
 * Mencocokkan nota tagihan dengan PO berdasarkan toleransi.
 * @param {number} invoiceAmount - Nominal di nota/tagihan
 * @param {number} poAmount - Nominal di Purchase Order
 * @returns {MatchResult}
 */
export function matchInvoiceToPO(invoiceAmount, poAmount) {
  if (!poAmount || poAmount <= 0) {
    return {
      status: 'no_po',
      varianceAmount: 0,
      variancePercent: 0,
      varianceLabel: 'Tidak ada PO',
      recommendation: 'Tidak ada PO terkait. Proses sebagai transaksi biasa.',
    };
  }

  const diff = invoiceAmount - poAmount;
  const percent = Math.abs((diff / poAmount) * 100);

  // Exact match (selisih < 0.5%)
  if (percent < 0.5) {
    return {
      status: 'exact',
      varianceAmount: diff,
      variancePercent: 0,
      varianceLabel: 'Cocok Sempurna',
      recommendation: 'Angka nota persis sesuai PO. Aman untuk dijurnal.',
    };
  }

  // Variance match (dalam toleransi max 10%)
  if (percent <= TOLERANCE.HARD_MAX) {
    const isDiscount = diff < 0;
    const severity = percent <= TOLERANCE.NORMAL_MAX ? 'normal' : 'warning';

    let label = '';
    let reco = '';

    if (isDiscount) {
      label = `Potongan/Diskon ${percent.toFixed(1)}%`;
      reco = `Tagihan lebih murah dari PO. Kemungkinan ada potongan pembelian atau retur parsial.`;
    } else {
      label = `Selisih Lebih ${percent.toFixed(1)}%`;
      reco = percent <= TOLERANCE.NORMAL_MAX
        ? `Selisih kecil, kemungkinan biaya kirim atau pembulatan. Masih aman.`
        : `Selisih mendekati batas toleransi (10%). Periksa apakah ada biaya tambahan yang sah.`;
    }

    return {
      status: 'variance',
      varianceAmount: diff,
      variancePercent: parseFloat(percent.toFixed(1)),
      varianceLabel: label,
      recommendation: reco,
      severity,
    };
  }

  // Mismatch (di atas toleransi 10%)
  return {
    status: 'mismatch',
    varianceAmount: diff,
    variancePercent: parseFloat(percent.toFixed(1)),
    varianceLabel: `Selisih ${percent.toFixed(1)}% (Melebihi Batas!)`,
    recommendation: `Selisih terlalu besar (di atas 10%). Pembayaran diblokir. Hubungi vendor untuk klarifikasi atau minta persetujuan atasan.`,
  };
}

/**
 * Cari PO yang cocok dari daftar PO berdasarkan nomor PO atau vendor.
 * @param {string} poNumberFromInvoice - Nomor PO yang terdeteksi AI dari nota
 * @param {string} vendorName - Nama vendor dari nota
 * @param {Array} purchaseOrders - Daftar semua PO
 * @returns {Object|null} PO yang cocok
 */
export function findMatchingPO(poNumberFromInvoice, vendorName, purchaseOrders) {
  if (!purchaseOrders || purchaseOrders.length === 0) return null;

  // Prioritas 1: Cocokkan nomor PO (exact)
  if (poNumberFromInvoice) {
    const byNumber = purchaseOrders.find(
      po => po.po_number?.toLowerCase().trim() === poNumberFromInvoice.toLowerCase().trim()
        && (po.status === 'Open' || po.status === 'Partial')
    );
    if (byNumber) return byNumber;
  }

  // Prioritas 2: Cocokkan nama vendor + status masih Open
  if (vendorName) {
    const byVendor = purchaseOrders.find(
      po => po.vendor_name?.toLowerCase().includes(vendorName.toLowerCase())
        && (po.status === 'Open' || po.status === 'Partial')
    );
    if (byVendor) return byVendor;
  }

  return null;
}

/**
 * Hitung sisa PO setelah partial matching.
 * @param {Object} po - Purchase Order
 * @param {number} paidAmount - Jumlah yang dibayar sekarang
 * @returns {Object} { newStatus, remainingBalance }
 */
export function calculatePartialPO(po, paidAmount) {
  const remaining = (po.remaining_balance ?? po.total_amount) - paidAmount;

  if (remaining <= 0) {
    return { newStatus: 'Closed', remainingBalance: 0 };
  }

  return { newStatus: 'Partial', remainingBalance: remaining };
}

/**
 * Generate nomor PO otomatis.
 * @param {string} prefix - Prefix bisnis (e.g. "SC")
 * @param {number} count - Jumlah PO yang sudah ada
 * @returns {string} Nomor PO (e.g. "PO/SC/2026/001")
 */
export function generatePONumber(prefix = 'SC', count = 0) {
  const year = new Date().getFullYear();
  const seq = String(count + 1).padStart(3, '0');
  return `PO/${prefix}/${year}/${seq}`;
}

export { TOLERANCE };
