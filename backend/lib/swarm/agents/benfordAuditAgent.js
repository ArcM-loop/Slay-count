/**
 * BENFORD AUDIT AGENT (Forensic Fraud Detective)
 * ================================================
 * Agen swarm tier 2 (Arbitrator) yang bekerja secara BATCH —
 * menganalisis seluruh histori transaksi bisnis untuk mendeteksi
 * pola kecurangan yang tidak kasat mata.
 *
 * Tidak bekerja per-transaksi, melainkan dipanggil sebagai
 * audit forensik periodik (harian/mingguan/on-demand).
 *
 * Deteksi utama:
 * 1. Skimming       → Digit 1 under-represented (banyak transaksi kecil tersembunyi)
 * 2. Fabrication    → Digit terlalu merata (angka dibuat-buat)
 * 3. Round-number   → Digit 5 & 1 over-represented (suka pakai 500.000, 1.000.000)
 */

import { runBenfordAnalysis, getSuspiciousDigits, BENFORD_EXPECTED } from '@/lib/forensic/benfordEngine';

export const BenfordAuditAgent = {
  name: 'BenfordAudit',
  tier: 2,        // Arbitrator — hanya dipanggil untuk audit forensik
  weight: 3.0,    // Bobot tinggi karena ini deteksi fraud level tinggi

  /**
   * Menjalankan analisis Benford terhadap kumpulan transaksi.
   * 
   * PENTING: Agen ini dipanggil secara TERPISAH dari journalEngine
   * (bukan per-transaksi). Dipanggil dari halaman Audit/FinancialHealth.
   * 
   * @param {Object} payload - { transactions: [] }
   * @param {Object} context - Konteks swarm (opsional)
   */
  async run(payload, context) {
    console.log('[BenfordAudit] 🔍 Starting forensic Benford analysis...');

    const { transactions = [] } = payload;

    if (transactions.length === 0) {
      return {
        status: 'ADVISORY',
        agent: this.name,
        message: 'Tidak ada data transaksi untuk dianalisis.',
        weight: this.weight,
        benford: null
      };
    }

    // 1. Jalankan Analisis Benford
    const analysis = runBenfordAnalysis(transactions);

    // 2. Jika data tidak mencukupi
    if (analysis.insufficient) {
      return {
        status: 'ADVISORY',
        agent: this.name,
        message: analysis.message,
        weight: this.weight,
        benford: analysis
      };
    }

    // 3. Tentukan status berdasarkan risk level
    const { riskLevel, mad, suspiciousDigits, validCount } = analysis;

    // 4. Identifikasi pola spesifik (skimming, fabrication, dll)
    const patterns = this.detectPatterns(analysis.distribution, suspiciousDigits);

    // 5. Bangun ringkasan untuk output
    const topSuspicious = suspiciousDigits.slice(0, 3);
    const suspiciousDesc = topSuspicious
      .map(d => `Digit ${d.digit} (aktual: ${d.actual.toFixed(1)}%, harapan: ${d.expected.toFixed(1)}%)`)
      .join('; ');

    const statusMap = {
      CLEAN:       'APPROVED',
      ACCEPTABLE:  'ADVISORY',
      SUSPICIOUS:  'WARNING',
      FRAUD_RISK:  'REJECTED',
    };

    return {
      status: statusMap[riskLevel.level] || 'ADVISORY',
      agent: this.name,
      message: `[Forensik Benford] ${riskLevel.label} | MAD: ${mad} | ${validCount} transaksi dianalisis. ${patterns.length > 0 ? 'Pola terdeteksi: ' + patterns.join(', ') + '.' : ''} Penyimpangan terbesar: ${suspiciousDesc}.`,
      weight: this.weight,
      benford: {
        ...analysis,
        patterns,
        riskLabel: riskLevel.label,
        riskColor: riskLevel.color,
        riskDescription: riskLevel.description,
      }
    };
  },

  /**
   * Mendeteksi pola kecurangan spesifik berdasarkan distribusi digit.
   * @param {Object} distribution - Distribusi aktual
   * @param {Array} suspiciousDigits - Hasil sorted suspicious digits
   * @returns {string[]} Array nama pola yang terdeteksi
   */
  detectPatterns(distribution, suspiciousDigits) {
    const patterns = [];

    // SKIMMING: Digit 1 sangat under-represented (banyak transaksi kecil diambil sedikit-sedikit)
    const digit1Dev = distribution[1] - BENFORD_EXPECTED[1];
    if (digit1Dev < -0.05) {
      patterns.push('⚠️ SKIMMING (Digit 1 rendah - transaksi kecil mencurigakan)');
    }

    // ROUND NUMBER BIAS: Digit 5 over-represented (sering pakai 500.000, 5.000.000)
    const digit5Dev = distribution[5] - BENFORD_EXPECTED[5];
    if (digit5Dev > 0.03) {
      patterns.push('🔢 ROUND-NUMBER BIAS (Digit 5 dominan - angka terlalu "bulat")');
    }

    // FABRICATION: Distribusi terlalu merata (dibuat-buat, tidak natural)
    const variance = Object.values(distribution).reduce((sum, val, _, arr) => {
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return sum + Math.pow(val - mean, 2);
    }, 0) / 9;
    if (variance < 0.001) {
      patterns.push('🎭 FABRICATION (Distribusi terlalu merata - angka kemungkinan dibuat-buat)');
    }

    // HIGH-DIGIT FRAUD: Digit 8 atau 9 over-represented (banyak transaksi mendekati batas approval)
    const digit8Dev = distribution[8] - BENFORD_EXPECTED[8];
    const digit9Dev = distribution[9] - BENFORD_EXPECTED[9];
    if (digit8Dev > 0.04 || digit9Dev > 0.04) {
      patterns.push('🚩 THRESHOLD GAMING (Digit 8-9 tinggi - transaksi mendekati batas limit)');
    }

    return patterns;
  }
};
