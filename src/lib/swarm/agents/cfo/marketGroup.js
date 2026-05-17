/**
 * AGENT Market Trend (Llama-Powered)
 * Focus: Analyzing macro-economic impacts on business.
 */
export const MarketTrendAgent = {
  name: 'MarketTrend',
  tier: 2,
  weight: 1.1,
  async run(payload, context) {
    const prompt = `
      Analisis TREN PASAR & MAKRO (Market Trend Analysis):
      TRANSAKSI/DATA BISNIS: ${JSON.stringify(payload)}
      
      Tugas: Bagaimana inflasi, nilai tukar, atau tren ekonomi makro saat ini mempengaruhi profitabilitas transaksi ini?
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
 * AGENT Competitor Pricing (Llama-Powered)
 * Focus: Monitoring and suggesting price adjustments vs competitors.
 */
export const CompetitorPricingAgent = {
  name: 'CompetitorPricing',
  tier: 2,
  weight: 1.2,
  async run(payload, context) {
    const prompt = `
      Analisis HARGA KOMPETITOR:
      PRODUK & HARGA KITA: ${JSON.stringify(payload)}
      
      Tugas: Apakah harga kita kompetitif? Berikan saran penyesuaian jika kita terlalu mahal atau terlalu murah dibandingkan rata-rata pasar.
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
 * AGENT Industry Benchmark (Llama-Powered)
 * Focus: Comparing performance with industry standards.
 */
export const IndustryBenchmarkAgent = {
  name: 'IndustryBenchmark',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      BENCHMARK INDUSTRI:
      KINERJA KITA: ${JSON.stringify(payload)}
      
      Tugas: Bandingkan rasio keuangan ini dengan standar industri sejenis. Di mana posisi kita (Leader/Laggard)?
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
 * AGENT Product Life Cycle (Llama-Powered)
 * Focus: Predicting obsolescence and suggesting innovation.
 */
export const ProductLifeCycleAgent = {
  name: 'ProductLifeCycle',
  tier: 2,
  weight: 0.9,
  async run(payload, context) {
    const prompt = `
      Analisis SIKLUS HIDUP PRODUK (Product Life Cycle):
      DATA PENJUALAN: ${JSON.stringify(payload)}
      
      Tugas: Apakah produk ini sedang di fase Growth, Maturity, atau Decline? Kapan kita harus melakukan inovasi atau penghentian produk?
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
 * AGENT Expansion Scout (Llama-Powered)
 * Focus: Identifying new market opportunities.
 */
export const ExpansionScoutAgent = {
  name: 'ExpansionScout',
  tier: 2,
  weight: 1.3,
  async run(payload, context) {
    const prompt = `
      PENCARIAN PELUANG EKSPANSI:
      KAS TERSEDIA: ${JSON.stringify(payload)}
      
      Tugas: Berdasarkan kondisi keuangan saat ini, apakah perusahaan siap untuk ekspansi ke pasar baru? Di mana peluang terbaiknya?
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
 * AGENT M&A Evaluator (Llama-Powered)
 * Focus: Assessing potential mergers or acquisitions.
 */
export const M&A_EvaluatorAgent = {
  name: 'M&A_Evaluator',
  tier: 2,
  weight: 1.5,
  async run(payload, context) {
    const prompt = `
      Evaluasi MERGER & AKUISISI (M&A):
      POTENSI TARGET/PARTNER: ${JSON.stringify(payload)}
      
      Tugas: Analisis sinergi jika kita melakukan kerjasama atau akuisisi. Apakah valuasi masuk akal secara finansial?
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
