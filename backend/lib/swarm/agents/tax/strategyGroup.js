/**
 * AGENT Fiscal Reconciliation (Tax Correction Specialist)
 * Focus: Bridging accounting profit to fiscal profit, Permanent & Timing differences
 */
export const FiscalReconAgent = {
  name: 'FiscalRecon',
  tier: 1,
  weight: 1.0,
  async run(payload, context) {
    const findings = [];
    const desc = (payload.description || '').toLowerCase();
    
    // Deteksi biaya yang biasanya harus dikoreksi fiskal (non-deductible)
    const nonDeductibleKeywords = ['sumbangan', 'entertainment', 'denda', 'pajak penghasilan', 'natura'];
    if (nonDeductibleKeywords.some(k => desc.includes(k))) {
      findings.push(`Biaya "${desc}" terdeteksi sebagai Non-Deductible (Koreksi Fiskal Positif).`);
    }

    return {
      status: findings.length > 0 ? 'WARNING' : 'APPROVED',
      message: findings.length > 0 ? findings.join(' ') : 'Tidak ditemukan komponen koreksi fiskal permanen.',
      tax_type: 'Fiscal Reconciliation',
      is_deductible: findings.length === 0
    };
  }
};

/**
 * AGENT SP2DK Risk Scout (Audit Predictor)
 * Focus: Detecting anomalies that might trigger a Request for Explanation (SP2DK) from DJP
 */
export const RiskScoutAgent = {
  name: 'RiskScout',
  tier: 1,
  weight: 0.8,
  async run(payload, context) {
    const amount = payload.amount || 0;
    const isRoundNumber = amount > 1000000 && amount % 1000000 === 0;
    const findings = [];

    if (isRoundNumber) {
      findings.push('Angka bulat dalam jumlah besar seringkali memicu kecurigaan audit.');
    }

    if (payload.tax_amount === 0 && payload.is_taxable !== false) {
      findings.push('Transaksi tanpa pajak pada objek kena pajak terdeteksi.');
    }

    return {
      status: findings.length > 0 ? 'WARNING' : 'APPROVED',
      message: findings.length > 0 ? findings.join(' ') : 'Parameter risiko audit dalam batas normal.',
      risk_score: findings.length * 20,
      tax_type: 'Risk Audit'
    };
  }
};

/**
 * AGENT Tax Strategy Advisor (Tax Planning Specialist)
 * Focus: Optimizing tax efficiency and legal tax structure
 */
export const TaxStrategyAgent = {
  name: 'TaxStrategy',
  tier: 1,
  weight: 0.9,
  async run(payload, context) {
    const isHighTax = payload.tax_amount / payload.amount > 0.2;
    
    if (isHighTax) {
      return {
        status: 'ADVISORY',
        message: 'Beban pajak transaksi ini tinggi (>20%). Pertimbangkan penggunaan skema P3B atau restrukturisasi kontrak.',
        tax_type: 'Strategic Planning'
      };
    }

    return {
      status: 'APPROVED',
      message: 'Struktur transaksi efisien secara perpajakan.',
      tax_type: 'Strategic Planning'
    };
  }
};
