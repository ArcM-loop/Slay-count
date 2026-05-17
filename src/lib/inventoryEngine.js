/**
 * SLAYCOUNT FIFO INVENTORY ENGINE (World-Class Accuracy)
 * Menangani perhitungan Harga Pokok Penjualan (COGS) berbasis First-In-First-Out.
 */

export class InventoryEngine {
  /**
   * Menghitung HPP untuk barang yang keluar (penjualan)
   * @param {Array} stockLayers - Daftar stok masuk (Batch) [{qty, cost, date}]
   * @param {Number} qtyToSell - Jumlah barang yang dijual
   */
  static calculateFIFO(stockLayers, qtyToSell) {
    let remainingToSell = qtyToSell;
    let totalCOGS = 0;
    let usedLayers = [];
    let updatedLayers = JSON.parse(JSON.stringify(stockLayers)); // Deep copy

    for (let layer of updatedLayers) {
      if (remainingToSell <= 0) break;

      const availableQty = layer.qty - (layer.usedQty || 0);
      if (availableQty <= 0) continue;

      const takeQty = Math.min(availableQty, remainingToSell);
      const layerCOGS = takeQty * layer.cost;

      totalCOGS += layerCOGS;
      layer.usedQty = (layer.usedQty || 0) + takeQty;
      remainingToSell -= takeQty;

      usedLayers.push({
        layerDate: layer.date,
        qtyTaken: takeQty,
        unitCost: layer.cost,
        cogs: layerCOGS
      });
    }

    if (remainingToSell > 0) {
      throw new Error(`Stok tidak mencukupi! Kurang ${remainingToSell} unit.`);
    }

    return {
      totalCOGS,
      usedLayers,
      updatedLayers
    };
  }
}

/**
 * THE INVENTORY AGENT (The Swarm Fish)
 */
export const InventoryAgent = {
  name: 'InventoryAgent',
  weight: 1.5,

  async run(payload, context) {
    const { items = [], type } = payload;
    const { inventoryData = [] } = context;

    if (type === 'Pengeluaran_Stok') {
      for (const item of items) {
        const stock = inventoryData.find(s => s.item_id === item.item_id);
        if (!stock || stock.totalQty < item.qty) {
          return {
            status: 'REJECTED',
            message: `Stok barang '${item.name}' tidak cukup untuk transaksi ini.`,
            weight: this.weight
          };
        }
      }
    }

    return {
      status: 'APPROVED',
      message: 'Ketersediaan stok terverifikasi.',
      weight: this.weight
    };
  }
};
