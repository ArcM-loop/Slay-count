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
