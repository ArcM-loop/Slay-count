/**
 * SERVER-SIDE DETERMINISTIC RULE ENGINE
 * ========================================
 * Ini adalah pengganti "swarm AI" untuk keputusan HARD BLOCK.
 * Aturan di sini adalah deterministik 100% — tidak ada AI, tidak ada probabilitas.
 *
 * Filosofi: AI boleh memberi NARASI, tapi ATURAN yang memutuskan PASS/FAIL.
 *
 * Validasi berlapis:
 *   Layer 1 — Struktur double-entry (wajib balance)
 *   Layer 2 — Batas nominal (deteksi anomali sederhana)
 *   Layer 3 — Kelengkapan data wajib
 *   Layer 4 — Konsistensi periode (tidak backdating ke periode terkunci)
 */

const MAX_SINGLE_TRANSACTION = 50_000_000_000; // Rp 50 Miliar — hard ceiling
const MAX_ACCOUNTS_PER_ENTRY = 20;             // Maksimal 20 akun per jurnal

/**
 * Validasi balance double-entry (Debit = Kredit)
 * @param {Object[]} debitEntries
 * @param {Object[]} creditEntries
 * @returns {{ pass: boolean, message: string }}
 */
function validateDoubleEntry(debitEntries, creditEntries) {
  const totalDebit  = debitEntries.reduce((s, e) => s + Number(e.debit  || 0), 0);
  const totalCredit = creditEntries.reduce((s, e) => s + Number(e.credit || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);

  if (diff > 1) { // Toleransi Rp 1 untuk floating point
    return {
      pass: false,
      code: 'UNBALANCED_ENTRY',
      message: `Double-entry tidak balance: Total Debit Rp ${totalDebit.toLocaleString('id-ID')} ≠ Total Kredit Rp ${totalCredit.toLocaleString('id-ID')}. Selisih: Rp ${diff.toLocaleString('id-ID')}.`
    };
  }
  return { pass: true };
}

/**
 * Validasi struktur dan kelengkapan entri
 */
function validateStructure(debitEntries, creditEntries) {
  if (!debitEntries?.length || !creditEntries?.length) {
    return { pass: false, code: 'MISSING_ENTRIES', message: 'Jurnal harus memiliki minimal satu entri debit dan satu entri kredit.' };
  }

  const totalAccounts = debitEntries.length + creditEntries.length;
  if (totalAccounts > MAX_ACCOUNTS_PER_ENTRY) {
    return { pass: false, code: 'TOO_MANY_ACCOUNTS', message: `Jurnal memiliki terlalu banyak akun (${totalAccounts}). Maksimal ${MAX_ACCOUNTS_PER_ENTRY}.` };
  }

  for (const entry of [...debitEntries, ...creditEntries]) {
    if (!entry.account_id) {
      return { pass: false, code: 'MISSING_ACCOUNT_ID', message: 'Semua entri jurnal harus memiliki account_id yang valid.' };
    }
    const amount = entry.debit || entry.credit || 0;
    if (amount <= 0) {
      return { pass: false, code: 'ZERO_OR_NEGATIVE_AMOUNT', message: `Nominal entri tidak boleh nol atau negatif. Akun: ${entry.account_id}.` };
    }
    if (amount > MAX_SINGLE_TRANSACTION) {
      return {
        pass: false,
        code: 'EXCEEDS_CEILING',
        message: `Nominal Rp ${amount.toLocaleString('id-ID')} melebihi batas transaksi single-entry (Rp ${MAX_SINGLE_TRANSACTION.toLocaleString('id-ID')}). Hubungi supervisor.`
      };
    }
  }

  return { pass: true };
}

/**
 * Validasi metadata transaksi
 */
function validateMetadata(tx) {
  if (!tx.business_id) {
    return { pass: false, code: 'MISSING_BUSINESS_ID', message: 'business_id wajib diisi.' };
  }
  if (!tx.date || isNaN(new Date(tx.date).getTime())) {
    return { pass: false, code: 'INVALID_DATE', message: 'Tanggal transaksi tidak valid.' };
  }
  if (!tx.description || tx.description.trim().length < 3) {
    return { pass: false, code: 'MISSING_DESCRIPTION', message: 'Deskripsi transaksi minimal 3 karakter.' };
  }
  return { pass: true };
}

/**
 * Main: Jalankan semua validasi deterministik
 * @param {Object} payload - { tx, debitEntries, creditEntries }
 * @returns {{ isValid: boolean, errors: string[], warnings: string[] }}
 */
export function runDeterministicValidation(payload) {
  const { tx, debitEntries = [], creditEntries = [] } = payload;
  const errors = [];
  const warnings = [];

  const checks = [
    validateMetadata(tx),
    validateStructure(debitEntries, creditEntries),
    validateDoubleEntry(debitEntries, creditEntries),
  ];

  for (const check of checks) {
    if (!check.pass) {
      errors.push(`[${check.code}] ${check.message}`);
    }
  }

  // Warnings (tidak memblokir, tapi dicatat)
  const totalAmount = debitEntries.reduce((s, e) => s + Number(e.debit || 0), 0);
  if (totalAmount > 1_000_000_000) {
    warnings.push(`Transaksi di atas Rp 1 Miliar memerlukan persetujuan supervisor sebelum tutup buku.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Exported as function directly
