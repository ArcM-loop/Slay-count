/**
 * CFO DIVISION: SCENARIO PLANNING GROUP (KELOMPOK A)
 * ================================================
 * Fokus: Simulasi "Parallel Financial Worlds" untuk prediksi masa depan.
 */

export const RecessionSurvivorAgent = {
  name: "Recession Survivor",
  division: "CFO",
  tier: 2,
  model: "llama-3-70b", // Adversarial thinking
  description: "Mensimulasikan strategi bertahan hidup jika ekonomi melambat atau sales turun drastis.",
  async analyze(transaction, context) {
    // Logika simulasi dampak resesi
    return { agent: this.name, status: "ADVISORY", message: "Scenario: Sales -30%. Rekomendasi: Perketat OPEX dan amankan kas cadangan." };
  }
};

export const HypergrowthArchitectAgent = {
  name: "Hypergrowth Architect",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Merancang struktur keuangan untuk mendukung ekspansi cepat tanpa kehabisan kas.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "ADVISORY", message: "Scenario: Expansion +100%. Rekomendasi: Butuh pendanaan eksternal atau optimasi piutang." };
  }
};

export const PriceWarStrategistAgent = {
  name: "Price-War Strategist",
  division: "CFO",
  tier: 2,
  model: "llama-3-70b",
  description: "Menganalisis ketahanan margin jika kompetitor melakukan banting harga besar-besaran.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "ADVISORY", message: "Scenario: Competitor Price Drop. Rekomendasi: Fokus pada loyalitas pelanggan atau efisiensi COGS." };
  }
};

export const SupplyChainDisruptorAgent = {
  name: "Supply Chain Disruptor",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Simulasi dampak keuangan jika terjadi kegagalan pada rantai pasok atau vendor utama.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "ADVISORY", message: "Scenario: Vendor Failure. Rekomendasi: Cari backup vendor dan tingkatkan stok buffer." };
  }
};

export const NewMarketScoutAgent = {
  name: "New Market Scout",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Simulasi potensi untung-rugi dan risiko saat memasuki segmen pasar atau wilayah baru.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "ADVISORY", message: "Scenario: New Region Entry. Rekomendasi: Riset biaya logistik lokal dan regulasi daerah." };
  }
};

export const ProductPivotAnalystAgent = {
  name: "Product Pivot Analyst",
  division: "CFO",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Menganalisis kelayakan finansial jika perusahaan mengganti produk utama dengan inovasi baru.",
  async analyze(transaction, context) {
    return { agent: this.name, status: "ADVISORY", message: "Scenario: Product Change. Rekomendasi: Amortisasi aset lama dan hitung R&D payback period." };
  }
};
