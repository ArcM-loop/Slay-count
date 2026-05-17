/**
 * AGENT Benford's Law Specialist (GPT-Powered)
 * Focus: Mathematical fraud detection using first-digit law.
 */
export const BenfordStatAgent = {
  name: 'BenfordStat',
  tier: 2,
  weight: 1.5,
  async run(payload, context) {
    const prompt = `
      Analisis STATISTIK BENFORD (Hukum Angka Pertama):
      KUMPULAN NOMINAL: (Data set angka dari jurnal terakhir...)
      TRANSAKSI SAAT INI: ${payload.amount}
      
      Tugas: Apakah distribusi angka pertama pada jurnal perusahaan mengikuti pola alami Benford? 
      (Angka 1 harus muncul ~30%, dsb). Jika tidak, ada indikasi angka dikarang oleh manusia.
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
 * AGENT Anomaly Pattern (GPT-Powered)
 * Focus: Detecting unusual spikes or seasonal fraud.
 */
export const AnomalyPatternAgent = {
  name: 'AnomalyPattern',
  tier: 2,
  weight: 1.2,
  async run(payload, context) {
    const prompt = `
      Deteksi POLA ANOMALI:
      TRANSAKSI: ${JSON.stringify(payload)}
      TREN HISTORIS: (Simulasi tren 12 bulan terakhir...)
      
      Tugas: Apakah ada lonjakan biaya yang tidak sesuai dengan pola bisnis normal (misal: lonjakan biaya makan-makan di akhir tahun)?
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
 * AGENT User Behavior (GPT-Powered)
 * Focus: Monitoring risky actions based on time/location.
 */
export const UserBehaviorAgent = {
  name: 'UserBehavior',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Analisis PERILAKU PENGGUNA (User Behavior):
      USER ID: ${payload.user_id || 'Unknown'}
      WAKTU INPUT: ${new Date().toLocaleTimeString()}
      TRANSAKSI: ${JSON.stringify(payload)}
      
      Tugas: Apakah user ini melakukan input di luar jam kantor atau dari IP mencurigakan? Apakah ia sering melakukan void/edit transaksi?
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
 * AGENT Outlier Detector (GPT-Powered)
 * Focus: Identifying transactions far outside the norm.
 */
export const OutlierDetectorAgent = {
  name: 'OutlierDetector',
  tier: 1,
  weight: 0.9,
  async run(payload, context) {
    const prompt = `
      Deteksi OUTLIER (Transaksi ekstrem):
      TRANSAKSI: ${JSON.stringify(payload)}
      BATAS TOLERANSI: (Rp 10jt - Rp 50jt untuk kategori ini...)
      
      Tugas: Apakah nominal transaksi ini jauh di luar batas wajar untuk kategori akun tersebut?
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
