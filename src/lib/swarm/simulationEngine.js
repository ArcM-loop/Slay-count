/**
 * SLAYCOUNT SIMULATION SWARM (Butterfly Effect Engine)
 * Mensimulasikan dampak keputusan bisnis terhadap masa depan.
 */

import { log } from '@/lib/logger'; // [CVE-6 Fixed by Herta]

export class SimulationSwarm {
  constructor(agents = []) {
    this.agents = agents;
  }

  /**
   * Menjalankan simulasi skenario "What-If"
   * @param {Object} scenario - { type: 'HIRE_STAFF', value: 5, salary: 10000000 }
   * @param {Object} currentState - Data keuangan saat ini
   */
  async simulate(scenario, currentState) {
    log(`[Simulator] Running Scenario: ${scenario.type}...`);
    
    // Menjalankan simulasi paralel di antara kawanan agen
    const results = await Promise.all(
      this.agents.map(agent => agent.predict(scenario, currentState))
    );

    return this.compileProjection(results, currentState);
  }

  compileProjection(results, currentState) {
    let projectedCash = currentState.currentCash || 0;
    let projectedProfit = currentState.monthlyProfit || 0;
    let alerts = [];

    results.forEach(res => {
      projectedCash += res.cashImpact || 0;
      projectedProfit += res.profitImpact || 0;
      if (res.alert) alerts.push(`[${res.agent}]: ${res.alert}`);
    });

    return {
      scenario: results[0].scenarioName,
      projectedCash,
      projectedProfit,
      alerts,
      recommendation: projectedProfit > currentState.monthlyProfit ? 'REKOMENDASI: LANJUTKAN' : 'REKOMENDASI: TINJAU ULANG'
    };
  }
}

/**
 * SIMULATION AGENTS
 */
export const MarketElasticityAgent = {
  name: 'MarketElasticity',
  async predict(scenario, state) {
    if (scenario.type === 'RAISE_PRICE') {
      const dropInSales = scenario.value * 0.8; // Asumsi elastisitas 0.8
      const lossAmount = state.income * (dropInSales / 100);
      return {
        agent: this.name,
        profitImpact: -lossAmount,
        alert: `Kenaikan harga ${scenario.value}% berisiko menurunkan omzet sebesar ${dropInSales.toFixed(1)}% karena pelanggan pindah ke kompetitor.`,
        scenarioName: 'Kenaikan Harga'
      };
    }
    return { agent: this.name, profitImpact: 0 };
  }
};

export const OperationalBurnAgent = {
  name: 'OperationalBurn',
  async predict(scenario, state) {
    if (scenario.type === 'HIRE_STAFF') {
      const totalCost = scenario.value * (scenario.salary + 5000000); // Gaji + Biaya Operasional (Laptop/Meja)
      return {
        agent: this.name,
        cashImpact: -totalCost,
        profitImpact: -totalCost,
        alert: `Perekrutan ${scenario.value} orang membutuhkan kas awal besar untuk infrastruktur dan training.`,
        scenarioName: 'Ekspansi Tim'
      };
    }
    return { agent: this.name, cashImpact: 0 };
  }
};
