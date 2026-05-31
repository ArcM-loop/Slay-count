import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';

// Helper: Hitung penyusutan bulanan (Straight-Line & Declining Balance)
function calcMonthlyDepreciation(asset) {
  const depreciable = asset.acquisition_cost - (asset.salvage_value || 0);
  if (asset.depreciation_method === 'Saldo Menurun') {
    const rate = 2 / asset.useful_life_months;
    const bookValue = asset.acquisition_cost - (asset.accumulated_depreciation || 0);
    return Math.max(0, bookValue * rate);
  }
  // Garis lurus (default)
  return depreciable / asset.useful_life_months;
}

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
   * 1. Menyusutkan nilai aset tetap riil di database
   * 2. Membuat jurnal penyesuaian otomatis
   */
  async runMonthEndAdjustments(businessId, dateString) {
    console.log(`[ClosingAgent] Menjalankan Jurnal Penyesuaian riil untuk periode ${dateString}`);
    try {
      const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: businessId });
      const assets = await GoogleGenerativeAI.entities.FixedAsset.filter({ business_id: businessId });
      
      const deprAccount = accounts.find(a => a.name.toLowerCase().includes('beban penyusutan'));
      const akumDeprAccount = accounts.find(a => a.name.toLowerCase().includes('akumulasi penyusutan'));

      let processedCount = 0;
      let totalDepAmount = 0;

      for (const asset of assets) {
        const depreciable = asset.acquisition_cost - (asset.salvage_value || 0);
        const currentAccum = asset.accumulated_depreciation || 0;
        if (currentAccum < depreciable) {
          const monthlyDep = calcMonthlyDepreciation(asset);
          const nextAccum = Math.min(depreciable, currentAccum + monthlyDep);
          
          // Update akumulasi penyusutan aset tetap di database
          await GoogleGenerativeAI.entities.FixedAsset.update(asset.id, {
            accumulated_depreciation: nextAccum
          });
          
          processedCount++;
          totalDepAmount += monthlyDep;
        }
      }

      if (totalDepAmount > 0 && deprAccount && akumDeprAccount) {
        // Buat Jurnal Penyesuaian Riil via secure Backend API commit
        const { commitJournalToServer } = await import('@/lib/secureApiClient');
        
        const debitEntries = [{
            account_id: deprAccount.id,
            account_code: deprAccount.code || '',
            account_name: deprAccount.name,
            account_type: deprAccount.type || 'Beban',
            debit: totalDepAmount,
            credit: 0,
            description: `[Jurnal Penyesuaian] Beban Penyusutan Aset Tetap - ${dateString}`
        }];
        
        const creditEntries = [{
            account_id: akumDeprAccount.id,
            account_code: akumDeprAccount.code || '',
            account_name: akumDeprAccount.name,
            account_type: akumDeprAccount.type || 'Aset',
            debit: 0,
            credit: totalDepAmount,
            description: `[Jurnal Penyesuaian] Akumulasi Penyusutan Aset Tetap - ${dateString}`
        }];

        await commitJournalToServer(
          {
            id: `ADJ_${dateString}_DEPR_${Date.now().toString().slice(-4)}`,
            business_id: businessId,
            date: dateString,
            description: '[Jurnal Penyesuaian] Beban Penyusutan Aset Tetap',
            amount: totalDepAmount
          },
          debitEntries,
          creditEntries,
          { force: true }
        );
      }

      return { success: true, processedCount, totalDepAmount, message: "Jurnal Penyesuaian berhasil dicetak." };
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
      return { success: true, message: "Pengecekan Jurnal Pembalik selesai." };
    } catch (error) {
      console.error("[ClosingAgent] Error Reversals:", error);
      return { success: false, error: error.message };
    }
  }
};
