/**
 * AGENT PPh 21 (Employee Specialist)
 * Focus: Gaji tetap, THR, Bonus, TER (Tarif Efektif Rata-rata) 2024+
 */
export const PPh21EmployeeAgent = {
  name: 'PPh21Employee',
  tier: 1,
  weight: 0.8,
  async run(payload, context) {
    const isSalary = payload.category === 'PAYROLL' || (payload.description || '').toLowerCase().includes('gaji');
    if (!isSalary) return { status: 'ADVISORY', message: 'Bukan transaksi penggajian reguler.' };

    const findings = [];
    if (!payload.components?.gross_salary) findings.push('Gross salary tidak terdefinisi.');
    if (!payload.tax_params?.ptkp) findings.push('Status PTKP (K/0, TK/0, dll) wajib ada untuk PPh 21.');

    return {
      status: findings.length > 0 ? 'WARNING' : 'APPROVED',
      message: findings.length > 0 ? findings.join(' ') : 'Komponen gaji & PTKP tervalidasi untuk perhitungan TER.',
      tax_type: 'PPh 21',
      action: 'CALCULATE_TER'
    };
  }
};

/**
 * AGENT PPh 21 (Non-Employee Specialist)
 * Focus: Freelancer, Konsultan, Tenaga Ahli (DPP 50%, Kumulatif)
 */
export const PPh21NonEmployeeAgent = {
  name: 'PPh21NonEmployee',
  tier: 1,
  weight: 0.8,
  async run(payload, context) {
    const isService = payload.category === 'SERVICE_FEE' && (payload.counterparty?.type === 'INDIVIDUAL');
    if (!isService) return { status: 'ADVISORY', message: 'Bukan pembayaran jasa ke individu.' };

    const hasNpwp = (payload.counterparty?.npwp || '').length >= 15;
    
    return {
      status: 'APPROVED',
      message: `Validasi jasa individu: ${hasNpwp ? 'NPWP terdeteksi (Tarif Normal 50% x Psl 17)' : 'Tanpa NPWP (Pinalti 120%)'}`,
      tax_type: 'PPh 21 Non-Employee'
    };
  }
};

/**
 * AGENT PPh 22 (Import & Industry)
 * Focus: Impor barang, Pembelian Solar/Semen/Kertas, API-U/API-P
 */
export const PPh22ImportAgent = {
  name: 'PPh22Import',
  tier: 1,
  weight: 0.7,
  async run(payload, context) {
    const isImport = (payload.tags || []).includes('IMPORT') || (payload.description || '').toLowerCase().includes('impor');
    if (!isImport) return { status: 'ADVISORY', message: 'Bukan transaksi impor/industri strategis.' };

    if (!payload.documents?.pib) {
      return { status: 'REJECTED', message: 'Transaksi impor wajib menyertakan nomor PIB (Pemberitahuan Impor Barang).' };
    }

    return {
      status: 'APPROVED',
      message: 'Dokumen impor (PIB) terdeteksi, validasi tarif PPh 22 (2.5% atau 7.5%).',
      tax_type: 'PPh 22'
    };
  }
};

/**
 * AGENT PPh 23 (Service Specialist)
 * Focus: Jasa Manajemen, Teknik, Konstruksi (Sewa Alat), Dividen/Bunga
 */
export const PPh23ServiceAgent = {
  name: 'PPh23Service',
  tier: 1,
  weight: 1.0, // Bobot tinggi karena sangat umum di perusahaan
  async run(payload, context) {
    const pph23Keywords = ['jasa', 'sewa alat', 'dividen', 'royalti', 'bunga'];
    const desc = (payload.description || '').toLowerCase();
    const isPph23 = pph23Keywords.some(k => desc.includes(k)) || payload.category === 'EXPENSE_SERVICE';

    if (!isPph23) return { status: 'ADVISORY', message: 'Bukan objek PPh 23.' };

    const isLegalEntity = payload.counterparty?.type === 'COMPANY';
    if (!isLegalEntity) return { status: 'WARNING', message: 'Pembayaran jasa ke non-badan, pastikan bukan PPh 21.' };

    return {
      status: 'APPROVED',
      message: 'Validasi objek PPh 23 (Tarif 2% untuk Jasa/Sewa atau 15% untuk Dividen/Bunga/Royalti).',
      tax_type: 'PPh 23'
    };
  }
};
