import { useState } from 'react';
import { CFOSwarmOrchestrator, RatioAnalystAgent, CashFlowGuardianAgent } from '@/lib/swarm/cfoOrchestrator';
import { useQuery } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';

/**
 * HOOK: useCFOSwarm
 * Menghubungkan UI Chatbot dengan Swarm Intelligence.
 */
export function useCFOSwarm() {
  const { activeBusiness } = useBusiness();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Ambil data finansial terbaru untuk konteks swarm
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id }),
    enabled: !!activeBusiness,
  });

  const askCFO = async (question) => {
    setIsAnalyzing(true);
    try {
      // 1. Ekstrak data mentah untuk agen
      const income = transactions.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
      const expense = transactions.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);
      const currentCash = income - expense; // Simplifikasi untuk demo
      const monthlyBurnRate = expense / 3; // Asumsi rata-rata 3 bulan

      const financialData = { income, expense, currentCash, monthlyBurnRate };

      // 2. Inisialisasi Swarm
      const cfoSwarm = new CFOSwarmOrchestrator([RatioAnalystAgent, CashFlowGuardianAgent]);

      // 3. Eksekusi Kawanan Agen
      const advice = await cfoSwarm.ask(question, financialData);

      return advice;
    } catch (error) {
      return `Maaf, kawanan agen kami mengalami gangguan: ${error.message}`;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { askCFO, isAnalyzing };
}
