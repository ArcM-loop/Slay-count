/**
 * SLAYCOUNT MEMORY ENGINE
 * =======================
 * Memberikan "Long-term Memory" pada agen tanpa membebani performa.
 * Menghasilkan profil ringkasan untuk entitas (Vendor/Customer/Account).
 */

import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { log, error } from '@/lib/logger'; // [CVE-6 Fixed by Herta]

export const MemoryEngine = {
  /**
   * Menarik ringkasan sejarah untuk entitas tertentu
   * @param {string} entityType - 'merchant_name' atau 'account_id'
   * @param {string} entityValue - Nama vendor atau ID akun
   * @param {string} businessId
   */
  async getEntityHistory(entityType, entityValue, businessId) {
    log(`[MemoryEngine] Fetching history for ${entityType}: ${entityValue}`);

    try {
      // Ambil 10 transaksi terakhir untuk entitas ini
      const history = await GoogleGenerativeAI.entities.Transaction.filter({
        business_id: businessId,
        [entityType]: entityValue,
        status: 'Final'
      }, '-date', 10);

      if (history.length === 0) return "No historical data for this entity.";

      // Hitung metrik sederhana
      const totalAmount = history.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      const avgAmount = totalAmount / history.length;
      const lastDates = history.map(tx => tx.date).slice(0, 3);
      
      // Deteksi anomali waktu (untuk Lapping)
      const dates = history.map(tx => new Date(tx.date).getTime());
      const gaps = [];
      for (let i = 0; i < dates.length - 1; i++) {
        gaps.push((dates[i] - dates[i+1]) / (1000 * 60 * 60 * 24)); // dalam hari
      }
      const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;

      return {
        summary: `Entity has ${history.length} past transactions. Avg: Rp ${avgAmount.toLocaleString()}. Avg gap: ${avgGap.toFixed(1)} days.`,
        last_transactions: history.map(tx => ({
          date: tx.date,
          amount: tx.amount,
          type: tx.type
        })),
        pattern: {
          avgGap,
          isConsistencyWarning: avgGap > 45 // Peringatan jika biasanya bayar cepat tapi sekarang melambat
        }
      };
    } catch (error) {
      error('[MemoryEngine] Error fetching history:', error);
      return "History unavailable.";
    }
  }
};
