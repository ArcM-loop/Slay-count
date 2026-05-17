/**
 * SLAYCOUNT SWARM ORCHESTRATOR (MiroFish-Engine)
 * ============================================
 * Mengelola kawanan agen mikro untuk mencapai konsensus akuntansi.
 * Terintegrasi dengan Gemini 3 Flash Dual-API Gateway.
 *
 * Implementasi MiroFish Logic:
 * 1. Seed Injection: Injeksi konteks transaksi sebagai 'benih' simulasi.
 * 2. Parallel Worlds: Menjalankan simulasi dampak di beberapa skenario.
 * 3. Debate Phase: Agen Tier 2 melakukan arbitrase terhadap keberatan Tier 1.
 * 4. Verdict: Keputusan akhir dengan Confidence Score & Audit Trail.
 */

import { callGemini, callLlama, callGPT } from './multiModelGateway';
import { callWorkerSwarm, callAuditorSwarm, callCFOSwarm, getSwarmUsageStats } from './geminiSwarmGateway';
import { ConsensusArbitrator } from './agents/meta/consensusArbitrator.js';

export class SwarmOrchestrator {
  constructor(agents = []) {
    this.agents = agents;
    this.workerAgents = agents.filter(a => (a.tier || 1) === 1);
    this.arbitratorAgents = agents.filter(a => a.tier === 2);
  }

  static ai = { callWorkerSwarm, callAuditorSwarm, callCFOSwarm, getSwarmUsageStats, callGemini, callLlama, callGPT };

  /**
   * Eksekusi MiroFish Swarm dengan Optimasi BATCH
   */
  async execute(payload, context = {}) {
    context.ai = SwarmOrchestrator.ai;
    context.timestamp = new Date().toISOString();
    
    console.log(`[MiroFish] Injecting Seed: ${payload.description || 'New Transaction'}`);
    
    // Grouping Agents by Model for Batching
    // We categorize based on agent name or tier as a fallback
    const geminiAgents = this.agents.filter(a => !a.model || a.model === 'gemini');
    const llamaAgents = this.agents.filter(a => a.model === 'llama' || a.name.includes('CFO') || a.tier === 2);
    const gptAgents = this.agents.filter(a => a.model === 'gpt' || a.name.includes('Audit') || a.name.includes('Fraud'));

    // Execute Batches in Parallel
    console.log(`[MiroFish] Executing Batch Swarm: ${geminiAgents.length} Gemini, ${llamaAgents.length} Llama, ${gptAgents.length} GPT agents.`);
    
    const [geminiResults, llamaResults, gptResults] = await Promise.all([
      this.runModelBatch('gemini', geminiAgents, payload, context),
      this.runModelBatch('llama', llamaAgents, payload, context),
      this.runModelBatch('gpt', gptAgents, payload, context)
    ]);

    const allResults = [...geminiResults, ...llamaResults, ...gptResults];
    let consensus = this.calculateConsensus(allResults);

    // 4. TIER 3: JUDICIAL ARBITRATION (Final Verdict)
    // Jika ada perdebatan atau keberatan, panggil Hakim Agung
    if (consensus.objections.length > 0) {
        console.log(`[MiroFish Backend] ⚖️ Entering Tier 3: Judicial Arbitration...`);
        const finalVerdict = await this.runArbitration(allResults, payload, context);
        if (finalVerdict) {
            consensus = {
                ...consensus,
                finalVerdict: finalVerdict.message,
                isFinal: finalVerdict.status === 'APPROVED',
                confidenceScore: finalVerdict.status === 'APPROVED' ? 100 : 0,
                arbitratorNote: finalVerdict.message
            };
        }
    }

    return {
      ...consensus,
      model: 'Hybrid Quad-Swarm (Batch Optimized)',
      engine: 'MiroFish-v3-Turbo-Enterprise'
    };
  }

  /**
   * Menjalankan Arbitrase Akhir oleh Tier 3 Meta-Agent di Backend
   */
  async runArbitration(agentLogs, payload, context) {
    const prompt = `
      BACKEND JUDICIAL ARBITRATION
      ============================
      TRANSAKSI: ${JSON.stringify(payload)}
      
      ANALISIS AGEN:
      ${JSON.stringify(agentLogs)}
      
      TUGAS:
      Sebagai Consensus Arbitrator Backend, berikan keputusan final yang mengikat.
      Prioritaskan keamanan fiskal dan kepatuhan hukum Indonesia.
      
      Format JSON:
      { "status": "APPROVED"|"REJECTED", "message": "Alasan hukum/akuntansi Anda..." }
    `;
    
    try {
        // Gunakan model terkuat untuk keputusan final di server
        return await context.ai.callGPT(prompt, { jsonMode: true });
    } catch (error) {
        console.error("[MiroFish Backend] Arbitration Error:", error);
        return null;
    }
  }

  /**
   * Menjalankan sekumpulan agen dalam SATU panggilan AI (Batching)
   */
  async runModelBatch(model, agents, payload, context) {
    if (agents.length === 0) return [];

    const agentList = agents.map(a => `- ${a.name}: ${a.description || 'Financial Analysis'}`).join('\n');
    
    const batchPrompt = `
      SlayCount Multi-Agent Swarm - ${model.toUpperCase()} BATCH EXECUTION
      
      KONTEKS TRANSAKSI:
      ${JSON.stringify(payload)}
      
      ANDA ADALAH SEKUMPULAN AGEN BERIKUT:
      ${agentList}
      
      TUGAS:
      Lakukan analisis untuk SETIAP agen di atas secara independen namun dalam satu respons.
      Berikan hasil dalam format JSON ARRAY:
      [
        { "agent": "NamaAgen", "status": "APPROVED"|"WARNING"|"REJECTED"|"ADVISORY", "message": "Penjelasan singkat", "weight": 1.0 },
        ...
      ]
    `;

    try {
      let response;
      if (model === 'llama') {
        response = await context.ai.callLlama(batchPrompt, { jsonMode: true });
      } else if (model === 'gpt') {
        response = await context.ai.callGPT(batchPrompt, { jsonMode: true });
      } else {
        response = await context.ai.callGemini(batchPrompt, { jsonMode: true });
      }

      // Handle common AI response structures
      const results = Array.isArray(response) ? response : (response.results || response.agents || []);
      return results.map(r => ({ 
        ...r, 
        agent: r.agent || 'Unknown',
        status: r.status || 'WARNING',
        weight: r.weight || 1 
      }));
    } catch (error) {
      console.error(`[MiroFish] Batch ${model} failed:`, error.message);
      return agents.map(a => ({ agent: a.name, status: 'ERROR', message: `Batch failed: ${error.message}` }));
    }
  }

  /**
   * Menghitung Konsensus Akhir
   */
  calculateConsensus(results) {
    let totalWeight = 0;
    let approvedWeight = 0;
    let objections = [];
    let findings = [];

    results.forEach(res => {
      const weight = res.weight || 1;
      if (weight === 0) return; // Biyo atau agen narasi tidak ikut voting

      totalWeight += weight;
      
      if (res.status === 'APPROVED' || res.status === 'APPROVED_WITH_CORRECTION' || res.status === 'WARNING' || res.status === 'ADVISORY') {
        approvedWeight += weight;
        if (res.message) findings.push(`${res.agent}: ${res.message}`);
        
        if (res.status === 'WARNING' || res.status === 'ADVISORY') {
          objections.push(`⚠️ ${res.agent}: ${res.message}`);
        }
      } else {
        objections.push(`🚫 ${res.agent}: ${res.message}`);
      }
    });

    const confidenceScore = totalWeight > 0 ? (approvedWeight / totalWeight) * 100 : 0;
    const isFinal = confidenceScore >= 80;

    return {
      isFinal,
      confidenceScore,
      objections,
      findings,
      timestamp: new Date().toISOString(),
      agentLogs: results
    };
  }

  /**
   * MiroFish Feature: Simulate "What-If" Worlds
   * Memungkinkan user melihat dampak jurnal sebelum di-commit.
   */
  async simulateWorlds(payload, context) {
    console.log('[MiroFish] Simulating Parallel Financial Worlds...');
    // Logika simulasi multi-outcome bisa ditambahkan di sini
    return this.execute(payload, { ...context, simulationMode: true });
  }
}
