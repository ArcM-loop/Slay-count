/**
 * AGENT CoreTax Validator (NIK/NPWP 16-Digit)
 * Focus: Mandatory 16-digit verification, Identity matching for CTAS 2025
 */
export const CoreTaxValidatorAgent = {
  name: 'CoreTaxValidator',
  tier: 1,
  weight: 1.0,
  async run(payload, context) {
    const npwp = (payload.partner_npwp || payload.npwp || '').replace(/[^0-9]/g, '');
    
    if (npwp.length === 0) {
      return { status: 'WARNING', message: 'NPWP/NIK tidak ditemukan. Tarif pajak akan dikenakan pinalti 100% lebih tinggi.' };
    }

    if (npwp.length !== 16) {
      return { 
        status: 'REJECTED', 
        message: `Format NPWP/NIK tidak standar CoreTax 2025 (Harus 16 digit, ditemukan ${npwp.length} digit).` 
      };
    }

    return {
      status: 'APPROVED',
      message: 'Identitas NPWP/NIK tervalidasi 16-digit (Standar CoreTax 2025).',
      tax_type: 'Identity Validation'
    };
  }
};

/**
 * AGENT MAP Specialist (Tax Object Code Mapping)
 * Focus: 6-digit KJS/MAP mapping for automated Bupot
 */
export const MapSpecialistAgent = {
  name: 'MapSpecialist',
  tier: 1,
  weight: 0.9,
  async run(payload, context) {
    const taxObjectCode = payload.tax_object_code;
    
    if (!taxObjectCode) {
      return { status: 'WARNING', message: 'Kode Objek Pajak (KJS/MAP) belum dipetakan. Potensi error pada pelaporan SPT Masa.' };
    }

    // Validasi format kode (biasanya 6 digit, misal 411121-100)
    if (!/^\d{6}(-\d{3})?$/.test(taxObjectCode.replace(/\s/g, ''))) {
      return { status: 'WARNING', message: `Format Kode Objek Pajak (${taxObjectCode}) mungkin tidak valid untuk CoreTax.` };
    }

    return {
      status: 'APPROVED',
      message: `Transaksi dipetakan ke Kode Objek Pajak: ${taxObjectCode}.`,
      tax_type: 'MAP/KJS Specialist'
    };
  }
};

/**
 * AGENT CoreTax API Gateway (JSON Schema Formatter)
 * Focus: Ensuring data structure is ready for CTAS API synchronization
 */
export const CoreTaxApiGatewayAgent = {
  name: 'CoreTaxApiGateway',
  tier: 1,
  weight: 0.8,
  async run(payload, context) {
    const requiredFields = ['date', 'amount', 'tax_type', 'partner_npwp'];
    const missing = requiredFields.filter(f => !payload[f]);

    if (missing.length > 0) {
      return { status: 'WARNING', message: `Data belum lengkap untuk sinkronisasi CoreTax API. Hilang: ${missing.join(', ')}` };
    }

    return {
      status: 'APPROVED',
      message: 'Struktur data siap untuk sinkronisasi otomatis ke portal CoreTax DJP.',
      tax_type: 'CTAS Ready'
    };
  }
};

/**
 * AGENT Digital Stamp (e-Meterai Auditor)
 * Focus: Mandatory e-Meterai for documents > Rp 5.000.000
 */
export const DigitalStampAgent = {
  name: 'DigitalStamp',
  tier: 1,
  weight: 0.7,
  async run(payload, context) {
    const amount = payload.amount || 0;
    const isLegalDoc = (payload.tags || []).includes('CONTRACT') || (payload.tags || []).includes('INVOICE');
    
    if (amount > 5000000 && isLegalDoc) {
      const hasMeterai = payload.has_emeterai === true;
      return {
        status: hasMeterai ? 'APPROVED' : 'WARNING',
        message: hasMeterai 
          ? 'e-Meterai terdeteksi pada dokumen.' 
          : 'Dokumen di atas 5 Juta wajib menggunakan e-Meterai sesuai UU Bea Meterai.',
        tax_type: 'Bea Meterai'
      };
    }

    return { status: 'ADVISORY', message: 'Bukan objek wajib e-Meterai.' };
  }
};
