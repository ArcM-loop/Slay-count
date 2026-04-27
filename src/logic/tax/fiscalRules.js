// src/logic/tax/fiscalRules.js
// Aturan koreksi fiskal Indonesia - biaya yang tidak boleh dikurangkan

export const FISCAL_CORRECTION_RULES = [
  {
    id: 'entertainment',
    name: 'Biaya Representasi/Hiburan',
    description: 'Biaya entertainment, jamuan tanpa daftar nominatif tidak dapat dikurangkan',
    keywords: ['hiburan', 'entertainment', 'jamuan', 'representasi'],
    is_deductible: false,
    pasal: 'Pasal 9 (1) huruf e UU PPh',
  },
  {
    id: 'sumbangan',
    name: 'Sumbangan/Donasi Umum',
    description: 'Sumbangan yang tidak ke lembaga tertentu tidak dapat dikurangkan',
    keywords: ['sumbangan', 'donasi', 'amal', 'charity'],
    is_deductible: false,
    pasal: 'Pasal 9 (1) huruf g UU PPh',
  },
  {
    id: 'denda',
    name: 'Denda & Sanksi Pajak',
    description: 'Denda administrasi, bunga, dan sanksi pajak tidak dapat dikurangkan',
    keywords: ['denda', 'sanksi', 'penalti', 'penalty'],
    is_deductible: false,
    pasal: 'Pasal 9 (1) huruf k UU PPh',
  },
  {
    id: 'natura',
    name: 'Pemberian Natura/Kenikmatan',
    description: 'Benefit natura/kenikmatan ke karyawan tidak dapat dikurangkan',
    keywords: ['natura', 'kenikmatan', 'fasilitas karyawan'],
    is_deductible: false,
    pasal: 'Pasal 9 (1) huruf e UU PPh',
  },
  {
    id: 'gaji_deductible',
    name: 'Gaji & Tunjangan Karyawan',
    description: 'Biaya gaji, tunjangan, dan THR karyawan dapat dikurangkan',
    keywords: ['gaji', 'upah', 'tunjangan', 'thr', 'bonus'],
    is_deductible: true,
    pasal: 'Pasal 6 (1) huruf a UU PPh',
  },
  {
    id: 'sewa_deductible',
    name: 'Biaya Sewa',
    description: 'Biaya sewa kantor dan fasilitas usaha dapat dikurangkan',
    keywords: ['sewa', 'rental', 'leasing'],
    is_deductible: true,
    pasal: 'Pasal 6 (1) huruf a UU PPh',
  },
  {
    id: 'marketing_deductible',
    name: 'Biaya Pemasaran',
    description: 'Biaya iklan, promosi, dan pemasaran dapat dikurangkan',
    keywords: ['marketing', 'iklan', 'promosi', 'advertising'],
    is_deductible: true,
    pasal: 'Pasal 6 (1) huruf a UU PPh',
  },
  {
    id: 'penyusutan_deductible',
    name: 'Penyusutan Aset Tetap',
    description: 'Beban penyusutan aset sesuai kelompok harta dapat dikurangkan',
    keywords: ['penyusutan', 'depresiasi', 'amortisasi'],
    is_deductible: true,
    pasal: 'Pasal 6 (1) huruf b UU PPh',
  },
];

export const detectFiscalStatus = (accountName = '', description = '') => {
  const text = `${accountName} ${description}`.toLowerCase();
  for (const rule of FISCAL_CORRECTION_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      return rule;
    }
  }
  return null;
};

export const categorizeFiscalTransactions = (transactions) => {
  const deductible = [];
  const nonDeductible = [];
  const uncategorized = [];

  transactions.forEach(tx => {
    if (tx.type !== 'Pengeluaran' || tx.status !== 'Final') return;
    
    const rule = detectFiscalStatus(tx.account_name || '', tx.description || '');
    if (!rule) {
      uncategorized.push({ ...tx, fiscal_note: 'Perlu dikaji lebih lanjut' });
    } else if (rule.is_deductible) {
      deductible.push({ ...tx, fiscal_rule: rule });
    } else {
      nonDeductible.push({ ...tx, fiscal_rule: rule });
    }
  });

  return { deductible, nonDeductible, uncategorized };
};