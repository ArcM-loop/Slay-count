/**
 * AGENT ROI Analyzer (Llama-Powered)
 * Focus: Analyzing return on investment for specific spends.
 */
export const RoIAnalyzerAgent = {
  name: 'RoIAnalyzer',
  tier: 2,
  weight: 1.2,
  async run(payload, context) {
    const prompt = `
      Anda adalah Strategic CFO. Analisis ROI (Return on Investment) untuk pengeluaran berikut:
      TRANSAKSI: ${JSON.stringify(payload)}
      
      Tugas: Evaluasi apakah pengeluaran ini merupakan investasi yang menghasilkan nilai tambah atau sekedar beban biaya.
      Jawab dalam JSON: { "status": "APPROVED"|"ADVISORY", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callLlama(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'Llama CFO Analysis Failed', agent: this.name };
    }
  }
};

/**
 * AGENT EBITDA Scout (Llama-Powered)
 * Focus: Monitoring operational profitability trends.
 */
export const EBIDTA_ScoutAgent = {
  name: 'EBIDTA_Scout',
  tier: 2,
  weight: 1.5,
  async run(payload, context) {
    const prompt = `
      Analisis dampak transaksi terhadap EBITDA Perusahaan:
      TRANSAKSI: ${JSON.stringify(payload)}
      
      Tugas: Bagaimana transaksi ini mempengaruhi profitabilitas operasional sebelum bunga dan pajak?
      Jawab dalam JSON: { "status": "APPROVED"|"WARNING", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callLlama(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'Llama CFO Analysis Failed', agent: this.name };
    }
  }
};

/**
 * AGENT GPM Specialist (Llama-Powered)
 * Focus: Gross Profit Margin per product/service.
 */
export const GPM_SpecialistAgent = {
  name: 'GPM_Specialist',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Analisis Margin Laba Kotor (GPM):
      DATA PRODUK/TRANSAKSI: ${JSON.stringify(payload)}
      
      Tugas: Apakah margin pada transaksi ini sehat untuk standar industri? Berikan rekomendasi jika terlalu tipis.
      Jawab dalam JSON: { "status": "APPROVED"|"ADVISORY", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callLlama(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'Llama CFO Analysis Failed', agent: this.name };
    }
  }
};

/**
 * AGENT OPEX Optimizer (Llama-Powered)
 * Focus: Identifying areas to cut overhead.
 */
export const OPEX_OptimizerAgent = {
  name: 'OPEX_Optimizer',
  tier: 2,
  weight: 0.9,
  async run(payload, context) {
    const prompt = `
      Analisis Optimalisasi OPEX (Operational Expenditure):
      BIAYA: ${JSON.stringify(payload)}
      
      Tugas: Cari potensi pemborosan. Apakah biaya ini bisa dikurangi atau diganti dengan alternatif yang lebih murah?
      Jawab dalam JSON: { "status": "APPROVED"|"ADVISORY", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callLlama(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'Llama CFO Analysis Failed', agent: this.name };
    }
  }
};

/**
 * AGENT Working Capital (Llama-Powered)
 * Focus: Cash cycle and liquidity efficiency.
 */
export const WorkingCapitalAgent = {
  name: 'WorkingCapital',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Analisis Modal Kerja (Working Capital):
      TRANSAKSI: ${JSON.stringify(payload)}
      
      Tugas: Bagaimana dampak transaksi ini terhadap siklus kas perusahaan? Apakah memperlambat atau mempercepat perputaran modal?
      Jawab dalam JSON: { "status": "APPROVED"|"ADVISORY", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callLlama(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'Llama CFO Analysis Failed', agent: this.name };
    }
  }
};

/**
 * AGENT Unit Economics (Llama-Powered)
 * Focus: LTV/CAC and profitability per unit.
 */
export const UnitEconomicsAgent = {
  name: 'UnitEconomics',
  tier: 2,
  weight: 1.3,
  async run(payload, context) {
    const prompt = `
      Analisis Unit Economics:
      DATA: ${JSON.stringify(payload)}
      
      Tugas: Apakah model bisnis ini berkelanjutan pada level per unit? Cek hubungan antara biaya akuisisi dan nilai umur pelanggan.
      Jawab dalam JSON: { "status": "APPROVED"|"WARNING", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callLlama(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'Llama CFO Analysis Failed', agent: this.name };
    }
  }
};
