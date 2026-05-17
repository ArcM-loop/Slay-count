/**
 * BENFORD'S LAW ENGINE (Statistical Fraud Detector)
 * ===================================================
 * Hukum Benford menyatakan bahwa dalam kumpulan data finansial alami,
 * distribusi digit pertama mengikuti pola logaritmik yang spesifik.
 *
 * Penyimpangan signifikan dari pola ini mengindikasikan:
 * - Pemalsuan angka (fabrication)
 * - Skimming (pengambilan sedikit dari banyak transaksi)
 * - Round-number bias (selalu pakai angka "bulat" seperti 500.000)
 *
 * Referensi: Nigrini, M. (2012). Benford's Law: Applications for Forensic
 * Accounting, Auditing, and Fraud Detection.
 */

// Distribusi Benford yang diharapkan (Expected Probability)
export const BENFORD_EXPECTED = {
  1: 0.3010, // 30.1%
  2: 0.1761, // 17.6%
  3: 0.1249, // 12.5%
  4: 0.0969, // 9.7%
  5: 0.0792, // 7.9%
  6: 0.0669, // 6.7%
  7: 0.0580, // 5.8%
  8: 0.0512, // 5.1%
  9: 0.0458, // 4.6%
};

/**
 * Threshold MAD (Mean Absolute Deviation) standar forensik akuntansi:
 * Sumber: Nigrini (2012) - diakui secara internasional oleh ACFE
 */
export const MAD_THRESHOLDS = {
  CLOSE_CONFORMITY:    0.006,  // Hijau - sangat wajar
  ACCEPTABLE:          0.012,  // Kuning - masih dapat diterima
  MARGINAL:            0.015,  // Oranye - perlu perhatian
  NONCONFORMITY:       Infinity // Merah - indikasi kuat manipulasi
};

/**
 * Mengambil digit pertama dari suatu angka
 * @param {number} amount
 * @returns {number|null} digit pertama (1-9), atau null jika tidak valid
 */
export function getLeadingDigit(amount) {
  const abs = Math.abs(amount);
  if (!abs || abs < 1) return null; // Abaikan angka < 1 (tidak relevan untuk Benford)
  const firstChar = String(abs).replace(/^0+\.?0*/, '')[0];
  const digit = parseInt(firstChar);
  return isNaN(digit) || digit === 0 ? null : digit;
}

/**
 * Menghitung distribusi digit pertama dari array nominal transaksi
 * @param {number[]} amounts - Array nominal transaksi
 * @returns {Object} { distribution, count, validCount }
 */
export function calculateDistribution(amounts) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let validCount = 0;

  for (const amount of amounts) {
    const digit = getLeadingDigit(amount);
    if (digit !== null) {
      counts[digit]++;
      validCount++;
    }
  }

  // Konversi ke proporsi (actual probability)
  const distribution = {};
  for (let d = 1; d <= 9; d++) {
    distribution[d] = validCount > 0 ? counts[d] / validCount : 0;
  }

  return { distribution, counts, validCount };
}

/**
 * Menghitung MAD (Mean Absolute Deviation) antara distribusi aktual vs Benford
 * MAD adalah metrik utama dalam forensik akuntansi untuk mengukur penyimpangan.
 * @param {Object} actualDistribution - Hasil dari calculateDistribution
 * @returns {number} Nilai MAD
 */
export function calculateMAD(actualDistribution) {
  let totalDeviation = 0;
  for (let d = 1; d <= 9; d++) {
    totalDeviation += Math.abs(actualDistribution[d] - BENFORD_EXPECTED[d]);
  }
  return totalDeviation / 9;
}

/**
 * Menentukan level risiko berdasarkan nilai MAD
 * @param {number} mad
 * @returns {{ level: string, color: string, label: string }}
 */
export function getRiskLevel(mad) {
  if (mad < MAD_THRESHOLDS.CLOSE_CONFORMITY) {
    return { level: 'CLEAN', color: '#22c55e', label: '✅ Sangat Wajar', description: 'Distribusi transaksi mengikuti pola alami. Risiko manipulasi sangat rendah.' };
  }
  if (mad < MAD_THRESHOLDS.ACCEPTABLE) {
    return { level: 'ACCEPTABLE', color: '#eab308', label: '⚠️ Perlu Perhatian', description: 'Ada sedikit penyimpangan. Bisa jadi normal tergantung jenis bisnis.' };
  }
  if (mad < MAD_THRESHOLDS.MARGINAL) {
    return { level: 'SUSPICIOUS', color: '#f97316', label: '🔶 Mencurigakan', description: 'Penyimpangan signifikan terdeteksi. Disarankan audit manual pada transaksi digit tertentu.' };
  }
  return { level: 'FRAUD_RISK', color: '#ef4444', label: '🚨 Risiko Tinggi', description: 'Penyimpangan ekstrem dari pola Benford. Indikasi kuat adanya manipulasi atau kecurangan.' };
}

/**
 * Mengidentifikasi digit mana yang paling mencurigakan (paling menyimpang)
 * @param {Object} actualDistribution
 * @returns {Array} Array digit yang diurutkan dari paling mencurigakan
 */
export function getSuspiciousDigits(actualDistribution) {
  return Object.entries(BENFORD_EXPECTED)
    .map(([digit, expected]) => ({
      digit: parseInt(digit),
      expected: expected * 100,
      actual: (actualDistribution[digit] || 0) * 100,
      deviation: Math.abs((actualDistribution[digit] || 0) - expected),
      direction: (actualDistribution[digit] || 0) > expected ? 'OVER' : 'UNDER'
    }))
    .sort((a, b) => b.deviation - a.deviation);
}

/**
 * Main function: Jalankan analisis Benford lengkap
 * @param {Object[]} transactions - Array transaksi [{amount, description, date, ...}]
 * @returns {Object} Laporan lengkap analisis forensik
 */
export function runBenfordAnalysis(transactions) {
  const amounts = transactions.map(tx => parseFloat(tx.amount || tx.dpp || 0)).filter(Boolean);
  
  if (amounts.length < 50) {
    return {
      insufficient: true,
      message: `Data tidak cukup untuk analisis Benford yang valid. Minimal 50 transaksi diperlukan, saat ini hanya ${amounts.length}.`,
      validCount: amounts.length
    };
  }

  const { distribution, counts, validCount } = calculateDistribution(amounts);
  const mad = calculateMAD(distribution);
  const riskLevel = getRiskLevel(mad);
  const suspiciousDigits = getSuspiciousDigits(distribution);

  return {
    insufficient: false,
    mad: parseFloat(mad.toFixed(6)),
    riskLevel,
    validCount,
    distribution,
    counts,
    suspiciousDigits,
    expected: BENFORD_EXPECTED,
    analyzedAt: new Date().toISOString()
  };
}
