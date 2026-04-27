/**
 * journalEngine.js — Mesin Jurnal Otomatis SlayCount
 * Bertanggung jawab membuat entri double-entry saat transaksi difinalisasi.
 */
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';

/**
 * Buat jurnal double-entry untuk satu transaksi yang difinalisasi.
 *
 * Aturan dasar akuntansi:
 *  - Pengeluaran → Debit akun Beban, Kredit akun Aset (Kas/Bank)
 *  - Pemasukan   → Debit akun Aset (Kas/Bank), Kredit akun Pendapatan
 *  - Transfer    → Debit akun tujuan, Kredit akun asal
 *
 * @param {Object} tx         - Objek transaksi (sudah termasuk account_id)
 * @param {Object} accounts   - Array semua akun bisnis
 * @param {string} paymentAccountId - ID akun sumber pembayaran (Kas/Bank)
 */
export async function createJournalEntries(tx, accounts, paymentAccountId) {
  const txAccount = accounts.find(a => a.id === tx.account_id);
  const paymentAccount = accounts.find(a => a.id === paymentAccountId);

  if (!txAccount || !paymentAccount) {
    console.warn('journalEngine: akun tidak ditemukan, skip jurnal');
    return;
  }

  const groupId = tx.id; // pakai transaction id sebagai group

  let entries = [];

  if (tx.type === 'Pengeluaran') {
    // Debit → Beban (akun transaksi)
    entries.push({
      business_id: tx.business_id,
      transaction_group_id: groupId,
      transaction_id: tx.id,
      account_id: txAccount.id,
      account_code: txAccount.code,
      account_name: txAccount.name,
      account_type: txAccount.type,
      debit: tx.amount,
      credit: 0,
      description: tx.description || tx.merchant_name || 'Pengeluaran',
      date: tx.date,
      entry_type: 'auto_transaction',
    });
    // Kredit → Kas/Bank (akun pembayaran)
    entries.push({
      business_id: tx.business_id,
      transaction_group_id: groupId,
      transaction_id: tx.id,
      account_id: paymentAccount.id,
      account_code: paymentAccount.code,
      account_name: paymentAccount.name,
      account_type: paymentAccount.type,
      debit: 0,
      credit: tx.amount,
      description: tx.description || tx.merchant_name || 'Pengeluaran',
      date: tx.date,
      entry_type: 'auto_transaction',
    });
  } else if (tx.type === 'Pemasukan') {
    // Debit → Kas/Bank (akun pembayaran / penerima)
    entries.push({
      business_id: tx.business_id,
      transaction_group_id: groupId,
      transaction_id: tx.id,
      account_id: paymentAccount.id,
      account_code: paymentAccount.code,
      account_name: paymentAccount.name,
      account_type: paymentAccount.type,
      debit: tx.amount,
      credit: 0,
      description: tx.description || tx.merchant_name || 'Pemasukan',
      date: tx.date,
      entry_type: 'auto_transaction',
    });
    // Kredit → Pendapatan (akun transaksi)
    entries.push({
      business_id: tx.business_id,
      transaction_group_id: groupId,
      transaction_id: tx.id,
      account_id: txAccount.id,
      account_code: txAccount.code,
      account_name: txAccount.name,
      account_type: txAccount.type,
      debit: 0,
      credit: tx.amount,
      description: tx.description || tx.merchant_name || 'Pemasukan',
      date: tx.date,
      entry_type: 'auto_transaction',
    });
  } else if (tx.type === 'Transfer') {
    // Debit → Akun Tujuan
    entries.push({
      business_id: tx.business_id,
      transaction_group_id: groupId,
      transaction_id: tx.id,
      account_id: txAccount.id,
      account_code: txAccount.code,
      account_name: txAccount.name,
      account_type: txAccount.type,
      debit: tx.amount,
      credit: 0,
      description: tx.description || 'Transfer Dana',
      date: tx.date,
      entry_type: 'auto_transaction',
    });
    // Kredit → Akun Asal
    entries.push({
      business_id: tx.business_id,
      transaction_group_id: groupId,
      transaction_id: tx.id,
      account_id: paymentAccount.id,
      account_code: paymentAccount.code,
      account_name: paymentAccount.name,
      account_type: paymentAccount.type,
      debit: 0,
      credit: tx.amount,
      description: tx.description || 'Transfer Dana',
      date: tx.date,
      entry_type: 'auto_transaction',
    });
  }

  if (entries.length > 0) {
    await GoogleGenerativeAI.entities.JournalEntry.bulkCreate(entries);
  }
}

/**
 * Hitung saldo tiap akun dari journal_entries.
 * Saldo = SUM(debit) - SUM(credit) per account_id.
 * Untuk akun Aset & Beban: saldo normal = debit > credit (positif = normal)
 * Untuk akun Kewajiban, Ekuitas, Pendapatan: saldo normal = credit > debit
 */
export function computeAccountBalances(journalEntries) {
  const balanceMap = {};
  journalEntries.forEach(entry => {
    const key = entry.account_id;
    if (!balanceMap[key]) {
      balanceMap[key] = {
        account_id: key,
        account_name: entry.account_name,
        account_code: entry.account_code,
        account_type: entry.account_type,
        total_debit: 0,
        total_credit: 0,
      };
    }
    balanceMap[key].total_debit += entry.debit || 0;
    balanceMap[key].total_credit += entry.credit || 0;
  });

  return Object.values(balanceMap).map(b => ({
    ...b,
    balance: b.total_debit - b.total_credit,
  }));
}

/**
 * Hapus jurnal entri yang terkait dengan suatu transaksi.
 * @param {string} transactionId 
 */
export async function deleteJournalEntries(transactionId) {
  const { data: entries = [] } = await GoogleGenerativeAI.entities.JournalEntry.filter({
    transaction_id: transactionId
  });
  
  if (entries.length > 0) {
    for (const entry of entries) {
      await GoogleGenerativeAI.entities.JournalEntry.delete(entry.id);
    }
  }
}

