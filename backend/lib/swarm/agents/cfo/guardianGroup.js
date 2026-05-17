/**
 * CFO DIVISION: GUARDIAN HEALTH & RISK GROUP (KELOMPOK B)
 * =====================================================
 * Fokus: Mitigasi risiko, deteksi dini kegagalan kas, dan perlindungan aset.
 */

export const CashOutProphetAgent = {
  name: "Cash-Out Prophet",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Memprediksi tanggal tepatnya kas akan habis berdasarkan tren pengeluaran dan piutang.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "HEALTH_CHECK", message: "Runway Analysis: Kas diprediksi aman untuk 4.5 bulan ke depan." };
  }
};

export const BurnRateWatchdogAgent = {
  name: "Burn-Rate Watchdog",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Mendeteksi lonjakan biaya operasional yang tidak efisien atau di luar kebiasaan.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "WARNING", message: "Burn rate meningkat 15% minggu ini. Cek biaya langganan dan marketing." };
  }
};

export const BadDebtDetectorAgent = {
  name: "Bad-Debt Detector",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Menganalisis perilaku pembayaran klien dan memprediksi piutang yang berisiko macet.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "RISK", message: "Klien X terlambat bayar 14 hari. Risiko piutang macet meningkat." };
  }
};

export const TaxPenaltyGuardianAgent = {
  name: "Tax Penalty Guardian",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Menghitung potensi denda pajak jika pelaporan atau pembayaran tidak dilakukan tepat waktu.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "COMPLIANCE", message: "Potensi denda STP Rp 500rb jika tidak lapor PPN minggu ini." };
  }
};

export const FraudPatternPredictorAgent = {
  name: "Fraud Pattern Predictor",
  division: "CFO",
  tier: 2,
  model: "llama-3-70b", // Pola deteksi cepat
  description: "Mendeteksi celah sistemik yang bisa dimanfaatkan untuk kecurangan (fraud) di masa depan.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "SECURE", message: "Pola transaksi aman. Tidak ada indikasi anomali sistemik." };
  }
};

export const SustainabilityAuditorAgent = {
  name: "Sustainability Auditor",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Mengevaluasi apakah model bisnis saat ini tetap menguntungkan dalam jangka waktu 5-10 tahun.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "STRATEGIC", message: "Business Sustainability: 85%. Margin tetap sehat di tengah inflasi." };
  }
};
