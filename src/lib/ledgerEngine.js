/**
 * Ledger Engine - The Truth of SlayCount
 * Calculates balances from Journal Entries (Double Entry System)
 */

export const computeAccountBalances = (journalEntries, accounts, upToDate) => {
  const balances = {};

  // Initialize all accounts with 0
  accounts.forEach(acc => {
    balances[acc.id] = {
      id: acc.id,
      name: acc.name,
      code: acc.code,
      type: acc.type,
      debit: 0,
      credit: 0,
      endingBalance: 0
    };
  });

  // Sum up all journal entries
  journalEntries.forEach(entry => {
    if (upToDate && entry.date > upToDate) return;
    
    if (balances[entry.account_id]) {
      if (entry.type === 'DEBIT') {
        balances[entry.account_id].debit += entry.amount;
      } else {
        balances[entry.account_id].credit += entry.amount;
      }
    }
  });

  // Calculate ending balances based on Normal Balance
  Object.values(balances).forEach(acc => {
    // Assets & Expenses: Normal Balance is Debit
    if (['Aset', 'Beban'].includes(acc.type)) {
      acc.endingBalance = acc.debit - acc.credit;
    } 
    // Liabilities, Equity, Revenue: Normal Balance is Credit
    else {
      acc.endingBalance = acc.credit - acc.debit;
    }
  });

  return balances;
};

export const checkTrialBalanceIntegrity = (balances) => {
  let totalDebit = 0;
  let totalCredit = 0;

  Object.values(balances).forEach(acc => {
    totalDebit += acc.debit;
    totalCredit += acc.credit;
  });

  const diff = Math.abs(totalDebit - totalCredit);
  return {
    totalDebit,
    totalCredit,
    isBalanced: diff < 0.01,
    difference: diff
  };
};
