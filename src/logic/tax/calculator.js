/**
 * SlayCount — Tax Calculator
 * Semua rumus PPh & PPN untuk bisnis di Indonesia.
 */

export const TAX_RULES = {
  PPN_IN:       { rate: 0.11, type: 'add',      label: 'PPN Masukan (11%)',      emoji: '📥' },
  PPN_OUT:      { rate: 0.11, type: 'add',      label: 'PPN Keluaran (11%)',     emoji: '📤' },
  PPH_21:       { rate: 0.05, type: 'subtract', label: 'PPh 21 (5%)',            emoji: '👨‍💼' },
  PPH_23:       { rate: 0.02, type: 'subtract', label: 'PPh 23 (2%)',            emoji: '🧑‍💼' },
  PPH_4_2:      { rate: 0.10, type: 'subtract', label: 'PPh 4(2) Final (10%)',   emoji: '🏢' },
  FINAL_UMKM:   { rate: 0.005, type: 'subtract', label: 'PPh Final UMKM (0.5%)', emoji: '🏪' },
};

/**
 * Hitung pajak dari nominal transaksi
 */
export function calculateTax(amount, taxCode) {
  const rule = TAX_RULES[taxCode];
  if (!rule) return { taxAmount: 0, netAmount: amount, rule: null };
  
  const taxAmount = Math.round(amount * rule.rate);
  const netAmount = rule.type === 'add' ? amount + taxAmount : amount - taxAmount;
  
  return { taxAmount, netAmount, rule };
}

/**
 * Hitung estimasi PPh Badan (22%)
 */
export function calculateCorporateTax(commercialProfit, fiscalCorrection = 0) {
  const taxableIncome = commercialProfit + fiscalCorrection;
  if (taxableIncome <= 0) return 0;
  
  // Tarif PPh Badan 22%
  return Math.round(taxableIncome * 0.22);
}

/**
 * Hitung PPN netto (Keluaran - Masukan)
 */
export function calculateNetPPN(transactions) {
  let ppnKeluaran = 0;
  let ppnMasukan = 0;
  
  transactions.forEach(tx => {
    if (tx.tax_type === 'PPN_OUT') {
      ppnKeluaran += calculateTax(Math.abs(tx.amount), 'PPN_OUT').taxAmount;
    }
    if (tx.tax_type === 'PPN_IN') {
      ppnMasukan += calculateTax(Math.abs(tx.amount), 'PPN_IN').taxAmount;
    }
  });
  
  return { ppnKeluaran, ppnMasukan, netPPN: ppnKeluaran - ppnMasukan };
}

/**
 * Rekap PPh per tipe
 */
export function calculatePPhSummary(transactions) {
  const summary = {};
  
  Object.keys(TAX_RULES).forEach(code => {
    if (code.startsWith('PPH') || code === 'FINAL_UMKM') {
      const filtered = transactions.filter(tx => tx.tax_type === code);
      const totalBase = filtered.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const totalTax = filtered.reduce((sum, tx) => sum + calculateTax(Math.abs(tx.amount), code).taxAmount, 0);
      
      if (filtered.length > 0) {
        summary[code] = {
          ...TAX_RULES[code],
          count: filtered.length,
          totalBase,
          totalTax,
        };
      }
    }
  });
  
  return summary;
}

/**
 * Cek tenggat waktu pajak bulan ini
 */
export function getTaxDeadlines() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  return [
    {
      id: 'pph21',
      name: 'Setor PPh 21/26',
      deadline: new Date(year, month, 10),
      emoji: '👨‍💼',
    },
    {
      id: 'pph23',
      name: 'Setor PPh 23',
      deadline: new Date(year, month, 10),
      emoji: '🧑‍💼',
    },
    {
      id: 'ppn',
      name: 'Setor & Lapor PPN',
      deadline: new Date(year, month + 1, 0), // last day of month
      emoji: '📤',
    },
    {
      id: 'spt_masa',
      name: 'Lapor SPT Masa PPh',
      deadline: new Date(year, month, 20),
      emoji: '📋',
    },
  ].map(d => ({
    ...d,
    daysLeft: Math.ceil((d.deadline - now) / (1000 * 60 * 60 * 24)),
    isOverdue: now > d.deadline,
  }));
}
