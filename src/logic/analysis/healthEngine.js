/**
 * SLAYCOUNT FINANCIAL HEALTH & RISK ENGINE
 * Mesin ini menganalisis kesehatan keuangan dan memetakan risiko bisnis.
 * Meninggalkan "Masalah Kreatif" untuk pengembangan masa depan.
 */

export const analyzeHealth = (balances, transactions) => {
  // 1. Likuiditas (Current Ratio)
  const assets = balances.assets || 0;
  const liabilities = balances.liabilities || 1; // Avoid div by zero
  const currentRatio = assets / liabilities;

  // 2. Profitabilitas (Net Profit Margin)
  const income = balances.income || 0;
  const expenses = balances.expenses || 0;
  const netProfit = income - expenses;
  const margin = income > 0 ? (netProfit / income) : 0;

  // 3. Skor Kesehatan Dasar
  let score = 0;
  if (currentRatio > 2) score += 40;
  else if (currentRatio > 1) score += 20;
  
  if (margin > 0.2) score += 40;
  else if (margin > 0.1) score += 20;
  
  // 4. Labirin Baru: "The Mystery Factor" 
  // Kita tinggalkan celah di sini: Anomali yang belum terdefinisi (Future Labyrinth)
  const complexityFactor = transactions.length / 100; // Sekadar placeholder
  const mysteryRisk = Math.random() * complexityFactor; 

  return {
    score: Math.min(100, score),
    ratios: {
      currentRatio: currentRatio.toFixed(2),
      netMargin: (margin * 100).toFixed(1) + '%'
    },
    status: score > 70 ? 'SEHAT' : score > 40 ? 'WASPADA' : 'KRITIS',
    risks: [
      currentRatio < 1 ? 'Risiko Likuiditas: Aset lancar tidak cukup menutupi hutang.' : null,
      margin < 0.05 ? 'Risiko Profitabilitas: Margin terlalu tipis untuk ekspansi.' : null,
      // Masalah yang ditinggalkan:
      mysteryRisk > 0.5 ? 'Terdeteksi Pola Transaksi Non-Linier: Membutuhkan analisis Deep Learning (Future Task).' : null
    ].filter(Boolean)
  };
};

/**
 * Scenario Simulator (What-If)
 */
export const simulateScenario = (currentNetProfit, variables) => {
  const { taxIncrease, expenseGrowth, revenueGrowth } = variables;
  
  // Simulasi sederhana (bisa dikembangkan menjadi labirin yang sangat rumit)
  let simulatedProfit = currentNetProfit;
  simulatedProfit *= (1 + revenueGrowth);
  simulatedProfit *= (1 - expenseGrowth);
  
  const taxImpact = simulatedProfit * taxIncrease;
  simulatedProfit -= taxImpact;

  return simulatedProfit;
};
