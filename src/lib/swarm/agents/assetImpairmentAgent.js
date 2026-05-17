/**
 * ASSET IMPAIRMENT AGENT (Fiscal vs Commercial Reconciler)
 * =========================================================
 * Agen swarm Tier 2 yang memisahkan pencatatan aset antara:
 *
 *   1. AKUNTANSI KOMERSIAL (PSAK 48) — Kenyataan bisnis
 *      → Penyusutan berdasarkan umur ekonomis aktual
 *      → Mengakui Impairment (penurunan nilai) jika terjadi
 *
 *   2. AKUNTANSI FISKAL (PMK-96/2009) — Aturan Pajak DJP
 *      → Penyusutan berdasarkan kelompok harta (4 kelompok)
 *      → TIDAK mengakui impairment sebagai pengurang pajak
 *      → Menggunakan metode Garis Lurus atau Saldo Menurun
 *
 * Perbedaan keduanya menghasilkan KOREKSI FISKAL (Beda Tetap/Beda Waktu)
 * yang harus dilaporkan di SPT Tahunan Badan.
 */

// Kelompok Harta Berwujud sesuai PMK-96/2009
export const FISCAL_ASSET_GROUPS = {
  'Kelompok 1': { years: 4,  rate_sl: 0.25, rate_db: 0.50, examples: ['Komputer', 'Printer', 'HP', 'Kendaraan Operasional'] },
  'Kelompok 2': { years: 8,  rate_sl: 0.125, rate_db: 0.25, examples: ['Mesin Produksi', 'Peralatan Berat', 'Kendaraan Angkutan'] },
  'Kelompok 3': { years: 16, rate_sl: 0.0625, rate_db: 0.125, examples: ['Mesin Industri', 'Alat Besar'] },
  'Kelompok 4': { years: 20, rate_sl: 0.05, rate_db: 0.10, examples: ['Konstruksi Permanen', 'Aset Khusus'] },
  'Bangunan Permanen': { years: 20, rate_sl: 0.05, rate_db: null, examples: ['Gedung', 'Bangunan Pabrik'] },
  'Bangunan Tidak Permanen': { years: 10, rate_sl: 0.10, rate_db: null, examples: ['Hanggar', 'Gudang Sementara'] },
};

export const AssetImpairmentAgent = {
  name: 'AssetImpairment',
  tier: 2,      // Arbitrator — ahli di bidangnya
  weight: 2.5,

  /**
   * Mengevaluasi aset dalam transaksi/jurnal untuk mendeteksi:
   * 1. Apakah penyusutan yang digunakan sesuai fiskal atau komersial?
   * 2. Apakah ada klaim impairment yang tidak bisa dikurangi pajak?
   * 3. Apakah tarif penyusutan fiskal sudah benar sesuai kelompok harta?
   *
   * @param {Object} payload - TX payload dari journalEngine
   * @param {Object} context - Swarm context
   */
  async run(payload, context) {
    console.log('[AssetImpairment] Analyzing fiscal vs commercial asset treatment...');

    // Agen ini hanya aktif jika transaksi terkait aset tetap
    const isAssetRelated = this.isAssetTransaction(payload);
    if (!isAssetRelated) {
      return {
        status: 'APPROVED',
        agent: this.name,
        message: 'Tidak ada aset tetap terdeteksi. Lewati analisis impairment.',
        weight: this.weight
      };
    }

    const findings = [];
    const corrections = [];

    // 1. Deteksi klaim impairment yang tidak bisa dikurangi fiskal
    if (payload.is_impairment) {
      findings.push({
        type: 'BEDA_TETAP',
        description: `Kerugian penurunan nilai (impairment) sebesar ${this.fmt(payload.impairment_amount)} TIDAK dapat dikurangkan sebagai biaya fiskal (Pasal 9 UU PPh). Ini adalah Beda Tetap Positif.`,
        fiscal_correction: payload.impairment_amount || 0,
        is_deductible: false
      });
    }

    // 2. Cek tarif penyusutan fiskal vs yang digunakan
    if (payload.asset_group && payload.depreciation_amount && payload.asset_cost) {
      const group = FISCAL_ASSET_GROUPS[payload.asset_group];
      if (group) {
        const method = payload.depreciation_method || 'SL';
        const fiscalRate = method === 'DB' ? group.rate_db : group.rate_sl;

        if (fiscalRate === null) {
          corrections.push(`Bangunan hanya boleh metode Garis Lurus. Ganti dari ${method} ke Garis Lurus.`);
        } else {
          const expectedFiscalDep = payload.asset_cost * fiscalRate;
          const actualDep = payload.depreciation_amount;
          const diff = Math.abs(actualDep - expectedFiscalDep);

          if (diff > 1000) { // Toleransi Rp 1.000
            const isTooHigh = actualDep > expectedFiscalDep;
            findings.push({
              type: 'KOREKSI_PENYUSUTAN',
              description: `Penyusutan komersial (${this.fmt(actualDep)}) berbeda dengan fiskal (${this.fmt(expectedFiscalDep)}) untuk ${payload.asset_group}. ${isTooHigh ? 'Koreksi POSITIF: Biaya fiskal lebih kecil dari komersial.' : 'Koreksi NEGATIF: Biaya fiskal lebih besar dari komersial.'}`,
              fiscal_correction: isTooHigh ? -(actualDep - expectedFiscalDep) : (expectedFiscalDep - actualDep),
              is_deductible: true
            });
          }
        }
      } else {
        corrections.push(`Kelompok aset '${payload.asset_group}' tidak dikenal. Gunakan: ${Object.keys(FISCAL_ASSET_GROUPS).join(', ')}.`);
      }
    }

    // 3. Deteksi double-entry penyusutan belum dicatat (asset yg belum fully deprecated)
    if (payload.asset_age_years && payload.asset_group) {
      const group = FISCAL_ASSET_GROUPS[payload.asset_group];
      if (group && payload.asset_age_years > group.years) {
        corrections.push(`Aset (${payload.asset_group}) sudah melewati umur fiskal ${group.years} tahun. Secara fiskal nilai buku = 0, namun mungkin masih tercatat di neraca komersial.`);
      }
    }

    // Tentukan status final
    const hasCritical = findings.some(f => f.type === 'BEDA_TETAP');
    const hasCorrection = findings.some(f => f.type === 'KOREKSI_PENYUSUTAN') || corrections.length > 0;

    if (hasCritical) {
      const totalCorrection = findings.reduce((s, f) => s + Math.abs(f.fiscal_correction || 0), 0);
      return {
        status: 'WARNING',
        agent: this.name,
        message: `⚠️ Koreksi Fiskal Diperlukan: Ditemukan ${findings.length} item. Total koreksi fiskal: ${this.fmt(totalCorrection)}. Ini wajib dilaporkan di Lampiran SPT Tahunan Badan.`,
        weight: this.weight,
        fiscal_findings: findings,
        corrections,
        requires_spt_correction: true
      };
    }

    if (hasCorrection) {
      return {
        status: 'ADVISORY',
        agent: this.name,
        message: `ℹ️ Perbedaan Penyusutan Fiskal vs Komersial ditemukan. Pastikan Beda Waktu ini dicatat dalam rekonsiliasi fiskal SPT.`,
        weight: this.weight,
        fiscal_findings: findings,
        corrections
      };
    }

    return {
      status: 'APPROVED',
      agent: this.name,
      message: 'Perlakuan aset tetap sudah sesuai — tidak ada koreksi fiskal terdeteksi.',
      weight: this.weight,
      fiscal_findings: []
    };
  },

  /**
   * Deteksi apakah transaksi terkait aset tetap
   */
  isAssetTransaction(payload) {
    const keywords = ['penyusutan', 'depresiasi', 'depreciation', 'aset tetap', 'fixed asset', 'impairment', 'amortisasi'];
    const desc = (payload.description || '').toLowerCase();
    return keywords.some(k => desc.includes(k)) ||
      payload.is_impairment === true ||
      payload.asset_group != null ||
      payload.depreciation_amount != null;
  },

  /**
   * Format Rupiah singkat
   */
  fmt(amount) {
    return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
  }
};
