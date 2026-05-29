import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, Zap, Bot, Database, Landmark, AlertCircle, Cpu } from 'lucide-react';

export const SwarmOffice = ({ agents = [] }) => {
  const [activeAgents, setActiveAgents] = useState(new Set());
  const [activeAgentName, setActiveAgentName] = useState(null);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), text: '🛰️ Swarm Network initialized. 76 autonomous agents standing by...' }
  ]);
  const [verdict, setVerdict] = useState(null);

  useEffect(() => {
    const handleAgentActive = (e) => {
      const { agentName } = e.detail;
      setActiveAgentName(agentName);
      setActiveAgents(prev => {
        const next = new Set(prev);
        next.add(agentName);
        return next;
      });
      setLogs(prev => [
        { 
          time: new Date().toLocaleTimeString(), 
          text: `⚡ [ACTIVE] Agent "${agentName}" is auditing ledger compliance and fiscal integrity.` 
        },
        ...prev.slice(0, 15)
      ]);
      setVerdict(null);
    };

    const handleComplete = (e) => {
      const { result } = e.detail || {};
      setActiveAgentName(null);
      setActiveAgents(new Set());
      
      const isConsensusApproved = result?.isFinal !== false && (result?.confidenceScore === undefined || result.confidenceScore >= 80);

      setVerdict({
        status: isConsensusApproved ? 'SUCCESS' : 'WARNING',
        message: isConsensusApproved 
          ? 'Consensus Approved! Jurnal berhasil divalidasi dan diinjeksi secara atomik ke Buku Besar.' 
          : 'Arbitrage Required: Swarm mendeteksi ketidakwajaran atau memerlukan review manual.',
        score: result?.confidenceScore !== undefined ? Math.round(result.confidenceScore) : 100,
        objections: result?.objections || []
      });

      setLogs(prev => [
        { 
          time: new Date().toLocaleTimeString(), 
          text: isConsensusApproved 
            ? '✅ [COMPLETE] Consensus reached across all divisions. 100% Audit Cleared.' 
            : '⚠️ [WARNING] Consensus failed or objections raised during deep audit.' 
        },
        ...prev
      ]);
    };

    const handleError = (e) => {
      const { error } = e.detail || {};
      setActiveAgentName(null);
      setActiveAgents(new Set());
      setVerdict({
        status: 'ERROR',
        message: `System Failure: ${error || 'Unknown Swarm execution error'}`
      });
      setLogs(prev => [
        { time: new Date().toLocaleTimeString(), text: `❌ [ERROR] Swarm execution failed: ${error}` },
        ...prev
      ]);
    };

    const handleStart = () => {
      setVerdict(null);
      setActiveAgents(new Set());
      setLogs(prev => [
        { time: new Date().toLocaleTimeString(), text: '🚀 [LAUNCH] Swarm verification sequence initiated across 101 agents...' },
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
  }, []);

  // Group agents by division
  const groupedAgents = {
    Tax: agents.filter(a => a.division === 'Tax'),
    Audit: agents.filter(a => a.division === 'Audit'),
    CFO: agents.filter(a => a.division === 'CFO'),
    Core: agents.filter(a => a.division !== 'Tax' && a.division !== 'Audit' && a.division !== 'CFO')
  };

  const getDivisionColor = (div) => {
    switch (div) {
      case 'Tax': return 'border-emerald-500/20 text-emerald-400 bg-emerald-950/20';
      case 'Audit': return 'border-amber-500/20 text-amber-400 bg-amber-950/20';
      case 'CFO': return 'border-fuchsia-500/20 text-fuchsia-400 bg-fuchsia-950/20';
      default: return 'border-cyan-500/20 text-cyan-400 bg-cyan-950/20';
    }
  };

  const getDivisionGlow = (div) => {
    switch (div) {
      case 'Tax': return 'shadow-[0_0_15px_rgba(16,185,129,0.05)]';
      case 'Audit': return 'shadow-[0_0_15px_rgba(245,158,11,0.05)]';
      case 'CFO': return 'shadow-[0_0_15px_rgba(217,70,239,0.05)]';
      default: return 'shadow-[0_0_15px_rgba(6,182,212,0.05)]';
    }
  };

  const getDivisionIcon = (div) => {
    switch (div) {
      case 'Tax': return <Landmark className="w-4 h-4 text-emerald-400" />;
      case 'Audit': return <Shield className="w-4 h-4 text-amber-400" />;
      case 'CFO': return <Zap className="w-4 h-4 text-fuchsia-400" />;
      default: return <Database className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Dynamic Status / Verdict Panel */}
      <AnimatePresence>
        {verdict && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg backdrop-blur-xl ${
              verdict.status === 'ERROR' 
                ? 'bg-red-950/20 border-red-500/30 text-red-400' 
                : verdict.status === 'SUCCESS' 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex-shrink-0">
                {verdict.status === 'ERROR' ? <AlertCircle className="w-5 h-5 text-red-400" /> : <ShieldCheck className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-wider">
                  {verdict.status === 'ERROR' ? 'Swarm Audit Failure' : `Swarm Verdict: ${verdict.score}% Consensus`}
                </h4>
                <p className="text-xs opacity-90 mt-0.5">{verdict.message}</p>
                {verdict.objections?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {verdict.objections.slice(0, 3).map((obj, i) => (
                      <span key={i} className="text-[10px] bg-black/40 px-2 py-0.5 rounded border border-white/5 max-w-xs truncate">
                        {obj}
                      </span>
                    ))}
                    {verdict.objections.length > 3 && (
                      <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded border border-white/5">
                        +{verdict.objections.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {verdict.score !== undefined && (
              <span className="font-mono text-xl font-black bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-right sm:self-center self-start">
                {verdict.score}%
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(groupedAgents).map(([div, divAgents]) => (
          <div 
            key={div} 
            className={`bento-card border flex flex-col justify-between h-[360px] p-4 rounded-xl ${getDivisionColor(div)} ${getDivisionGlow(div)}`}
          >
            {/* Division Title */}
            <div className="flex items-center justify-between pb-2.5 border-b border-white/5 mb-3">
              <div className="flex items-center gap-2">
                {getDivisionIcon(div)}
                <span className="font-bold text-xs uppercase tracking-widest text-white">{div} Division</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-black/40 px-2 py-0.5 rounded border border-white/5">
                {divAgents.length} Agents
              </span>
            </div>

            {/* Scrollable grid of agents */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              <div className="grid grid-cols-1 gap-1.5">
                {divAgents.map(agent => {
                  const isActive = activeAgentName === agent.name;
                  return (
                    <motion.div
                      key={agent.id}
                      animate={isActive ? { scale: 1.02 } : { scale: 1 }}
                      className={`p-2 rounded-lg border flex items-center gap-2.5 transition-all
                        ${isActive 
                          ? 'bg-white/10 border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.15)] font-bold' 
                          : 'bg-black/20 border-white/5 hover:bg-black/35 hover:border-white/15 text-white/70'
                        }`}
                    >
                      <div className="relative flex-shrink-0">
                        {isActive ? (
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-600" />
                        )}
                        <div className={`absolute inset-0 w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                      </div>
                      <span className="text-[10.5px] truncate flex-1 leading-none">{agent.name}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Console Log */}
      <div className="bento-card bg-black/50 border border-white/5 p-4 rounded-xl font-mono text-[11px] h-[160px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2 text-muted-foreground">
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Swarm Execution Console Log
          </span>
          <span className="text-[9px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest animate-pulse">Running live</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar text-slate-300">
          {logs.map((log, index) => (
            <div key={index} className="flex gap-3 leading-relaxed">
              <span className="text-muted-foreground flex-shrink-0 select-none">{log.time}</span>
              <span className={log.text.includes('❌') ? 'text-red-400' : log.text.includes('✅') ? 'text-emerald-400' : 'text-slate-300'}>
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
