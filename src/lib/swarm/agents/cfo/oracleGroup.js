/**
 * CFO DIVISION: ORACLE MACRO & EXTERNAL GROUP (KELOMPOK D)
 * =====================================================
 * Fokus: Analisis ekonomi eksternal, perubahan regulasi, dan arbitrasi strategis.
 */

export const InflationImpactScoutAgent = {
  name: "Inflation Impact Scout",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Menganalisis kenaikan harga bahan baku dan menyarankan waktu yang tepat untuk menaikkan harga jual.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "ADVISORY", message: "Inflasi sektor naik 5%. Disarankan re-pricing produk X sebesar 7%." };
  }
};

export const ForexRiskAuditorAgent = {
  name: "Forex Risk Auditor",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Melindungi perusahaan dari kerugian selisih kurs pada transaksi mata uang asing.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "SECURE", message: "Kurs USD/IDR stabil. Belum butuh hedging untuk transaksi bulan depan." };
  }
};

export const PolicyChangePredictorAgent = {
  name: "Policy Change Predictor",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Menganalisis dampak perubahan aturan pemerintah atau tarif pajak baru terhadap profitabilitas.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "COMPLIANCE", message: "Wacana kenaikan PPN 12% sedang dipantau. Dampak ke net margin: -1.2%." };
  }
};

export const ConsumerTrendAnalystAgent = {
  name: "Consumer Trend Analyst",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Membaca pergeseran selera pasar yang bisa mempengaruhi volume penjualan di masa depan.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "INSIGHT", message: "Trend 'Eco-friendly' naik. Disarankan ganti packaging ke bahan ramah lingkungan." };
  }
};

export const ExecutiveArbitratorCFOAgent = {
  name: "Executive Arbitrator (CFO)",
  division: "CFO",
  tier: 3, // LEVEL HAKIM TERTINGGI
  model: "gpt-4o", // Otak paling tajam untuk keputusan akhir
  description: "Hakim Agung divisi CFO. Mengambil keputusan akhir jika terjadi perdebatan strategis antar 21 agen CFO lainnya.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "FINAL_VERDICT", message: "Setelah menimbang seluruh simulasi, strategi ekspansi disetujui dengan catatan cadangan kas 20%." };
  }
};
