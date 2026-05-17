/**
 * SLAYCOUNT CFO SWARM ORCHESTRATOR
 * Mengkoordinasikan kawanan agen analis untuk memberikan saran finansial tingkat tinggi.
 */

import { SwarmOrchestrator } from './orchestrator';
import { log } from '@/lib/logger'; // [CVE-6 Fixed by Herta]

export class CFOSwarmOrchestrator extends SwarmOrchestrator {
  /**
   * Menganalisis kondisi keuangan dan memberikan rekomendasi strategis
   */
  async ask(question, financialData) {
    log(`[CFO-Swarm] Analyzing question: "${question}"`);
    
    // Melepaskan agen-agen analis strategis
    const swarmResult = await this.execute({ question, ...financialData });

    // Merangkum hasil konsensus menjadi narasi CFO
    return this.synthesizeAdvice(swarmResult, question);
  }

  synthesizeAdvice(swarmResult, question) {
    const { confidenceScore, agentLogs, objections } = swarmResult;
    
    // Mencari insight dari masing-masing agen
    const insights = agentLogs.map(log => `[${log.agent}]: ${log.message}`).join('\n');
    
    let advice = `Berdasarkan analisis kawanan agen kami (Confidence: ${confidenceScore.toFixed(1)}%):\n\n`;
    
    // Menambahkan poin-poin dari agen
    agentLogs.forEach(log => {
      if (log.status === 'APPROVED' || log.status === 'WARNING') {
        advice += `• ${log.message}\n`;
      }
    });

    if (objections.length > 0) {
      advice += `\n⚠️ Peringatan Risiko:\n${objections.map(o => `  - ${o}`).join('\n')}`;
    }

    return advice;
  }
}

/**
 * STRATEGY AGENTS (The CFO's Council)
 */
export const RatioAnalystAgent = {
  name: 'RatioAnalyst',
  weight: 1,
  async run(payload) {
    const { income = 0, expense = 0 } = payload;
    const netProfitMargin = ((income - expense) / income) * 100;
    
    if (netProfitMargin < 10) {
      return { status: 'WARNING', message: `Margin laba bersih rendah (${netProfitMargin.toFixed(1)}%). Perlu efisiensi biaya.`, weight: 1 };
    }
    return { status: 'APPROVED', message: `Margin laba sehat di angka ${netProfitMargin.toFixed(1)}%.`, weight: 1 };
  }
};

export const CashFlowGuardianAgent = {
  name: 'CashFlowGuardian',
  weight: 1.5,
  async run(payload) {
    const { currentCash = 0, monthlyBurnRate = 0 } = payload;
    const runway = monthlyBurnRate > 0 ? currentCash / monthlyBurnRate : 99;

    if (runway < 3) {
      return { status: 'REJECTED', message: `KRITIS: Kas hanya cukup untuk ${runway.toFixed(1)} bulan ke depan. Tunda pengeluaran non-esensial!`, weight: 1.5 };
    }
    return { status: 'APPROVED', message: `Arus kas aman untuk ${runway.toFixed(1)} bulan ke depan.`, weight: 1.5 };
  }
};
