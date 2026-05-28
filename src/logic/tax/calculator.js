/**
 * SLAYCOUNT TAX POLICY ENGINE (Professional & Compliance Grade)
 * Berdasarkan UU HPP, PP 55/2022, PMK 168/2023, dan UU HKPD.
 * Update: Mei 2024 (Menangani Expiry PPh Final 0.5% & Skema TER)
 */

export const TAX_POLICIES = {
  PPH_FINAL_DURATION: {
    PT: 3,        // Tahun
    CV: 4,        // Tahun
    KOPERASI: 4,  // Tahun
    FIRM: 4,      // Tahun
    INDIVIDUAL: 7 // Tahun (Dihitung sejak terdaftar atau sejak 2018 jika terdaftar sebelum itu)
  },
  THRESHOLD_PKP: 4800000000, // 4.8 Miliar
  THRESHOLD_INDIVIDUAL_EXEMPT: 500000000, // 500 Juta Bebas Pajak (UU HPP)
  DEFAULT_PBJT: 0.10, // Pajak Daerah (Umum)
  PPN_RATE: 0.11,     // PPN Pusat
  // Tarif Progresif Pasal 17 (UU HPP)
  PASAL_17_LAYERS: [
    { limit: 60000000, rate: 0.05 },
    { limit: 250000000, rate: 0.15 },
    { limit: 500000000, rate: 0.25 },
    { limit: 5000000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 }
  ],
  // TER (Tarif Efektif Rata-rata) Category A - Simplified Sample
  TER_A: [
    { limit: 5400000, rate: 0 },
    { limit: 5650000, rate: 0.0025 },
    { limit: 6200000, rate: 0.005 },
    { limit: 6500000, rate: 0.0075 },
    { limit: Infinity, rate: 0.10 } // Over-simplified for logic demonstration
  ]
};

/**
 * Menghitung kelayakan penggunaan PPh Final 0.5%
 * MENGAMBIL CELAH: Menangani batas waktu (expiry) dan kriteria pekerjaan bebas.
 */
export const evaluateTaxPolicy = (business, currentTurnoverYearly) => {
  const currentYear = new Date().getFullYear();
  const startYear = new Date(business.createdAt).getFullYear();
  
  // Berdasarkan PP 55/2022 Pasal 59: Jangka waktu dihitung sejak 2018 bagi WP lama
  const baseYear = Math.max(startYear, 2018);
  const yearsActive = currentYear - baseYear;
  
  const durationLimit = TAX_POLICIES.PPH_FINAL_DURATION[business.entityType] || 0;
  const isExpired = yearsActive >= durationLimit;
  
  // Celah Pekerjaan Bebas (Doctor, Lawyer, etc) dilarang pakai 0.5%
  const isForbiddenFromFinal = business.isProfessionalService === true;
  
  const canUseFinal = !isExpired && !isForbiddenFromFinal;
  
  return {
    useFinal: canUseFinal,
    isExpired,
    isForbiddenFromFinal,
    mustRegisterPKPNextYear: currentTurnoverYearly > TAX_POLICIES.THRESHOLD_PKP,
    yearsRemaining: Math.max(0, durationLimit - yearsActive),
    currentRegime: canUseFinal ? "PPh Final 0.5% (UMKM)" : "Tarif Umum Pasal 17 / Pembukuan",
    alert: isExpired ? "Masa berlaku PPh Final 0,5% telah habis. Wajib pindah ke tarif normal." : null
  };
};

/**
 * Kalkulator Pajak Cerdas (Smart Tax Calc)
 * Menangani 500 Juta Bebas Pajak, TER (Tarif Efektif), dan PBJT.
 */
export const calculateSmartTax = (amount, category, options = {}) => {
  const { 
    isExpertService = false, 
    isForeignResident = false,
    isNonBKP = false,
    isRegionalTax = false,
    cumulativeTurnoverThisYear = 0, // Penting untuk cek batas 500jt
    entityType = 'INDIVIDUAL'
  } = options;

  let ppn = 0;
  let pph = 0;
  let pbjt = 0;

  // 1. Logika 500 Juta Bebas Pajak (Hanya untuk OP UMKM - UU HPP)
  let taxableAmountForFinal = amount;
  if (entityType === 'INDIVIDUAL' && !isExpertService) {
    const remainingExempt = Math.max(0, TAX_POLICIES.THRESHOLD_INDIVIDUAL_EXEMPT - cumulativeTurnoverThisYear);
    taxableAmountForFinal = Math.max(0, amount - remainingExempt);
  }

  // 2. Logika PBJT (Pajak Daerah) vs PPN (Pajak Pusat)
  if (isRegionalTax) {
    pbjt = amount * TAX_POLICIES.DEFAULT_PBJT;
    ppn = 0;
  } else if (!isNonBKP) {
    ppn = amount * TAX_POLICIES.PPN_RATE;
  }

  // 3. Logika PPh (Potong Pungut & Tarif Umum)
  if (isForeignResident) {
    pph = amount * 0.20; // PPh 26 (Flat 20%)
  } else if (isExpertService) {
    // PMK 168/2023: Tenaga Ahli menggunakan DPP 50% x Pasal 17 Progresif
    const dpp = amount * 0.5;
    pph = calculateProgressiveTax(dpp); 
  } else if (entityType === 'INDIVIDUAL' && evaluateTaxPolicy(options.business || {}, cumulativeTurnoverThisYear).useFinal) {
    // PPh Final UMKM 0.5%
    pph = taxableAmountForFinal * 0.005;
  } else {
    // Tarif Umum Pasal 17 untuk Badan atau OP yang sudah tidak Final
    pph = calculateProgressiveTax(amount);
  }

  return {
    dpp: amount,
    taxableAmount: taxableAmountForFinal,
    ppn,
    pph,
    pbjt,
    totalTax: ppn + pph + pbjt,
    netAmount: amount + ppn + pbjt - pph,
    isExempt: taxableAmountForFinal === 0 && amount > 0
  };
};

/**
 * Helper: Menghitung Pajak Progresif Pasal 17
 */
function calculateProgressiveTax(taxableIncome) {
  let remaining = taxableIncome;
  let totalTax = 0;
  let previousLimit = 0;

  for (const layer of TAX_POLICIES.PASAL_17_LAYERS) {
    const layerCapacity = layer.limit - previousLimit;
    const amountInLayer = Math.min(remaining, layerCapacity);
    
    totalTax += amountInLayer * layer.rate;
    remaining -= amountInLayer;
    previousLimit = layer.limit;

    if (remaining <= 0) break;
  }
  return totalTax;
}

// ─── MISSING EXPORTS (dibutuhkan oleh komponen) ───────────────────────────

/** Alias untuk backward compatibility dengan komponen yang import TAX_RULES */
/** Kamus Kebijakan Pajak Unifikasi (CoreTax Ready) untuk Selektor UI */
export const TAX_RULES = {
  'NONE': { category: 'Tidak Kena Pajak', label: 'Tanpa Pajak / Non-BKP', rate: 0 },
  'PPN': { category: 'PPN', label: 'PPN Pusat (11%)', rate: 0.11 },
  'PPH_21': { category: 'PPh', label: 'PPh Pasal 21 (Gaji/Upah)', rate: 0.05 },
  'PPH_23': { category: 'PPh', label: 'PPh Pasal 23 (Jasa/Sewa)', rate: 0.02 },
  'PPH_4_2': { category: 'PPh', label: 'PPh Pasal 4 ayat (2) (Final)', rate: 0.10 },
};

/**
 * Mendeteksi jenis pajak berdasarkan nama akun transaksi.
 * @param {string} accountName - Nama akun
 * @param {object} business - Data bisnis aktif
 * @returns {{ hasPPN: boolean, hasPPh: boolean, pphType: string }}
 */
export function detectTaxType(accountName = '', business = {}) {
  const name = accountName.toLowerCase();
  const hasPPN = ['pendapatan','penjualan','jasa','persediaan','aset'].some(k => name.includes(k));
  let pphType = 'none';
  if (['gaji','upah','tunjangan'].some(k => name.includes(k))) pphType = '21';
  else if (['jasa','konsultan','sewa'].some(k => name.includes(k))) pphType = '23';
  return { hasPPN, hasPPh: pphType !== 'none', pphType };
}

/** Menghitung nominal pajak berdasarkan kode jenis pajak */
export function calculateTax(amount, taxType) {
  if (!amount) return 0;
  // Jika parameter berupa objek (hasil deteksi otomatis), ekstrak tipenya
  let type = taxType;
  if (typeof taxType === 'object' && taxType !== null) {
    const { hasPPN, pphType } = taxType;
    if (hasPPN) type = 'PPN';
    else if (pphType === '21') type = 'PPH_21';
    else if (pphType === '23') type = 'PPH_23';
    else type = 'NONE';
  }

  if (type === 'PPN') return Math.floor(amount * 0.11);
  if (type === 'PPH_21') return Math.floor(amount * 0.05);
  if (type === 'PPH_23') return Math.floor(amount * 0.02);
  if (type === 'PPH_4_2') return Math.floor(amount * 0.10);
  return 0;
}

/**
 * Menghitung estimasi PPh Badan (Tarif 22% x Laba Fiskal).
 * @param {number} fiscalProfit - Laba fiskal setelah koreksi
 * @returns {number} Estimasi PPh Badan terutang
 */
export function calculatePPhBadan(fiscalProfit) {
  if (fiscalProfit <= 0) return 0;
  // Fasilitas pengurangan 50% untuk peredaran bruto <= 4.8M (PP 30/2020)
  return Math.floor(fiscalProfit * 0.22);
}

/**
 * Mengembalikan daftar deadline pelaporan pajak yang akan datang.
 * @param {object} business - Data bisnis aktif
 * @returns {Array<{label: string, deadline: string, daysLeft: number}>}
 */
export function getUpcomingDeadlines(business = {}) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const deadlines = [
    { label: 'SPT Masa PPh 21', deadline: `${currentYear}-${String(currentMonth).padStart(2,'0')}-20` },
    { label: 'SPT Masa PPN', deadline: `${currentYear}-${String(currentMonth).padStart(2,'0')}-31` },
    { label: 'SPT Tahunan Badan', deadline: `${currentYear}-04-30` },
    { label: 'SPT Tahunan OP', deadline: `${currentYear}-03-31` },
  ];

  return deadlines.map(d => {
    const deadlineDate = new Date(d.deadline);
    const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    return { ...d, deadline: deadlineDate, daysLeft, isPast: daysLeft < 0 };
  }).filter(d => d.daysLeft > -30) // Tampilkan maksimal 30 hari yang lalu
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Alias getTaxDeadlines → getUpcomingDeadlines */
export const getTaxDeadlines = getUpcomingDeadlines;

/**
 * Menghitung Net PPN (PPN Keluaran - PPN Masukan) dari daftar JURNAL (Buku Besar).
 * @param {Array} journalEntries - Daftar jurnal final
 * @returns {{ ppnKeluaran: number, ppnMasukan: number, netPPN: number }}
 */
export function calculateNetPPN(journalEntries = []) {
  // PPN Keluaran (Normal Balance: Kredit) -> Bertambah di Kredit
  const ppnKeluaran = journalEntries
    .filter(j => j.account_name?.toLowerCase().includes('ppn keluaran') || j.account_name?.toLowerCase().includes('pajak keluaran'))
    .reduce((sum, j) => sum + ((parseFloat(j.credit) || 0) - (parseFloat(j.debit) || 0)), 0);
  
  // PPN Masukan (Normal Balance: Debit) -> Bertambah di Debit
  const ppnMasukan = journalEntries
    .filter(j => j.account_name?.toLowerCase().includes('ppn masukan') || j.account_name?.toLowerCase().includes('pajak masukan'))
    .reduce((sum, j) => sum + ((parseFloat(j.debit) || 0) - (parseFloat(j.credit) || 0)), 0);

  return { ppnKeluaran, ppnMasukan, netPPN: ppnKeluaran - ppnMasukan };
}

/**
 * Merangkum semua PPh yang terpotong/dipungut dari daftar JURNAL (Buku Besar).
 * @param {Array} journalEntries - Daftar jurnal final
 * @returns {{ PPH_21: object, PPH_23: object, PPH_26: object }}
 */
export function calculatePPhSummary(journalEntries = []) {
  const summary = {};

  journalEntries.forEach(j => {
    const name = (j.account_name || '').toLowerCase();
    const desc = (j.description || '').toLowerCase();
    
    // Cari jurnal yang berhubungan dengan Hutang PPh atau Beban PPh
    if (name.includes('pph') || desc.includes('pph')) {
      let type = 'none';
      if (name.includes('21') || desc.includes('21')) type = '21';
      else if (name.includes('23') || desc.includes('23')) type = '23';
      else if (name.includes('26') || desc.includes('26')) type = '26';
      else if (name.includes('final') || desc.includes('final')) type = 'FINAL';
      
      if (type !== 'none') {
        const key = `PPH_${type}`;
        if (!summary[key]) summary[key] = { totalTax: 0, count: 0 };
        
        // Asumsi PPh dicatat sebagai Hutang (Kredit) saat pemotongan
        const taxAmount = (parseFloat(j.credit) || 0) - (parseFloat(j.debit) || 0);
        if (taxAmount > 0) {
            summary[key].totalTax += taxAmount;
            summary[key].count += 1;
        }
      }
    }
  });

  return summary;
}

/**
 * Menghitung estimasi PPh Badan dari laba fiskal (22%).
 * @param {Array|number} transactionsOrProfit - Daftar transaksi final ATAU Laba komersial
 * @param {number} [maybeCorrection=0] - Koreksi fiskal jika argumen pertama adalah angka
 * @returns {number} Estimasi PPh Badan
 */
export function calculateCorporateTax(transactionsOrProfit = [], maybeCorrection = 0) {
  if (typeof transactionsOrProfit === 'number') {
    const profit = transactionsOrProfit;
    const correction = typeof maybeCorrection === 'number' ? maybeCorrection : 0;
    return calculatePPhBadan(profit + correction);
  }

  const transactions = Array.isArray(transactionsOrProfit) ? transactionsOrProfit : [];
  const revenue = transactions
    .filter(tx => tx.type === 'Pemasukan' || tx.type === 'income')
    .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  const expense = transactions
    .filter(tx => tx.type === 'Pengeluaran' || tx.type === 'expense')
    .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  const fiscalProfit = Math.max(0, revenue - expense);
  return calculatePPhBadan(fiscalProfit);
}
