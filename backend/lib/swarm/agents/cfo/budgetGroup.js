/**
 * AGENT Budget Guard (Llama-Powered)
 * Focus: Real-time budget enforcement and ceiling monitoring.
 */
export const BudgetGuardAgent = {
  name: 'BudgetGuard',
  tier: 2,
  weight: 1.5,
  async run(payload, context) {
    const prompt = `
      Analisis KEPATUHAN ANGGARAN (Budget Compliance):
      TRANSAKSI: ${JSON.stringify(payload)}
      ANGGARAN TERSEDIA: (Simulasi data budget divisi...)
      
      Tugas: Apakah transaksi ini melampaui batas anggaran bulan ini? Berikan peringatan keras jika ya.
      Jawab dalam JSON: { "status": "APPROVED"|"WARNING"|"REJECTED", "message": "..." }
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
 * AGENT Variance Forensic (Llama-Powered)
 * Focus: Analyzing why actuals differ from budget.
 */
export const VarianceForensicAgent = {
  name: 'VarianceForensic',
  tier: 2,
  weight: 1.2,
  async run(payload, context) {
    const prompt = `
      Analisis VARIANS (Penyimpangan Anggaran):
      REALISASI: ${JSON.stringify(payload)}
      TARGET: (Simulasi budget...)
      
      Tugas: Mengapa terjadi penyimpangan? Apakah karena kenaikan harga pasar atau inefisiensi internal?
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
 * AGENT Zero-Based Auditor (Llama-Powered)
 * Focus: Justifying every expense from the ground up.
 */
export const ZeroBasedAuditorAgent = {
  name: 'ZeroBasedAuditor',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Audit BERBASIS NOL (Zero-Based Budgeting):
      PENGAJUAN: ${JSON.stringify(payload)}
      
      Tugas: Abaikan histori tahun lalu. Evaluasi apakah pengeluaran ini "Benar-benar dibutuhkan" untuk operasional inti saat ini.
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
 * AGENT Rolling Forecast (Llama-Powered)
 * Focus: Continuous future prediction updates.
 */
export const RollingForecastAgent = {
  name: 'RollingForecast',
  tier: 2,
  weight: 1.1,
  async run(payload, context) {
    const prompt = `
      Update ROLLING FORECAST (Prediksi Berkelanjutan):
      DATA TERBARU: ${JSON.stringify(payload)}
      
      Tugas: Berdasarkan transaksi ini, bagaimana prediksi saldo kas dan laba rugi di 3 bulan ke depan?
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
 * AGENT Scenario Builder (Llama-Powered)
 * Focus: What-if analysis for strategic decisions.
 */
export const ScenarioBuilderAgent = {
  name: 'ScenarioBuilder',
  tier: 2,
  weight: 1.4,
  async run(payload, context) {
    const prompt = `
      Simulasi SKENARIO (What-If Analysis):
      KEPUTUSAN: ${JSON.stringify(payload)}
      
      Tugas: Jika keputusan ini diambil, apa skenario terbaik (best case) dan terburuk (worst case) bagi keuangan perusahaan?
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
 * AGENT CapEx Planner (Llama-Powered)
 * Focus: Planning for major capital expenditures.
 */
export const CapExPlannerAgent = {
  name: 'CapExPlanner',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Analisis Perencanaan CAPEX (Capital Expenditure):
      PEMBELIAN ASET: ${JSON.stringify(payload)}
      
      Tugas: Apakah pembelian aset tetap ini sudah direncanakan? Bagaimana dampaknya terhadap depresiasi dan rasio hutang?
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
