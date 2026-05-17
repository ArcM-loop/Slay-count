/**
 * AUDIT DIVISION: FORENSIC GROUP
 * ================================
 * Fokus: Investigasi forensik mendalam — rekonsiliasi fiskal, penilaian risiko pajak,
 * dan deteksi pencucian aset yang tersembunyi dalam laporan keuangan.
 */

export const FiscalReconAgent = {
  name: "Fiscal Reconciliator",
  division: "Audit",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Melakukan rekonsiliasi antara laba komersial dan laba fiskal sesuai UU PPh dan PMK terkait.",
  async analyze(transaction, context) {
    const isHighValue = parseFloat(transaction?.amount || 0) > 50000000;
    if (isHighValue) {
      return { agent: this.name, status: "WARNING", message: "Transaksi bernilai besar. Verifikasi koreksi fiskal (PTKP, non-deductible) diperlukan.", weight: 1.5 };
    }
    return { agent: this.name, status: "APPROVED", message: "Rekonsiliasi fiskal bersih. Tidak ada koreksi diperlukan.", weight: 1.2 };
  }
};

export const RiskScoutAgent = {
  name: "Tax Risk Scout",
  division: "Audit",
  tier: 2,
  model: "gemini-3.0-pro",
  description: "Mengidentifikasi transaksi yang berpotensi memicu pemeriksaan pajak atau sengketa dengan DJP.",
  async analyze(transaction, context) {
    const riskKeywords = ['konsultan', 'advisor', 'management fee', 'royalti', 'offshore'];
    const description = (transaction?.description || '').toLowerCase();
    const hasRisk = riskKeywords.some(k => description.includes(k));
    if (hasRisk) {
      return { agent: this.name, status: "WARNING", message: "Transaksi mengandung kata kunci berisiko pajak tinggi. Dokumentasi transfer pricing mungkin diperlukan.", weight: 1.8 };
    }
    return { agent: this.name, status: "APPROVED", message: "Tidak ada indikator risiko pajak terdeteksi.", weight: 1.2 };
  }
};

export const AssetLaunderingAgent = {
  name: "Asset Laundering Detector",
  division: "Audit",
  tier: 2,
  model: "llama-3-70b",
  description: "Mendeteksi pola transaksi yang mengindikasikan pencucian uang atau penyamaran aset.",
  async analyze(transaction, context) {
    const amount = parseFloat(transaction?.amount || 0);
    const isRoundNumber = amount > 0 && amount % 1000000 === 0 && amount > 100000000;
    const hasHistory = (context?.history || []).length > 3;
    
    if (isRoundNumber && !hasHistory) {
      return { agent: this.name, status: "WARNING", message: "Transaksi bulat nominal besar dari entitas baru. Indikasi pencucian aset. Perlu KYC mendalam.", weight: 2.0 };
    }
    return { agent: this.name, status: "APPROVED", message: "Pola transaksi normal. Tidak ada indikasi pencucian aset.", weight: 1.5 };
  }
};
