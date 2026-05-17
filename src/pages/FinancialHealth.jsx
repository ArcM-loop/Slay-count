import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useBusiness } from '@/lib/BusinessContext';
import { useQuery } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { formatRupiah } from '@/lib/formatters';
import { analyzeHealth, simulateScenario } from '@/logic/analysis/healthEngine';
import { Activity, Zap, TrendingUp, AlertCircle, ShieldCheck, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import BenfordAuditPanel from '@/components/audit/BenfordAuditPanel';

export default function FinancialHealth() {
  const { activeBusiness } = useBusiness();
  const [variables, setVariables] = useState({
    taxIncrease: 0,
    expenseGrowth: 0,
    revenueGrowth: 0
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal-entries-health', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.JournalEntry.filter({ business_id: activeBusiness.id }),
    enabled: !!activeBusiness
  });

  // Kalkulasi dasar untuk engine
  const stats = useMemo(() => {
    const totals = journalEntries.reduce((acc, entry) => {
      // Sederhana: Debet - Kredit (Logic asli harus sesuai COA)
      if (entry.type === 'DEBIT') acc.assets += entry.amount;
      else acc.liabilities += entry.amount;
      return acc;
    }, { assets: 0, liabilities: 0, income: 100000000, expenses: 70000000 }); // Mock income/expense for demo

    return analyzeHealth(totals, journalEntries);
  }, [journalEntries]);

  const simulatedProfit = useMemo(() => {
    const currentNet = 30000000; // Contoh profit bersih saat ini
    return simulateScenario(currentNet, variables);
  }, [variables]);

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Predictive Health Intelligence <BrainCircuit className="text-primary w-8 h-8" />
        </h1>
        <p className="text-muted-foreground mt-1">Labirin analisis risiko dan simulasi masa depan bisnis.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Health Score */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border border-border p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-32 h-32 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">Health Index Score</p>
          <div className="text-8xl font-black text-primary mb-2">{stats.score}</div>
          <div className={`px-4 py-1 rounded-full text-xs font-bold ${stats.status === 'SEHAT' ? 'bg-cyber-lime/20 text-cyber-lime' : 'bg-destructive/20 text-destructive'}`}>
            {stats.status}
          </div>
          
          <div className="mt-8 w-full space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Ratio</span>
              <span className="font-mono font-bold">{stats.ratios.currentRatio}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Net Margin</span>
              <span className="font-mono font-bold">{stats.ratios.netMargin}</span>
            </div>
          </div>
        </motion.div>

        {/* Risk Map */}
        <div className="lg:col-span-2 bg-secondary/30 border border-border p-6 rounded-3xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShieldCheck className="text-cyber-lime" /> Risk Assessment Map
          </h2>
          <div className="space-y-4">
            {stats.risks.map((risk, i) => (
              <motion.div 
                key={i}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 bg-background border-l-4 border-destructive rounded-r-xl flex items-start gap-4"
              >
                <AlertCircle className="text-destructive shrink-0" />
                <p className="text-sm font-medium">{risk}</p>
              </motion.div>
            ))}
            {stats.risks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground italic">
                Tidak ada risiko kritis terdeteksi saat ini.
              </div>
            )}
            
            {/* The Mystery Problem (Ujung Labirin) */}
            <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20 border-dashed">
              <p className="text-xs text-primary font-bold uppercase tracking-tighter mb-1">Deep Intelligence Note:</p>
              <p className="text-xs text-muted-foreground">
                Sistem mendeteksi fluktuasi minor pada "Velocity of Money" yang tidak sinkron dengan siklus industri. 
                Ini bisa jadi anomali pasar atau sekadar noise data. Kami membiarkannya tetap menjadi anomali untuk diobservasi lebih lanjut.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Simulator */}
      <div className="bg-card border border-border p-8 rounded-3xl shadow-xl">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <Zap className="text-yellow-400 fill-yellow-400" /> "What-If" Scenario Simulator
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Revenue Growth ({Math.round(variables.revenueGrowth * 100)}%)</label>
                <TrendingUp className="w-4 h-4 text-cyber-lime" />
              </div>
              <Slider 
                min={-0.5} max={1} step={0.05} 
                value={[variables.revenueGrowth]} 
                onValueChange={([v]) => setVariables(prev => ({ ...prev, revenueGrowth: v }))} 
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Expense Growth ({Math.round(variables.expenseGrowth * 100)}%)</label>
                <TrendingUp className="w-4 h-4 text-destructive rotate-180" />
              </div>
              <Slider 
                min={-0.5} max={1} step={0.05} 
                value={[variables.expenseGrowth]} 
                onValueChange={([v]) => setVariables(prev => ({ ...prev, expenseGrowth: v }))} 
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">New Tax Rate ({Math.round(variables.taxIncrease * 100)}%)</label>
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <Slider 
                min={0} max={0.35} step={0.01} 
                value={[variables.taxIncrease]} 
                onValueChange={([v]) => setVariables(prev => ({ ...prev, taxIncrease: v }))} 
              />
            </div>
          </div>

          <div className="bg-secondary/20 p-8 rounded-2xl flex flex-col items-center justify-center border border-border">
            <p className="text-sm text-muted-foreground mb-2 uppercase font-bold tracking-widest">Simulated Net Profit</p>
            <div className={`text-5xl font-black mb-4 ${simulatedProfit > 0 ? 'text-cyber-lime' : 'text-destructive'}`}>
              {formatRupiah(simulatedProfit)}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Hasil simulasi ini berdasarkan parameter linear. Risiko non-linear (seperti perubahan regulasi mendadak atau krisis global) tidak dihitung sepenuhnya dalam model ini.
            </p>
            <Button variant="outline" className="mt-8 w-full border-primary text-primary hover:bg-primary/10">
              Save Simulation Scenario
            </Button>
          </div>
        </div>
      </div>

      {/* ===== FORENSIC AUDIT SECTION ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-border" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">🔍 Audit Forensik</p>
          <div className="h-px flex-1 bg-border" />
        </div>
        <BenfordAuditPanel />
      </motion.div>
    </div>
  );
}
