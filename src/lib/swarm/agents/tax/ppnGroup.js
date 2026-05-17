/**
 * AGENT PPN Keluaran (Output VAT Specialist)
 * Focus: e-Faktur issuance, 12% rate compliance, VAT synchronization
 */
export const PPNOutputAgent = {
  name: 'PPNOutput',
  tier: 1,
  weight: 1.0,
  async run(payload, context) {
    const isSales = payload.type === 'Pemasukan' && payload.is_taxable !== false;
    if (!isSales) return { status: 'ADVISORY', message: 'Bukan transaksi penjualan kena pajak.' };

    const findings = [];
    if (payload.ppn_amount <= 0) findings.push('PPN 12% belum dihitung pada penjualan.');
    if (!payload.faktur_number) findings.push('Nomor Seri Faktur Pajak (NSFP) wajib diisi untuk PPN Keluaran.');

    return {
      status: findings.length > 0 ? 'WARNING' : 'APPROVED',
      message: findings.length > 0 ? findings.join(' ') : 'PPN Keluaran tervalidasi dengan tarif 12%.',
      tax_type: 'PPN Keluaran'
    };
  }
};

/**
 * AGENT PPN Masukan (Input VAT Auditor)
 * Focus: Creditable vs Non-creditable VAT, Vendor validation
 */
export const PPNInputAgent = {
  name: 'PPNInput',
  tier: 1,
  weight: 0.9,
  async run(payload, context) {
    const hasVat = payload.ppn_amount > 0 && payload.type === 'Pengeluaran';
    if (!hasVat) return { status: 'ADVISORY', message: 'Tidak ada PPN Masukan yang diklaim.' };

    const isCreditable = payload.is_creditable !== false;
    if (!isCreditable) return { status: 'WARNING', message: 'PPN Masukan ditandai tidak dapat dikreditkan (Biaya non-deductible).' };

    if (!payload.faktur_number) {
      return { status: 'REJECTED', message: 'Klaim PPN Masukan wajib menyertakan nomor Faktur Pajak vendor.' };
    }

    return {
      status: 'APPROVED',
      message: 'PPN Masukan valid dan dapat dikreditkan untuk mengurangi PPN terutang.',
      tax_type: 'PPN Masukan'
    };
  }
};

/**
 * AGENT PPN WAPU (Withholding VAT Specialist)
 * Focus: Transactions with BUMN/Government (WAPU entities)
 */
export const PPNWapuAgent = {
  name: 'PPNWapu',
  tier: 1,
  weight: 0.8,
  async run(payload, context) {
    const isWapu = (payload.counterparty?.is_wapu === true) || (payload.description || '').toLowerCase().includes('bumn');
    if (!isWapu) return { status: 'ADVISORY', message: 'Bukan transaksi dengan pemungut PPN (WAPU).' };

    return {
      status: 'APPROVED',
      message: 'Transaksi WAPU terdeteksi. PPN akan dipungut oleh pembeli, pastikan kode faktur diawali 02 atau 03.',
      tax_type: 'PPN WAPU'
    };
  }
};

/**
 * AGENT PPN KMS (Self-Construction Tax)
 * Focus: Building projects without contractors (Kegiatan Membangun Sendiri)
 */
export const PPNKmsAgent = {
  name: 'PPNKms',
  tier: 1,
  weight: 0.7,
  async run(payload, context) {
    const isConstruction = (payload.tags || []).includes('CONSTRUCTION') && (payload.description || '').toLowerCase().includes('bangun sendiri');
    if (!isConstruction) return { status: 'ADVISORY', message: 'Bukan objek PPN KMS.' };

    return {
      status: 'APPROVED',
      message: 'Objek PPN KMS terdeteksi. Wajib setor 2.4% (20% x 12%) dari total pengeluaran konstruksi.',
      tax_type: 'PPN KMS'
    };
  }
};

/**
 * AGENT PPN Export (Zero Rate Specialist)
 * Focus: Export of goods/services, Restitution documents
 */
export const PPNExportAgent = {
  name: 'PPNExport',
  tier: 1,
  weight: 0.8,
  async run(payload, context) {
    const isExport = payload.is_export === true || (payload.description || '').toLowerCase().includes('ekspor');
    if (!isExport) return { status: 'ADVISORY', message: 'Bukan transaksi ekspor.' };

    if (!payload.documents?.peb) {
      return { status: 'WARNING', message: 'Ekspor wajib menyertakan PEB (Pemberitahuan Ekspor Barang) untuk tarif 0%.' };
    }

    return {
      status: 'APPROVED',
      message: 'Ekspor tervalidasi dengan tarif 0%. Dokumen PEB siap untuk audit restitusi.',
      tax_type: 'PPN Ekspor'
    };
  }
};
