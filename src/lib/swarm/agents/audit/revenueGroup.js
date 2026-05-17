/**
 * AGENT Skimming Detector (GPT-Powered)
 * Focus: Identifying gaps between sales orders and actual bank deposits.
 */
export const SkimmingDetectorAgent = {
  name: 'SkimmingDetector',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Analisis potensi SKIMMING (Penghilangan pendapatan sebelum dicatat):
      TRANSAKSI PENJUALAN: ${JSON.stringify(payload)}
      DATA SETORAN BANK: (Konteks bank reconciliation...)
      
      Tugas: Cari indikasi apakah ada pendapatan yang diterima tunai tapi tidak disetorkan atau dicatat sebagian.
      Jawab dalam JSON: { "status": "APPROVED"|"WARNING", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callGPT(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'GPT Audit Failed', agent: this.name };
    }
  }
};

/**
 * AGENT Lapping Auditor (GPT-Powered)
 * Focus: Detecting the "lapping" fraud scheme in accounts receivable.
 */
export const LappingAuditorAgent = {
  name: 'LappingAuditor',
  tier: 2,
  weight: 1.2,
  async run(payload, context) {
    const prompt = `
      Analisis potensi LAPPING (Skema gali lubang tutup lubang pada piutang):
      PEMBAYARAN PIUTANG: ${JSON.stringify(payload)}
      
      Tugas: Cek apakah ada pola di mana pembayaran dari customer baru digunakan untuk menutupi hutang customer lama.
      Jawab dalam JSON: { "status": "APPROVED"|"WARNING", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callGPT(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'GPT Audit Failed', agent: this.name };
    }
  }
};

/**
 * AGENT Asset Theft Scout (GPT-Powered)
 * Focus: Monitoring suspicious inventory write-offs.
 */
export const AssetTheftScoutAgent = {
  name: 'AssetTheftScout',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Analisis potensi PENCURIAN ASET (Inventory Theft):
      PENGHAPUSAN BARANG: ${JSON.stringify(payload)}
      
      Tugas: Evaluasi alasan penghapusan (rusak/hilang). Apakah logis atau berpotensi menutupi pencurian fisik?
      Jawab dalam JSON: { "status": "APPROVED"|"WARNING", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callGPT(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'GPT Audit Failed', agent: this.name };
    }
  }
};

/**
 * AGENT Revenue Recognition (GPT-Powered)
 * Focus: Ensuring revenue isn't recorded prematurely.
 */
export const RevenueRecognitionAgent = {
  name: 'RevenueRecognition',
  tier: 1,
  weight: 0.9,
  async run(payload, context) {
    const prompt = `
      Validasi PENGAKUAN PENDAPATAN (Revenue Recognition):
      TRANSAKSI: ${JSON.stringify(payload)}
      SYARAT PENYERAHAN: (FOB Shipping Point/Destination...)
      
      Tugas: Pastikan pendapatan dicatat saat hak dan kewajiban berpindah, bukan sekedar saat invoice dibuat.
      Jawab dalam JSON: { "status": "APPROVED"|"WARNING"|"REJECTED", "message": "..." }
    `;
    
    try {
      const result = await context.ai.callGPT(prompt, { jsonMode: true });
      return { ...result, agent: this.name };
    } catch (e) {
      return { status: 'ERROR', message: 'GPT Audit Failed', agent: this.name };
    }
  }
};
