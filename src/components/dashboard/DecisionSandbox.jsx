import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimulationSwarm, MarketElasticityAgent, OperationalBurnAgent } from '@/lib/swarm/simulationEngine';
import { formatRupiah } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Zap, Users, TrendingUp, AlertTriangle, Play } from 'lucide-react';

export default function DecisionSandbox({ currentData }) {
  const [prediction, setPrediction] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async (scenario) => {
    setIsSimulating(true);
    setPrediction(null);
    
    // Inisialisasi Swarm Simulasi
    const swarm = new SimulationSwarm([MarketElasticityAgent, OperationalBurnAgent]);
    
    // Jalankan Simulasi
    setTimeout(async () => {
      const result = await swarm.simulate(scenario, currentData);
      setPrediction(result);
      setIsSimulating(false);
    }, 1500); // Simulasi delay untuk efek dramatis AI
  };

  return (
    <div className="bento-card space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          🦋 Butterfly Effect Simulator <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">Advanced AI</span>
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">Pilih keputusan bisnis untuk mensimulasikan efek berantai pada masa depan finansial Anda.</p>

      {/* Decision Options */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={() => runSimulation({ type: 'HIRE_STAFF', value: 3, salary: 15000000 })}
          className="flex flex-col h-auto py-4 gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 group"
        >
          <Users className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
          <div className="text-center">
            <p className="text-sm font-bold">Rekrut 3 Staf</p>
            <p className="text-[10px] text-muted-foreground">Senior Analyst</p>
          </div>
        </Button>

        <Button 
          variant="outline" 
          onClick={() => runSimulation({ type: 'RAISE_PRICE', value: 15 })}
          className="flex flex-col h-auto py-4 gap-2 border-cyber-lime/20 hover:border-cyber-lime hover:bg-cyber-lime/5 group"
        >
          <TrendingUp className="w-5 h-5 text-cyber-lime group-hover:scale-110 transition-transform" />
          <div className="text-center">
            <p className="text-sm font-bold">Naikkan Harga 15%</p>
            <p className="text-[10px] text-muted-foreground">Seluruh Produk</p>
          </div>
        </Button>
      </div>

      {/* Simulation Result */}
      <AnimatePresence mode="wait">
        {isSimulating && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="py-12 flex flex-col items-center justify-center space-y-4"
          >
            <div className="relative">
              <Zap className="w-10 h-10 text-primary animate-pulse" />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
              />
            </div>
            <p className="text-sm font-mono text-primary animate-pulse">Kawanan Agen sedang mensimulasikan masa depan...</p>
          </motion.div>
        )}

        {prediction && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-secondary/30 border border-border space-y-4"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-foreground">{prediction.scenario}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${prediction.projectedProfit > currentData.monthlyProfit ? 'bg-cyber-lime/10 text-cyber-lime' : 'bg-destructive/10 text-destructive'}`}>
                {prediction.recommendation}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-y border-border/50 py-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Estimasi Saldo Kas</p>
                <p className="text-lg font-black">{formatRupiah(prediction.projectedCash)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Laba Operasional</p>
                <p className={`text-lg font-black ${prediction.projectedProfit > currentData.monthlyProfit ? 'text-cyber-lime' : 'text-destructive'}`}>
                  {formatRupiah(prediction.projectedProfit)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-widest">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Analisis Ripple Effect:
              </p>
              {prediction.alerts.map((alert, i) => (
                <p key={i} className="text-[11px] leading-relaxed text-muted-foreground border-l-2 border-primary/30 pl-3 py-1">
                  {alert}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
