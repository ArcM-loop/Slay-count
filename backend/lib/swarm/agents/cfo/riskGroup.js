/**
 * AGENT Solvency Watch (Llama-Powered)
 * Focus: Ensuring long-term debt repayment capability.
 */
export const SolvencyWatchAgent = {
  name: 'SolvencyWatch',
  tier: 2,
  weight: 1.2,
  async run(payload, context) {
    const prompt = `
      Analisis SOLVABILITAS (Jangka Panjang):
      DATA HUTANG & ASET: ${JSON.stringify(payload)}
      
      Tugas: Apakah perusahaan mampu memenuhi kewajiban jangka panjangnya? Cek Debt-to-Equity Ratio.
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
 * AGENT Altman Z-Score (Llama-Powered)
 * Focus: Predicting bankruptcy risk using the Altman model.
 */
export const AltmanZScoreAgent = {
  name: 'AltmanZScore',
  tier: 2,
  weight: 1.5,
  async run(payload, context) {
    const prompt = `
      Analisis RISIKO KEBANGKRUTAN (Altman Z-Score):
      DATA KEUANGAN: ${JSON.stringify(payload)}
      
      Tugas: Hitung estimasi kesehatan finansial. Apakah perusahaan berada di zona "Safe", "Grey", atau "Distress"?
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
 * AGENT Enterprise Value (Llama-Powered)
 * Focus: Estimating the current valuation of the company.
 */
export const EnterpriseValueAgent = {
  name: 'EnterpriseValue',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Estimasi VALUASI PERUSAHAAN (Enterprise Value):
      EBITDA & KAS/HUTANG: ${JSON.stringify(payload)}
      
      Tugas: Berapa estimasi nilai perusahaan jika ingin dijual ke investor saat ini? Gunakan kelipatan EBITDA industri.
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
 * AGENT Sensitivity Analyst (Llama-Powered)
 * Focus: Identifying how changes in variables impact the bottom line.
 */
export const SensitivityAnalystAgent = {
  name: 'SensitivityAnalyst',
  tier: 2,
  weight: 0.9,
  async run(payload, context) {
    const prompt = `
      Analisis SENSITIVITAS (Impact Analysis):
      VARIABEL: ${JSON.stringify(payload)}
      
      Tugas: Jika biaya bahan baku naik 5%, seberapa besar dampaknya terhadap laba bersih? Identifikasi variabel paling berisiko.
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
 * AGENT ESG Compliance (Llama-Powered)
 * Focus: Environmental, Social, and Governance scoring.
 */
export const ESG_ComplianceAgent = {
  name: 'ESG_Compliance',
  tier: 2,
  weight: 0.7,
  async run(payload, context) {
    const prompt = `
      Audit ESG (Environmental, Social, Governance):
      TRANSAKSI/VENDOR: ${JSON.stringify(payload)}
      
      Tugas: Apakah transaksi ini mendukung keberlanjutan? Cek jejak karbon atau reputasi vendor terkait etika kerja.
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
 * AGENT Dividend Policy (Llama-Powered)
 * Focus: Strategic profit distribution advice.
 */
export const DividendPolicyAgent = {
  name: 'DividendPolicy',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Rekomendasi KEBIJAKAN DIVIDEN:
      LABA BERSIH & RENCANA EKSPANSI: ${JSON.stringify(payload)}
      
      Tugas: Berapa persen laba yang sebaiknya dibagikan sebagai dividen? Pertimbangkan kebutuhan modal untuk tahun depan.
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
 * AGENT Strategic Exit (Llama-Powered)
 * Focus: Preparing the company for IPO or acquisition.
 */
export const StrategicExitAgent = {
  name: 'StrategicExit',
  tier: 2,
  weight: 1.4,
  async run(payload, context) {
    const prompt = `
      Persiapan STRATEGIC EXIT (IPO/Acquisition Readiness):
      STRUKTUR KEUANGAN: ${JSON.stringify(payload)}
      
      Tugas: Apakah laporan keuangan kita sudah cukup rapi untuk audit IPO atau Due Diligence akuisisi? Apa yang harus diperbaiki?
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
