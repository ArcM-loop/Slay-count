/**
 * BANK MATCH AGENT (Smart Reconciliation Engine)
 * ================================================
 * Agen swarm standalone untuk pencocokan otomatis antara:
 *   - Mutasi rekening koran bank (bank statement rows)
 *   - Entri jurnal di buku besar SlayCount
 *
 * Algoritma pencocokan berlapis (Fuzzy Matching):
 *
 * Tier 1 — EXACT MATCH       : Jumlah sama persis + tanggal ±3 hari
 * Tier 2 — AMOUNT MATCH      : Jumlah sama, tanggal beda lebih jauh (outstanding)
 * Tier 3 — PATTERN MATCH     : Jumlah mirip (toleransi bank fee), deskripsi cocok
 * Tier 4 — SMART SUGGESTION  : Tidak ada pasangan → kategorikan otomatis berdasarkan pola
 *
 * Alasan ini BUKAN Swarm biasa:
 * → Ini adalah pure logic matching. Gemini/AI hanya dipanggil untuk
 *   kategori "Smart Suggestion" pada item yang tidak bisa dicocokkan.
 */

/**
 * Normalisasi string untuk pencocokan: lowercase, hapus karakter khusus
 */
function normalizeDesc(str = '') {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hitung kesamaan dua string (Jaccard Similarity sederhana)
 * @returns {number} 0.0 - 1.0
 */
function stringSimilarity(a, b) {
  const setA = new Set(normalizeDesc(a).split(' ').filter(w => w.length > 2));
  const setB = new Set(normalizeDesc(b).split(' ').filter(w => w.length > 2));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Selisih hari antara dua tanggal
 */
function daysDiff(dateA, dateB) {
  const msA = new Date(dateA).getTime();
  const msB = new Date(dateB).getTime();
  return Math.abs((msA - msB) / (1000 * 60 * 60 * 24));
}

/**
 * Pola kategorisasi otomatis berdasarkan kata kunci deskripsi bank
 */
const AUTO_CATEGORY_PATTERNS = [
  { pattern: /adm|admin|biaya admin|fee/i, category: 'Biaya Administrasi Bank', isExpense: true },
  { pattern: /bunga|interest|bung kredit/i, category: 'Bunga Bank', isExpense: true },
  { pattern: /pajak|pph|ppn|tax/i, category: 'Setoran Pajak', isExpense: true },
  { pattern: /transfer|trf|trx|pemindahan/i, category: 'Transfer', isExpense: null },
  { pattern: /gaji|salary|payroll|thr/i, category: 'Beban Gaji', isExpense: true },
  { pattern: /listrik|pln|air|pdam|telp|telkom|internet|wifi/i, category: 'Utilitas', isExpense: true },
  { pattern: /sewa|rent|rental/i, category: 'Beban Sewa', isExpense: true },
  { pattern: /dp|down payment|uang muka/i, category: 'Uang Muka', isExpense: true },
  { pattern: /refund|retur|kembali/i, category: 'Retur/Refund', isExpense: false },
  { pattern: /dividen|dividend/i, category: 'Dividen', isExpense: false },
];

/**
 * Main function: Cocokkan satu baris mutasi bank dengan array entri jurnal
 *
 * @param {Object} bankRow  - { id, date, desc, amount, type }
 *                            amount: positif = kredit (masuk), negatif = debit (keluar)
 * @param {Object[]} journals - Array JournalEntry dari SlayCount
 * @returns {Object} Hasil pencocokan dengan status dan confidence score
 */
export function matchBankRow(bankRow, journals) {
  const bankAmount = Math.abs(bankRow.amount);
  const bankDate = bankRow.date;
  const bankDesc = bankRow.desc || '';

  let bestMatch = null;
  let bestScore = 0;
  let matchTier = null;

  for (const j of journals) {
    // Hitung jumlah jurnal (net: debit - kredit)
    const jAmount = Math.abs((j.debit || 0) - (j.credit || 0));
    if (jAmount === 0) continue;

    const amountDiff = Math.abs(bankAmount - jAmount);
    const amountRatio = amountDiff / bankAmount;
    const days = daysDiff(bankDate, j.date);
    const descScore = stringSimilarity(bankDesc, j.description || '');

    let score = 0;
    let tier = null;

    // TIER 1: EXACT — Jumlah sama + tanggal ≤ 3 hari
    if (amountRatio < 0.001 && days <= 3) {
      score = 1.0 + descScore; // Bonus jika deskripsi juga mirip
      tier = 'EXACT';
    }
    // TIER 2: AMOUNT — Jumlah sama, tanggal ≤ 14 hari (cek kliring/outstanding)
    else if (amountRatio < 0.001 && days <= 14) {
      score = 0.85 + (descScore * 0.1);
      tier = 'OUTSTANDING';
    }
    // TIER 3: PATTERN — Jumlah mirip (beda ≤ 0.5%, mungkin fee/pajak), deskripsi mirip
    else if (amountRatio < 0.005 && descScore > 0.3) {
      score = 0.70 + (descScore * 0.2);
      tier = 'FUZZY';
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = j;
      matchTier = tier;
    }
  }

  // Jika tidak ada yang cocok — coba auto-kategorisasi
  if (!bestMatch || bestScore < 0.5) {
    const autoCategory = autoClassify(bankRow);
    return {
      bankRowId: bankRow.id,
      status: 'UNMATCHED',
      confidence: 0,
      matchTier: 'SUGGESTION',
      journalMatch: null,
      suggestion: autoCategory,
      needsManualReview: !autoCategory,
    };
  }

  return {
    bankRowId: bankRow.id,
    status: bestScore >= 0.9 ? 'MATCHED' : 'SUGGESTED',
    confidence: Math.min(parseFloat((bestScore * 100 / 2).toFixed(1)), 100), // Normalisasi ke 0-100%
    matchTier,
    journalMatch: bestMatch,
    suggestion: null,
    needsManualReview: bestScore < 0.85,
  };
}

/**
 * Mengklasifikasikan baris bank secara otomatis berdasarkan pola deskripsi
 */
function autoClassify(bankRow) {
  for (const p of AUTO_CATEGORY_PATTERNS) {
    if (p.pattern.test(bankRow.desc || '')) {
      return {
        category: p.category,
        isExpense: p.isExpense,
        confidence: 70,
        action: 'CREATE_JOURNAL' // Sarankan buat jurnal baru
      };
    }
  }
  return null;
}

/**
 * Menjalankan pencocokan untuk seluruh baris mutasi bank (batch)
 *
 * @param {Object[]} bankRows   - Semua baris mutasi rekening koran
 * @param {Object[]} journals   - Entri jurnal dari akun bank di SlayCount
 * @returns {Object} Ringkasan hasil + array detail per baris
 */
export function runBatchMatch(bankRows, journals) {
  const results = bankRows.map(row => matchBankRow(row, journals));

  const matched     = results.filter(r => r.status === 'MATCHED').length;
  const suggested   = results.filter(r => r.status === 'SUGGESTED').length;
  const unmatched   = results.filter(r => r.status === 'UNMATCHED').length;
  const matchRate   = bankRows.length > 0 ? (matched / bankRows.length) * 100 : 0;

  // Hitung saldo outstanding (belum tercocokkan di jurnal)
  const outstandingAmount = bankRows
    .filter((_, i) => results[i].status !== 'MATCHED')
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);

  return {
    results,
    summary: {
      total: bankRows.length,
      matched,
      suggested,
      unmatched,
      matchRate: parseFloat(matchRate.toFixed(1)),
      outstandingAmount,
      isFullyReconciled: unmatched === 0 && suggested === 0,
    }
  };
}

/**
 * BANK MATCH AGENT — Swarm wrapper untuk integrasi di sistem
 */
export const BankMatchAgent = {
  name: 'BankMatch',
  tier: 2,
  weight: 2.0,

  /**
   * Versi swarm — dipanggil dari hook, bukan dari journalEngine
   * @param {Object} payload - { bankRows, journals }
   */
  async run(payload, context) {
    const { bankRows = [], journals = [] } = payload;

    if (bankRows.length === 0) {
      return {
        status: 'ADVISORY',
        agent: this.name,
        message: 'Tidak ada data mutasi bank untuk dicocokkan.',
        weight: this.weight,
        reconciliation: null
      };
    }

    const reconciliation = runBatchMatch(bankRows, journals);
    const { summary } = reconciliation;

    let status = 'APPROVED';
    let message = `✅ Rekonsiliasi selesai: ${summary.matched}/${summary.total} baris cocok (${summary.matchRate}%).`;

    if (!summary.isFullyReconciled) {
      status = 'WARNING';
      message = `⚠️ Rekonsiliasi belum tuntas: ${summary.unmatched} baris belum cocok, ${summary.suggested} butuh konfirmasi manual. Outstanding: Rp ${summary.outstandingAmount.toLocaleString('id-ID')}.`;
    }

    return {
      status,
      agent: this.name,
      message,
      weight: this.weight,
      reconciliation
    };
  }
};
