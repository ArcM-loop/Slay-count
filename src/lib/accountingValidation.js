/**
 * accountingValidation.js
 * Utilitas untuk validasi integritas data akuntansi dan penguncian periode.
 */
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';

/**
 * Memeriksa apakah suatu tanggal berada dalam periode yang sudah ditutup (locked).
 * @param {string} date - Format YYYY-MM-DD atau ISO string
 * @param {string} businessId
 * @returns {Promise<boolean>} - True jika periode terkunci
 */
export async function isPeriodLocked(date, businessId) {
  if (!date || !businessId) return false;
  
  const targetDate = new Date(date);
  const period = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

  // Cek ke tabel PeriodClosing
  const closings = await GoogleGenerativeAI.entities.PeriodClosing.filter({
    business_id: businessId,
    period: period
  });

  return closings.length > 0;
}

/**
 * Memvalidasi keseimbangan Trial Balance (Debit === Kredit).
 * @param {Array} journalEntries 
 * @returns {Object} { isBalanced, difference }
 */
export function validateTrialBalance(journalEntries) {
  const totals = journalEntries.reduce((acc, entry) => {
    acc.debit += (entry.debit || 0);
    acc.credit += (entry.credit || 0);
    return acc;
  }, { debit: 0, credit: 0 });

  const diff = Math.abs(totals.debit - totals.credit);
  // Gunakan threshold kecil untuk menghindari floating point error
  const isBalanced = diff < 0.01;

  return {
    isBalanced,
    difference: diff,
    totals
  };
}

/**
 * Error message untuk periode terkunci
 */
export const PERIOD_LOCKED_ERROR = "Periode akuntansi ini sudah ditutup dan dikunci. Silakan buka kunci periode di menu Siklus Akuntansi jika perlu melakukan koreksi.";
