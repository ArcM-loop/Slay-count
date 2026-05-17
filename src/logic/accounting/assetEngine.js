/**
 * SLAYCOUNT ASSET & DEPRECIATION ENGINE
 * Berdasarkan UU PPh Pasal 11 dan SAK EMKM.
 * Menangani penyusutan otomatis berdasarkan kelompok harta tetap.
 */

export const ASSET_GROUPS = {
  KELOMPOK_1: { years: 4, rate: 0.25, desc: 'Mebel, Peralatan, Komputer, Sepeda Motor' },
  KELOMPOK_2: { years: 8, rate: 0.125, desc: 'Mobil, Mesin, Peralatan Kantor' },
  KELOMPOK_3: { years: 16, rate: 0.0625, desc: 'Mesin Berat, Alat Komunikasi' },
  KELOMPOK_4: { years: 20, rate: 0.05, desc: 'Alat Transportasi Berat' },
  BANGUNAN_PERMANEN: { years: 20, rate: 0.05, desc: 'Gedung/Ruko Permanen' },
  BANGUNAN_NON_PERMANEN: { years: 10, rate: 0.1, desc: 'Gudang Kayu, Bangunan Kayu' }
};

/**
 * Menghitung biaya penyusutan bulanan (Garis Lurus)
 * @param {number} cost - Harga perolehan aset
 * @param {string} groupKey - Kunci kelompok aset
 * @returns {number} - Biaya susut per bulan
 */
export const calculateMonthlyDepreciation = (cost, groupKey) => {
  const group = ASSET_GROUPS[groupKey];
  if (!group) return 0;
  
  const annualDepreciation = cost * group.rate;
  return Math.floor(annualDepreciation / 12);
};

/**
 * Audit Trail / Fiscal Reconciliation
 * Membandingkan penyusutan komersial vs fiskal
 */
export const getFiscalCorrection = (commercialDepr, cost, groupKey) => {
  const fiscalDepr = calculateMonthlyDepreciation(cost, groupKey);
  const correction = commercialDepr - fiscalDepr;
  
  return {
    fiscalDepr,
    correction,
    type: correction > 0 ? 'KOREKSI_POSITIF' : 'KOREKSI_NEGATIF'
  };
};

/**
 * Menghitung Nilai Buku (Book Value)
 * @param {number} cost - Harga perolehan
 * @param {string} purchaseDate - Tanggal beli
 * @param {string} groupKey - Kelompok
 * @returns {number} - Nilai sisa saat ini
 */
export const getCurrentBookValue = (cost, purchaseDate, groupKey) => {
  const group = ASSET_GROUPS[groupKey];
  if (!group) return cost;

  const buyDate = new Date(purchaseDate);
  const now = new Date();
  
  const monthsDiff = (now.getFullYear() - buyDate.getFullYear()) * 12 + (now.getMonth() - buyDate.getMonth());
  const totalMonths = group.years * 12;
  
  if (monthsDiff >= totalMonths) return 0;
  
  const monthlyDepr = calculateMonthlyDepreciation(cost, groupKey);
  const accumulatedDepr = monthlyDepr * monthsDiff;
  
  return Math.max(0, cost - accumulatedDepr);
};
