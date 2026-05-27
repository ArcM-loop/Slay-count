import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { createJournalEntries } from '@/lib/journalEngine';

/**
 * Closing Agent (Zero-Touch Accounting)
 * Bertugas mencetak Jurnal Penyesuaian (Adjusting Entries) di akhir bulan
 * dan Jurnal Pembalik (Reversing Entries) di awal bulan berikutnya.
 */
export const ClosingAgent = {
  name: "Controller & Closing Agent",
  role: "Mengeksekusi siklus akhir bulan (Penyesuaian) dan awal bulan (Pembalik)",

  /**
   * Dijalankan setiap akhir bulan (tgl 28/29/30/31)
   * 1. Menyusutkan nilai aset tetap
   * 2. Mengakui beban akrual
   */
  async runMonthEndAdjustments(businessId, dateString) {
    console.log(`[ClosingAgent] Menjalankan Jurnal Penyesuaian untuk periode ${dateString}`);
    try {
      const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: businessId });
      
      // Contoh Penyesuaian 1: Depresiasi Aset Tetap
      // Dalam sistem nyata, ini akan mengambil data dari AssetAgent/Module
      const deprAccount = accounts.find(a => a.name.toLowerCase().includes('beban penyusutan'));
      const akumDeprAccount = accounts.find(a => a.name.toLowerCase().includes('akumulasi penyusutan'));

      if (deprAccount && akumDeprAccount) {
        // Mock depresiasi (misal Rp 500,000 per bulan)
        const mockDeprAmount = 500000;
        
        await GoogleGenerativeAI.entities.JournalEntry.create({
          business_id: businessId,
          transaction_id: `ADJ_${dateString}_DEPR`,
          account_id: deprAccount.id,
          account_name: deprAccount.name,
          debit: mockDeprAmount,
          credit: 0,
          date: dateString,
          description: '[Jurnal Penyesuaian] Beban Penyusutan Aset Tetap Bulan Ini'
        });

        await GoogleGenerativeAI.entities.JournalEntry.create({
          business_id: businessId,
          transaction_id: `ADJ_${dateString}_DEPR`,
          account_id: akumDeprAccount.id,
          account_name: akumDeprAccount.name,
          debit: 0,
          credit: mockDeprAmount,
          date: dateString,
          description: '[Jurnal Penyesuaian] Akumulasi Penyusutan Aset Tetap Bulan Ini'
        });
      }

      return { success: true, message: "Jurnal Penyesuaian berhasil dicetak." };
    } catch (error) {
      console.error("[ClosingAgent] Error Adjustments:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Dijalankan setiap awal bulan (tgl 1)
   * Membalik jurnal akrual bulan sebelumnya agar tidak terjadi dobel catat
   */
  async runMonthStartReversals(businessId, dateString) {
    console.log(`[ClosingAgent] Menjalankan Jurnal Pembalik untuk awal periode ${dateString}`);
    try {
      // Logika Jurnal Pembalik
      // Mencari jurnal penyesuaian (akrual beban / deferal) bulan lalu dan membaliknya.
      
      // Karena ini blueprint, kita buat struktur dasarnya.
      // 1. Cari jurnal bulan lalu dengan tag/deskripsi 'akrual' atau 'masih harus dibayar'
      // 2. Buat jurnal baru dengan posisi Debit & Kredit ditukar.
      // 3. Beri deskripsi '[Jurnal Pembalik]'
      
      return { success: true, message: "Pengecekan Jurnal Pembalik selesai." };
    } catch (error) {
      console.error("[ClosingAgent] Error Reversals:", error);
      return { success: false, error: error.message };
    }
  }
};
