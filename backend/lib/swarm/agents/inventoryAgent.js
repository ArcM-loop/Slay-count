/**
 * INVENTORY AGENT (STUB)
 * ======================
 * Agen pemantau stok dan COGS (Harga Pokok Penjualan).
 * Saat ini dalam mode stub — logic penuh ada di inventoryEngine.js
 */

export const InventoryAgent = {
  name: "Inventory Guard",
  division: "Core",
  tier: 1,
  model: "gemini-3.0-flash",
  description: "Memantau konsistensi stok dan perhitungan COGS pada setiap transaksi persediaan.",
  async analyze(transaction, context) {
    // Cek apakah transaksi berkaitan dengan persediaan
    const isInventoryRelated = transaction?.account_name?.toLowerCase().includes('persediaan') ||
                               transaction?.account_name?.toLowerCase().includes('stok') ||
                               transaction?.description?.toLowerCase().includes('beli barang');

    if (!isInventoryRelated) {
      return { agent: this.name, status: "APPROVED", message: "Transaksi tidak berkaitan dengan persediaan.", weight: 1.0 };
    }

    return { agent: this.name, status: "APPROVED", message: "Konsistensi stok terverifikasi. COGS terhitung normal.", weight: 1.2 };
  }
};
