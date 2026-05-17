/**
 * THE CONSENSUS ARBITRATOR (TIER 3 - META AGENT)
 * =============================================
 * Peran: Hakim Agung MiroFish Swarm.
 * Tugas: Meninjau perdebatan antar agen dan mengambil keputusan akhir 
 * berdasarkan prinsip akuntansi konservatif (Prudence).
 */

export const ConsensusArbitrator = {
  name: "Consensus Arbitrator",
  division: "Meta",
  tier: 3, 
  model: "gpt", // Membutuhkan reasoning level tertinggi (GPT-4o atau Claude 3.5)
  description: "Menyelesaikan konflik antar agen dan memberikan vonis akhir yang prudent.",
  
  async analyze(transaction, context) {
    const { agentLogs } = context;
    if (!agentLogs || agentLogs.length === 0) return null;

    const objections = agentLogs.filter(log => log.status === 'REJECTED' || log.status === 'WARNING');
    const approvals = agentLogs.filter(log => log.status === 'APPROVED');

    // Jika tidak ada konflik, otomatis setuju
    if (objections.length === 0) {
      return {
        agent: this.name,
        status: "APPROVED",
        message: "Konsensus bulat tercapai oleh seluruh agen. Tidak ditemukan risiko material.",
        weight: 5.0
      };
    }

    // Jika ada konflik, lakukan arbitrase
    const conflictSummary = objections.map(o => `[${o.agent}]: ${o.message}`).join("\n");
    
    // Logika Meta-Reasoning (Ini akan diproses oleh LLM di Orchestrator)
    return {
      agent: this.name,
      status: "ARBITRATION_REQUIRED",
      message: `Ditemukan ${objections.length} keberatan. Memulai tinjauan yudisial terhadap konflik berikut:\n${conflictSummary}`,
      weight: 10.0, // Suara penentu
      principles: ["Prudence", "Substance Over Form", "Materiality"]
    };
  }
};
