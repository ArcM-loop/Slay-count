/**
 * THE LEDGER AGENT (Accounting Specialist)
 * Menjaga integritas Buku Besar dan Persamaan Dasar Akuntansi.
 */

export const LedgerAgent = {
  name: 'LedgerAgent',
  weight: 2, // Bobot lebih tinggi karena ini adalah core accounting

  async run(payload, context) {
    const { debitEntries = [], creditEntries = [] } = payload;
    const { accounts = [] } = context;

    // 1. Cek Keseimbangan (Fundamental Equation)
    const totalDebit = debitEntries.reduce((s, e) => s + (e.debit || 0), 0);
    const totalCredit = creditEntries.reduce((s, e) => s + (e.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        status: 'REJECTED',
        message: `Ketidakseimbangan: Debit (${totalDebit}) != Kredit (${totalCredit})`,
        weight: this.weight
      };
    }

    // 2. Analisis "Smart Account" — Cek risiko kas negatif
    for (const entry of debitEntries.concat(creditEntries)) {
      const account = accounts.find(a => a.id === entry.account_id);
      if (!account) continue;

      // Logika Spesifik Akun Kas
      if (account.name.toLowerCase().includes('kas') || account.name.toLowerCase().includes('bank')) {
        const currentBalance = account.balance || 0;
        if (entry.credit > 0 && currentBalance - entry.credit < 0) {
          return {
            status: 'WARNING',
            message: `Risiko Kas Negatif pada akun ${account.name}`,
            weight: this.weight
          };
        }
      }
    }

    return {
      status: 'APPROVED',
      message: 'Integritas Buku Besar Terjamin.',
      weight: this.weight
    };
  }
};
