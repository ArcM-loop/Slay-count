/**
 * DIGITAL VAT AGENT (PPN Jasa Digital & PMSE Classifier)
 * =========================================================
 * Agen Tier 2 yang mendeteksi dan mengklasifikasikan transaksi
 * layanan digital luar negeri berdasarkan dua rezim PPN yang berbeda:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  REZIM 1: PPN PMSE (PMK-60/2022)                               │
 * │  → Vendor LUAR NEGERI yang DITUNJUK DJP sebagai pemungut PPN   │
 * │  → Contoh: Google, Meta, Netflix, Spotify, Zoom, AWS           │
 * │  → Mereka MEMUNGUT 11% PPN dari pembeli Indonesia              │
 * │  → Invoice dari mereka = BUKTI PUNGUTAN yang valid             │
 * │  → PKP BISA mengkreditkan sebagai PPN Masukan ✅               │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  REZIM 2: PPN JASA LUAR NEGERI / SELF-ASSESSED (Pasal 4 ayat   │
 * │  1 huruf i UU PPN)                                             │
 * │  → Vendor LUAR NEGERI yang TIDAK ditunjuk DJP                  │
 * │  → Contoh: Software kecil, freelancer luar negeri, SaaS asing  │
 * │  → TIDAK ada pungutan PPN dari vendor                          │
 * │  → Pembeli wajib SETOR SENDIRI 11% PPN ke DJP via kode billing │
 * │  → Menggunakan SSP/e-Billing dengan Kode Akun 411211 / KJS 507 │
 * │  → NON-PKP: PPN jadi beban (tidak bisa dikreditkan)            │
 * │  → PKP: Bisa dikreditkan HANYA jika setor sendiri dan ada SSP  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Referensi: PMK-48/2020, PMK-60/2022, PER-12/PJ/2020
 * Daftar resmi PMSE: https://pajak.go.id/daftar-pmse
 */

// =============================================================================
// DATABASE VENDOR PMSE YANG SUDAH DITUNJUK DJP
// (Update terakhir: Q1 2025 — sumber: DJP)
// =============================================================================
export const DJP_PMSE_VENDORS = {
  // ── ADVERTISING & MARKETING ──────────────────────────────────────
  'google':           { name: 'Google (Ads, Cloud, Workspace)', isPMSE: true,  ppnRate: 0.11, kap: '411211', kjs: '507' },
  'google ads':       { name: 'Google Ads', isPMSE: true,  ppnRate: 0.11 },
  'google cloud':     { name: 'Google Cloud Platform', isPMSE: true,  ppnRate: 0.11 },
  'google workspace': { name: 'Google Workspace', isPMSE: true,  ppnRate: 0.11 },
  'meta':             { name: 'Meta (Facebook/Instagram Ads)', isPMSE: true,  ppnRate: 0.11 },
  'facebook':         { name: 'Facebook/Meta Ads', isPMSE: true,  ppnRate: 0.11 },
  'instagram':        { name: 'Instagram Ads (Meta)', isPMSE: true,  ppnRate: 0.11 },
  'tiktok':           { name: 'TikTok For Business', isPMSE: true,  ppnRate: 0.11 },
  'twitter':          { name: 'Twitter/X Ads', isPMSE: true,  ppnRate: 0.11 },
  'linkedin':         { name: 'LinkedIn Marketing Solutions', isPMSE: true,  ppnRate: 0.11 },

  // ── CLOUD & SaaS ──────────────────────────────────────────────────
  'amazon':           { name: 'Amazon Web Services (AWS)', isPMSE: true,  ppnRate: 0.11 },
  'aws':              { name: 'Amazon Web Services', isPMSE: true,  ppnRate: 0.11 },
  'microsoft':        { name: 'Microsoft (Azure, Office 365)', isPMSE: true,  ppnRate: 0.11 },
  'azure':            { name: 'Microsoft Azure', isPMSE: true,  ppnRate: 0.11 },
  'office 365':       { name: 'Microsoft 365', isPMSE: true,  ppnRate: 0.11 },
  'zoom':             { name: 'Zoom Video Communications', isPMSE: true,  ppnRate: 0.11 },
  'dropbox':          { name: 'Dropbox', isPMSE: true,  ppnRate: 0.11 },
  'slack':            { name: 'Slack Technologies', isPMSE: true,  ppnRate: 0.11 },
  'notion':           { name: 'Notion Labs', isPMSE: true,  ppnRate: 0.11 },
  'figma':            { name: 'Figma', isPMSE: true,  ppnRate: 0.11 },
  'canva':            { name: 'Canva', isPMSE: true,  ppnRate: 0.11 },
  'shopify':          { name: 'Shopify', isPMSE: true,  ppnRate: 0.11 },
  'github':           { name: 'GitHub (Microsoft)', isPMSE: true,  ppnRate: 0.11 },
  'adobe':            { name: 'Adobe Creative Cloud', isPMSE: true,  ppnRate: 0.11 },
  'salesforce':       { name: 'Salesforce', isPMSE: true,  ppnRate: 0.11 },
  'hubspot':          { name: 'HubSpot', isPMSE: true,  ppnRate: 0.11 },

  // ── ENTERTAINMENT / STREAMING ────────────────────────────────────
  'netflix':          { name: 'Netflix', isPMSE: true,  ppnRate: 0.11 },
  'spotify':          { name: 'Spotify', isPMSE: true,  ppnRate: 0.11 },
  'youtube':          { name: 'YouTube Premium', isPMSE: true,  ppnRate: 0.11 },
  'disney':           { name: 'Disney+ Hotstar', isPMSE: true,  ppnRate: 0.11 },
  'apple':            { name: 'Apple (App Store, iCloud)', isPMSE: true,  ppnRate: 0.11 },

  // ── AI SERVICES ──────────────────────────────────────────────────
  'openai':           { name: 'OpenAI (ChatGPT, API)', isPMSE: false, ppnRate: 0.11, selfAssessed: true },
  'anthropic':        { name: 'Anthropic (Claude)', isPMSE: false, ppnRate: 0.11, selfAssessed: true },
  'gemini':           { name: 'Google Gemini API', isPMSE: true,  ppnRate: 0.11 }, // Via Google
};

// Kata kunci untuk deteksi otomatis dari deskripsi transaksi
const DIGITAL_SERVICE_KEYWORDS = [
  'subscription', 'langganan', 'cloud', 'hosting', 'domain', 'saas',
  'software', 'license', 'lisensi', 'digital', 'online', 'platform',
  'api', 'ads', 'iklan', 'storage', 'streaming', 'cdn', 'vpn',
  'app store', 'play store', 'marketplace fee', 'payment gateway'
];

// =============================================================================
// AGENT LOGIC
// =============================================================================
export const DigitalVATAgent = {
  name: 'DigitalVAT',
  tier: 2,      // Arbitrator — spesialis pajak digital
  weight: 2.5,

  async run(payload, context) {
    console.log('[DigitalVAT] Scanning for digital service VAT obligations...');

    // Langkah 1: Deteksi apakah ini transaksi layanan digital
    const detection = this.detectDigitalService(payload);
    if (!detection.isDigital) {
      return {
        status: 'APPROVED',
        agent: this.name,
        message: 'Bukan transaksi layanan digital. Tidak ada kewajiban PPN PMSE.',
        weight: this.weight
      };
    }

    // Langkah 2: Cek apakah vendor ada di daftar PMSE DJP
    const vendorInfo = this.lookupVendor(payload);

    // Langkah 3: Tentukan kewajiban PPN berdasarkan klasifikasi
    if (vendorInfo && vendorInfo.isPMSE) {
      return this.handlePMSEVendor(payload, vendorInfo, detection);
    } else {
      return this.handleSelfAssessedVAT(payload, vendorInfo, detection);
    }
  },

  /**
   * Mendeteksi apakah transaksi adalah layanan digital luar negeri
   */
  detectDigitalService(payload) {
    const desc = (payload.description || '').toLowerCase();
    const merchant = (payload.merchant_name || '').toLowerCase();
    const country = payload.partner_country || null;

    // Cek kata kunci layanan digital
    const hasKeyword = DIGITAL_SERVICE_KEYWORDS.some(k => desc.includes(k) || merchant.includes(k));

    // Cek apakah vendor teridentifikasi sebagai asing
    const isKnownVendor = Object.keys(DJP_PMSE_VENDORS).some(k =>
      merchant.includes(k) || desc.includes(k)
    );

    // Cek flag manual dari UI
    const isForeignVendor = payload.isForeignResident === true || country !== null || isKnownVendor;

    const isDigital = (hasKeyword && isForeignVendor) || isKnownVendor;

    return { isDigital, hasKeyword, isKnownVendor, isForeignVendor };
  },

  /**
   * Lookup vendor di database PMSE
   */
  lookupVendor(payload) {
    const merchant = (payload.merchant_name || '').toLowerCase();
    const desc = (payload.description || '').toLowerCase();

    for (const [key, info] of Object.entries(DJP_PMSE_VENDORS)) {
      if (merchant.includes(key) || desc.includes(key)) {
        return info;
      }
    }
    return null; // Vendor tidak dikenal → asumsikan self-assessed
  },

  /**
   * Vendor PMSE: PPN sudah dipungut oleh vendor
   */
  handlePMSEVendor(payload, vendorInfo, detection) {
    const ppn = payload.ppn_amount || payload.ppn || 0;
    const dpp = payload.dpp || payload.amount || 0;
    const expectedPPN = dpp * vendorInfo.ppnRate;

    // Cek apakah PPN sudah dicatat dengan benar
    if (ppn === 0 && dpp > 0) {
      return {
        status: 'WARNING',
        agent: this.name,
        message: `⚠️ ${vendorInfo.name} adalah pemungut PPN PMSE (PMK-60/2022). Tagihan mereka sudah TERMASUK PPN 11%. Pastikan Anda memisahkan DPP (${this.fmt(dpp / 1.11)}) dan PPN Masukan (${this.fmt(dpp - dpp / 1.11)}) dalam pencatatan, bukan hanya mencatat total sebagai beban.`,
        weight: this.weight,
        ppn_treatment: 'PMSE_COLLECTED',
        vendor: vendorInfo.name,
        can_credit_input_tax: true,
        action_required: 'SPLIT_DPP_AND_PPN'
      };
    }

    return {
      status: 'APPROVED',
      agent: this.name,
      message: `✅ ${vendorInfo.name} adalah pemungut PPN PMSE resmi DJP. PPN Masukan ${this.fmt(ppn)} dapat dikreditkan (jika Anda PKP).`,
      weight: this.weight,
      ppn_treatment: 'PMSE_COLLECTED',
      vendor: vendorInfo.name,
      can_credit_input_tax: true
    };
  },

  /**
   * Vendor bukan PMSE: Wajib self-assessed (setor sendiri)
   */
  handleSelfAssessedVAT(payload, vendorInfo, detection) {
    const dpp = payload.dpp || payload.amount || 0;
    const ppnOwed = dpp * 0.11;
    const vendorName = vendorInfo?.name || payload.merchant_name || 'Vendor Asing';
    const kodeAkun = '411211'; // Kode Akun PPN atas JKP Luar Negeri
    const kjs = '507';          // Kode Jenis Setoran: JKP dari Luar Daerah Pabean

    return {
      status: 'REJECTED',
      agent: this.name,
      message: `🚨 KEWAJIBAN SELF-ASSESSED VAT! '${vendorName}' TIDAK termasuk PMSE DJP. Anda WAJIB menyetor sendiri PPN sebesar ${this.fmt(ppnOwed)} ke DJP menggunakan kode billing:\n  • Kode Akun Pajak: ${kodeAkun} (PPN atas Pemanfaatan JKP dari Luar Daerah Pabean)\n  • Kode Jenis Setoran: ${kjs}\n  • Jatuh tempo: tanggal 15 bulan berikutnya.\nGagal menyetor = denda 2% per bulan + bunga penagihan.`,
      weight: this.weight,
      ppn_treatment: 'SELF_ASSESSED',
      vendor: vendorName,
      ppn_owed: ppnOwed,
      kode_akun: kodeAkun,
      kjs,
      can_credit_input_tax: false, // Tidak bisa dikreditkan tanpa SSP
      action_required: 'DEPOSIT_VAT_SELF',
      deadline: '15 bulan berikutnya'
    };
  },

  fmt(amount) {
    return `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;
  }
};
