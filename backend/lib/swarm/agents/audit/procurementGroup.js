/**
 * AGENT Vendor Kickback (GPT-Powered)
 * Focus: Detecting suspicious price markups or favoritism.
 */
export const VendorKickbackAgent = {
  name: 'VendorKickback',
  tier: 2, // Audit investigasi masuk ke Tier 2
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Analisis potensi KICKBACK/SUAP pada transaksi berikut:
      TRANSAKSI: ${JSON.stringify(payload)}
      RIWAYAT HARGA RATA-RATA: (Simulasi data historis...)
      
      Tugas: Cari indikasi apakah harga ini di atas pasar atau vendor ini diprioritaskan tanpa alasan.
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
 * AGENT Ghost Vendor (GPT-Powered)
 * Focus: Identifying potential fake/paper companies.
 */
export const GhostVendorAgent = {
  name: 'GhostVendor',
  tier: 2,
  weight: 1.0,
  async run(payload, context) {
    const prompt = `
      Analisis apakah vendor berikut berpotensi GHOST VENDOR (Perusahaan Fiktif):
      VENDOR DATA: ${JSON.stringify(payload.counterparty)}
      
      Tugas: Cek kelengkapan data alamat, NPWP, dan konsistensi profil.
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
 * AGENT Duplicate Payment Forensic (GPT-Powered)
 * Focus: Advanced detection of double invoicing.
 */
export const DuplicatePaymentAgent = {
  name: 'DuplicatePayment',
  tier: 2,
  weight: 1.2,
  async run(payload, context) {
    const prompt = `
      Analisis potensi PEMBAYARAN GANDA (DUPLICATE PAYMENT):
      TRANSAKSI BARU: ${JSON.stringify(payload)}
      
      Tugas: Bandingkan dengan transaksi sebelumnya (simulasi konteks). Cari invoice mirip tapi beda tipis.
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
 * AGENT Procurement Cycle (GPT-Powered)
 * Focus: PO-GRN-Invoice compliance.
 */
export const ProcurementCycleAgent = {
  name: 'ProcurementCycle',
  tier: 1, // Masih di Tier 1 karena ini cek prosedural
  weight: 0.8,
  async run(payload, context) {
    const prompt = `
      Validasi siklus PENGADAAN (Procurement Cycle):
      DOKUMEN: ${JSON.stringify(payload.documents)}
      
      Tugas: Pastikan ada PO (Purchase Order) dan GRN (Goods Receipt) sebelum Invoice dibayar.
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
