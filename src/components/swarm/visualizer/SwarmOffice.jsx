import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, ArrowLeft, ArrowRight, FastForward, Cpu, Bot, 
  Landmark, Shield, Zap, Database, Brain, ShieldCheck, AlertCircle, Sparkles, History
} from 'lucide-react';

const STAGES = [
  {
    id: 0,
    title: "Swarm Idle Mode",
    description: "Sistem Swarm MiroFish-v3 sedang bersiap. Menunggu nota baru untuk divalidasi...",
    activeDivision: null,
    activeAgent: null,
    dialogue: null,
    logs: [
      "🛰️ Swarm Network initialized. 76 autonomous agents standing by in idle mode...",
      "⚙️ Operations Center fully operational. Ready for secure ledger injection."
    ]
  },
  {
    id: 1,
    title: "1. Data Ingestion & Matching",
    description: "Tax Scout & Audit Specialist memotong nota, mencocokkan Purchase Order (PO), dan mengekstrak nominal...",
    activeDivision: "Tax",
    activeAgent: "Tax Scout",
    dialogue: "Tax Scout: 'Hasil Pendapatan Rp 2.000.000 terdeteksi. Mulai ekstraksi data...'",
    logs: [
      "🚀 [LAUNCH] Swarm verification sequence initiated across 101 agents...",
      "⚡ [ACTIVE] Agent 'Tax Scout' is checking the transaction metadata...",
      "🔍 [PO MATCH] Audit Specialist matches Transaction to PO #9910. 100% matched."
    ]
  },
  {
    id: 2,
    title: "2. Forensic Pattern Analysis",
    description: "Benford Stat Agent & Fraud Hunter mengaudit integritas angka untuk mendeteksi manipulasi data...",
    activeDivision: "Audit",
    activeAgent: "Benford Stat",
    dialogue: "Benford Stat: 'Pola angka normal. Tingkat deviasi 0.02%. Tidak ada indikasi kecurangan.'",
    logs: [
      "🛡️ [FORENSIC] Fraud Hunter running vendor kickback and ghost vendor check...",
      "📈 [BENFORD] Benford Stat Agent verifies digit distribution is clean. Fraud probability: <0.01%."
    ]
  },
  {
    id: 3,
    title: "3. Tax Code Determination",
    description: "VAT Master & UU HPP Scout menganalisis regulasi pajak (PPN & PPh) sesuai hukum terbaru Indonesia...",
    activeDivision: "Tax",
    activeAgent: "VAT Master",
    dialogue: "VAT Master: 'Pemasukan usaha terdeteksi. PPN Keluaran 11% dialokasikan dengan benar.'",
    logs: [
      "🏛️ [TAX] UU HPP Scout checking tax bracket conformity with Law HPP 2022...",
      "💳 [VAT] VAT Master calculates VAT Output as 11% (Rp 220.000) mapped directly."
    ]
  },
  {
    id: 4,
    title: "4. CFO Financial Impact",
    description: "Recession Survivor & Budget Guard menyimulasikan dampak kas ini terhadap EBITDA & anggaran...",
    activeDivision: "CFO",
    activeAgent: "CFO Analyst",
    dialogue: "CFO Analyst: 'EBITDA terproyeksi naik +0.15%. Alokasi likuiditas berada dalam zona aman.'",
    logs: [
      "🔥 [CFO] CFO Analyst simulating macro impact and working capital optimization...",
      "💰 [BUDGET] Budget Guard confirms transaction does not violate department expense ceilings."
    ]
  },
  {
    id: 5,
    title: "5. Consensus & Injection",
    description: "Consensus Arbitrator mengumpulkan suara akhir dan menyuntikkan entri jurnal ganda secara atomik...",
    activeDivision: "Core",
    activeAgent: "Consensus Arbitrator",
    dialogue: "Consensus Arbitrator: 'Konsensus 100% tercapai! Menyuntikkan Dr. Kas & Cr. Pendapatan Usaha!'",
    logs: [
      "🗳️ [CONSENSUS] Consensus Arbitrator gathered votes. Verdict: APPROVED with 100% confidence.",
      "📝 [LEDGER] Core Ledger writes debit to Kas and credit to Pendapatan Usaha.",
      "✅ [COMPLETE] Consensus reached across all divisions. 100% Audit Cleared and locked securely!"
    ]
  }
];

export const SwarmOffice = ({ agents = [] }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [activeAgents, setActiveAgents] = useState(new Set());
  const [activeAgentName, setActiveAgentName] = useState(null);
  const [liveLogs, setLiveLogs] = useState([]);
  const [verdict, setVerdict] = useState(null);
  const consoleEndRef = useRef(null);

  // Playback timer
  useEffect(() => {
    let interval = null;
    if (isPlaying && !isLiveMode) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= STAGES.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isLiveMode]);

  // Listen to real-time swarm events from backend/ledger engine
  useEffect(() => {
    const handleStart = () => {
      setIsLiveMode(true);
      setIsPlaying(false);
      setCurrentStep(1);
      setVerdict(null);
      setActiveAgents(new Set());
      setLiveLogs([
        { time: new Date().toLocaleTimeString(), text: "🚀 [LAUNCH] Live Swarm verification sequence initiated across 101 agents..." }
      ]);
    };

    const handleAgentActive = (e) => {
      const { agentName } = e.detail;
      setIsLiveMode(true);
      setActiveAgentName(agentName);
      setActiveAgents(prev => {
        const next = new Set(prev);
        next.add(agentName);
        return next;
      });

      // Dynamically advance steps based on which agent division is active
      const agentObj = agents.find(a => a.name === agentName);
      if (agentObj) {
        if (agentObj.division === 'Tax' && currentStep < 3) {
          setCurrentStep(3);
        } else if (agentObj.division === 'Audit' && currentStep < 2) {
          setCurrentStep(2);
        } else if (agentObj.division === 'CFO' && currentStep < 4) {
          setCurrentStep(4);
        }
      }

      setLiveLogs(prev => [
        { 
          time: new Date().toLocaleTimeString(), 
          text: `⚡ [ACTIVE] Agent "${agentName}" is auditing ledger compliance and fiscal integrity.` 
        },
        ...prev.slice(0, 20)
      ]);
    };

    const handleComplete = (e) => {
      const { result } = e.detail || {};
      setIsLiveMode(true);
      setActiveAgentName(null);
      setCurrentStep(5);
      
      const isApproved = result?.isFinal !== false && (result?.confidenceScore === undefined || result.confidenceScore >= 80);

      setVerdict({
        status: isApproved ? 'SUCCESS' : 'WARNING',
        message: isApproved 
          ? 'Consensus Approved! Jurnal berhasil divalidasi dan diinjeksi secara atomik ke Buku Besar.' 
          : 'Arbitrage Required: Swarm mendeteksi ketidakwajaran atau memerlukan review manual.',
        score: result?.confidenceScore !== undefined ? Math.round(result.confidenceScore) : 100,
        objections: result?.objections || []
      });

      setLiveLogs(prev => [
        { 
          time: new Date().toLocaleTimeString(), 
          text: isApproved 
            ? '✅ [COMPLETE] Consensus reached across all divisions. 100% Audit Cleared.' 
            : '⚠️ [WARNING] Consensus failed or objections raised during deep audit.' 
        },
        ...prev
      ]);
    };

    const handleError = (e) => {
      const { error } = e.detail || {};
      setIsLiveMode(true);
      setActiveAgentName(null);
      setVerdict({
        status: 'ERROR',
        message: `System Failure: ${error || 'Unknown Swarm execution error'}`
      });
      setLiveLogs(prev => [
        { time: new Date().toLocaleTimeString(), text: `❌ [ERROR] Swarm execution failed: ${error}` },
        ...prev
      ]);
    };

    window.addEventListener('swarm:start', handleStart);
    window.addEventListener('swarm:agent_active', handleAgentActive);
    window.addEventListener('swarm:complete', handleComplete);
    window.addEventListener('swarm:error', handleError);
    
    return () => {
      window.removeEventListener('swarm:start', handleStart);
      window.removeEventListener('swarm:agent_active', handleAgentActive);
      window.removeEventListener('swarm:complete', handleComplete);
      window.removeEventListener('swarm:error', handleError);
    };
  }, [agents, currentStep]);

  // Scroll console log to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentStep, liveLogs]);

  // Aggregate logs up to current step in time-travel mode
  const currentLogs = useMemo(() => {
    if (isLiveMode) return liveLogs;
    
    const aggregated = [];
    for (let i = 0; i <= currentStep; i++) {
      const stage = STAGES[i];
      stage.logs.forEach((logText, index) => {
        aggregated.push({
          time: `09:31:${(i * 10 + index).toString().padStart(2, '0')} AM`,
          text: logText
        });
      });
    }
    return aggregated;
  }, [currentStep, isLiveMode, liveLogs]);

  const activeStage = STAGES[currentStep];

  // Group agents by division
  const groupedAgents = {
    Tax: agents.filter(a => a.division === 'Tax'),
    Audit: agents.filter(a => a.division === 'Audit'),
    CFO: agents.filter(a => a.division === 'CFO'),
    Core: agents.filter(a => a.division !== 'Tax' && a.division !== 'Audit' && a.division !== 'CFO')
  };

  const getDivisionStyles = (div, isActive) => {
    const activeClass = isActive ? 'scale-[1.01] border-opacity-100 shadow-lg' : 'opacity-70 border-opacity-20';
    switch (div) {
      case 'Tax': 
        return {
          cardClass: `border-emerald-500/30 text-emerald-400 bg-emerald-950/10 ${activeClass}`,
          badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          glowClass: isActive ? 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' : '',
          icon: <Landmark className="w-4 h-4 text-emerald-400" />
        };
      case 'Audit': 
        return {
          cardClass: `border-amber-500/30 text-amber-400 bg-amber-950/10 ${activeClass}`,
          badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          glowClass: isActive ? 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' : '',
          icon: <Shield className="w-4 h-4 text-amber-400" />
        };
      case 'CFO': 
        return {
          cardClass: `border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-950/10 ${activeClass}`,
          badgeClass: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
          glowClass: isActive ? 'shadow-[0_0_20px_rgba(217,70,239,0.15)]' : '',
          icon: <Zap className="w-4 h-4 text-fuchsia-400" />
        };
      default: 
        return {
          cardClass: `border-cyan-500/30 text-cyan-400 bg-cyan-950/10 ${activeClass}`,
          badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
          glowClass: isActive ? 'shadow-[0_0_20px_rgba(6,182,212,0.15)]' : '',
          icon: <Database className="w-4 h-4 text-cyan-400" />
        };
    }
  };

  return (
    <div className="space-y-4 w-full relative">
      {/* Top Banner Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            {isLiveMode ? "🛰️ Live Swarm Sync Active" : "🎮 Swarm Playback & Sandbox"}
          </span>
          {isLiveMode && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </div>

        {/* Dynamic Sandbox Selector */}
        {!isLiveMode ? (
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {STAGES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentStep(s.id);
                  setIsPlaying(false);
                }}
                className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${
                  currentStep === s.id 
                    ? 'bg-primary/20 text-primary border border-primary/30 font-bold' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                S{s.id}
              </button>
            ))}
          </div>
        ) : (
          <button 
            onClick={() => setIsLiveMode(false)}
            className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded border border-slate-700 hover:text-white transition-colors"
          >
            Masuk Sandbox Mode (Playback)
          </button>
        )}
      </div>

      {/* Cybernetic Swarm Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {Object.entries(groupedAgents).map(([div, divAgents]) => {
          const isDivActive = activeStage.activeDivision === div;
          const styles = getDivisionStyles(div, isDivActive);
          
          return (
            <div 
              key={div} 
              className={`bento-card border flex flex-col justify-between h-[380px] p-4 rounded-xl transition-all duration-500 ${styles.cardClass} ${styles.glowClass}`}
            >
              {/* Division Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  {styles.icon}
                  <span className="font-bold text-xs uppercase tracking-widest text-white">{div} Division</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${styles.badgeClass}`}>
                  {divAgents.length} Agents
                </span>
              </div>

              {/* Animated Agent Orbs */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                  {divAgents.slice(0, 14).map(agent => {
                    const isAgentActive = (isLiveMode && activeAgentName === agent.name) || (!isLiveMode && activeStage.activeAgent === agent.name);
                    
                    return (
                      <motion.div
                        key={agent.id}
                        animate={isAgentActive ? { 
                          scale: 1.05,
                          borderColor: 'rgba(255,255,255,0.4)',
                        } : { scale: 1 }}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center relative transition-all duration-300 group cursor-pointer overflow-hidden
                          ${isAgentActive 
                            ? 'bg-white/10 border-white/20 text-white shadow-lg shadow-white/5' 
                            : 'bg-black/30 border-white/5 hover:border-white/15 text-white/50'
                          }`}
                      >
                        {/* Glow particle inside active agent */}
                        {isAgentActive && (
                          <span className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-pulse" />
                        )}

                        {/* Pixel Art Bot Node */}
                        <div className="relative mb-1.5 mt-1">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300
                            ${isAgentActive 
                              ? 'bg-primary/20 border-primary shadow-[0_0_10px_rgba(0,243,255,0.5)]' 
                              : 'bg-slate-900 border-white/10 group-hover:border-white/20'
                            }`}
                          >
                            <Bot className={`w-4 h-4 transition-colors ${isAgentActive ? 'text-primary' : 'text-slate-500'}`} />
                          </div>
                          {isAgentActive && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
                            </span>
                          )}
                        </div>

                        <span className="text-[9.5px] truncate w-full font-medium leading-none">{agent.name}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Dialogue Speech Bubble Area */}
      <AnimatePresence mode="wait">
        {activeStage.dialogue && (
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="p-4 rounded-xl border border-primary/20 bg-slate-900/80 backdrop-blur-xl shadow-lg relative overflow-hidden"
          >
            {/* Cyberpunk corner brackets */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center animate-pulse">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h5 className="text-[10px] font-mono text-primary uppercase tracking-widest font-bold">Active Swarm Dialogue</h5>
                <p className="text-sm font-semibold text-white leading-relaxed mt-0.5">
                  "{activeStage.dialogue}"
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time-Travel Debugger (Playback Controller Deck) */}
      <div className="bento-card border border-slate-800 bg-slate-900/40 p-4 rounded-xl flex flex-col md:flex-row items-center gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              setCurrentStep(0);
              setIsPlaying(false);
              setIsLiveMode(false);
            }}
            disabled={currentStep === 0}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
            title="Mulai Ulang dari Awal"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => {
              setCurrentStep(prev => Math.max(0, prev - 1));
              setIsPlaying(false);
              setIsLiveMode(false);
            }}
            disabled={currentStep === 0}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Langkah Sebelumnya (Undo)"
          >
            <ArrowLeft className="w-4 h-4" /> Undo
          </button>

          <button
            onClick={() => {
              setIsPlaying(!isPlaying);
              setIsLiveMode(false);
            }}
            className={`p-2 px-4 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition-all duration-300
              ${isPlaying 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                : 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
              }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-amber-400" /> PAUSE
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-primary" /> PLAY AUTO
              </>
            )}
          </button>

          <button
            onClick={() => {
              setCurrentStep(prev => Math.min(STAGES.length - 1, prev + 1));
              setIsPlaying(false);
              setIsLiveMode(false);
            }}
            disabled={currentStep === STAGES.length - 1}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Langkah Berikutnya"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setCurrentStep(STAGES.length - 1);
              setIsPlaying(false);
              setIsLiveMode(false);
            }}
            disabled={currentStep === STAGES.length - 1}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
            title="Loncat ke Konsensus Akhir"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Timeline Range Slider */}
        <div className="flex-1 w-full space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>START: IDLE</span>
            <span className="text-primary font-bold">{activeStage.title}</span>
            <span>END: SECURE COMMIT</span>
          </div>
          <input
            type="range"
            min="0"
            max={STAGES.length - 1}
            value={currentStep}
            onChange={(e) => {
              setCurrentStep(parseInt(e.target.value));
              setIsPlaying(false);
              setIsLiveMode(false);
            }}
            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-primary border border-slate-800"
          />
          <p className="text-[11px] text-slate-400 italic leading-relaxed pt-1 select-none">
            {activeStage.description}
          </p>
        </div>
      </div>

      {/* Dynamic Status / Verdict Panel */}
      <AnimatePresence>
        {(verdict || currentStep === 5) && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg backdrop-blur-xl
              ${verdict?.status === 'ERROR' 
                ? 'bg-red-950/20 border-red-500/30 text-red-400 shadow-red-950/20' 
                : (verdict?.status === 'SUCCESS' || !verdict) 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400 shadow-emerald-950/20' 
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-400 shadow-amber-950/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex-shrink-0">
                {verdict?.status === 'ERROR' ? <AlertCircle className="w-5 h-5 text-red-400" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {verdict?.status === 'ERROR' ? 'Swarm Audit Failure' : `Swarm Verdict: ${verdict?.score || 100}% Consensus`}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">
                  {verdict?.message || "Consensus Approved! Jurnal berhasil divalidasi dan diinjeksi secara atomik ke Buku Besar."}
                </p>
              </div>
            </div>
            <span className="font-mono text-xl font-black bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-right sm:self-center self-start text-emerald-400">
              {verdict?.score || 100}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Console Log */}
      <div className="bento-card bg-black/60 border border-slate-900 p-4 rounded-xl font-mono text-[11px] h-[180px] overflow-hidden flex flex-col relative">
        <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2 text-muted-foreground">
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Swarm Execution Console Log
          </span>
          <span className="text-[9px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest animate-pulse">
            {isLiveMode ? "Running live" : "Sandbox history"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar text-slate-300">
          {currentLogs.map((log, index) => (
            <div key={index} className="flex gap-3 leading-relaxed">
              <span className="text-muted-foreground flex-shrink-0 select-none">{log.time}</span>
              <span className={
                log.text.includes('❌') || log.text.includes('[ERROR]') ? 'text-red-400' : 
                log.text.includes('✅') || log.text.includes('[COMPLETE]') ? 'text-emerald-400' : 
                log.text.includes('🚀') || log.text.includes('[LAUNCH]') ? 'text-cyan-400' :
                'text-slate-300'
              }>
                {log.text}
              </span>
            </div>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
};
