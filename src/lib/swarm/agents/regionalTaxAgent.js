/**
 * REGIONAL TAX AGENT (Pakar Pajak Daerah)
 * Menangani PB1 (Pajak Restoran), Pajak Hotel, Reklame, dan Parkir.
 */

const log = (...args) => console.log('[RegionalTax]', ...args);
export const RegionalTaxAgent = {
  name: 'RegionalTax',
  tier: 1, // Beroperasi di level Worker
  weight: 1.2,

  // Mapping kategori yang biasanya kena Pajak Daerah
  regionalSectors: {
    'Restoran': { taxName: 'PB1', rate: 0.10 },
    'Cafe': { taxName: 'PB1', rate: 0.10 },
    'Hotel': { taxName: 'Pajak Hotel', rate: 0.10 },
    'Parkir': { taxName: 'Pajak Parkir', rate: 0.10 },
    'Reklame': { taxName: 'Pajak Reklame', rate: 0.25 }
  },

  async run(payload, context) {
    log('[RegionalTax] Scanning for regional tax patterns...');
    
    const category = payload.category;
    const sector = this.regionalSectors[category];

    if (sector) {
      // Jika user memasukkan PPN 11% untuk kategori yang seharusnya PB1 10%
      if (payload.ppn_rate === 0.11) {
        return {
          status: 'WARNING',
          message: `Kategori '${category}' biasanya dikenakan ${sector.taxName} (Tarif ${sector.rate * 100}%), bukan PPN 11%. Mohon verifikasi apakah ini benar PPN atau Pajak Daerah.`,
          weight: this.weight
        };
      }

      // Validasi tarif spesifik daerah (Misal Reklame 25%)
      if (payload.tax_rate && payload.tax_rate !== sector.rate) {
        return {
          status: 'REJECTED',
          message: `Tarif ${sector.taxName} standar adalah ${sector.rate * 100}%. Ditemukan tarif berbeda (${payload.tax_rate * 100}%).`,
          weight: this.weight
        };
      }
    }

    return {
      status: 'APPROVED',
      message: 'Tidak ada konflik Pajak Daerah terdeteksi.',
      weight: this.weight
    };
  }
};
