/**
 * SLAYCOUNT INVENTORY ENGINE (Moving Average)
 * Menghitung HPP (Harga Pokok Penjualan) secara otomatis sesuai SAK EMKM.
 * Memastikan profit yang tampil adalah profit bersih yang akurat.
 */

/**
 * Menghitung Harga Rata-Rata Baru (Moving Average)
 * @param {Object} currentStock - { quantity, totalValue }
 * @param {Object} newPurchase - { quantity, pricePerUnit }
 * @returns {Object} - Nilai stok dan harga rata-rata baru
 */
export const calculateNewAverage = (currentStock, newPurchase) => {
  const totalQty = currentStock.quantity + newPurchase.quantity;
  const totalValue = currentStock.totalValue + (newPurchase.quantity * newPurchase.pricePerUnit);
  
  return {
    quantity: totalQty,
    totalValue: totalValue,
    averagePrice: totalValue / totalQty
  };
};

/**
 * Menghitung HPP saat penjualan terjadi
 * @param {number} qtySold - Jumlah barang terjual
 * @param {number} averagePrice - Harga rata-rata saat itu
 * @returns {Object} - { hppValue, remainingStockValue }
 */
export const calculateCOGS = (qtySold, averagePrice) => {
  return {
    hppValue: qtySold * averagePrice,
    description: `HPP dihitung dengan metode Moving Average (Tarif: ${averagePrice})`
  };
};

/**
 * Audit Trail untuk Persediaan
 * Mendeteksi jika ada stok minus (indikasi data tidak valid)
 */
export const validateStockLevel = (quantity) => {
  return {
    isValid: quantity >= 0,
    message: quantity < 0 ? '⚠️ Peringatan: Stok minus! Periksa kembali input pembelian.' : '✅ Stok aman.'
  };
};
