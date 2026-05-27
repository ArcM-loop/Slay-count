import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { visualizerStore } from '@/lib/swarm/visualizerStore';
import { Bot, Cpu, CheckCircle2, AlertCircle, FileSearch, Loader2 } from 'lucide-react';

export default function PixelVisualizer() {
  const [state, setState] = useState(visualizerStore.getState());

  useEffect(() => {
    const unsubscribe = visualizerStore.subscribe(setState);
    return () => unsubscribe();
  }, []);

  if (state.actionType === 'idle') return null; // Hide when idle to not clutter the screen, or you can return a sleeping bot

  const getAgentConfig = () => {
    switch (state.actionType) {
      case 'thinking':
        return { icon: <Loader2 className="w-6 h-6 animate-spin text-neon-purple" />, color: 'bg-neon-purple/20 border-neon-purple/50', character: '🤔' };
      case 'validating':
        return { icon: <FileSearch className="w-6 h-6 text-cyan-400 animate-pulse" />, color: 'bg-cyan-400/20 border-cyan-400/50', character: '🧐' };
      case 'success':
        return { icon: <CheckCircle2 className="w-6 h-6 text-cyber-lime" />, color: 'bg-cyber-lime/20 border-cyber-lime/50', character: '😎' };
      case 'error':
        return { icon: <AlertCircle className="w-6 h-6 text-destructive animate-bounce" />, color: 'bg-destructive/20 border-destructive/50', character: '😱' };
      default:
        return { icon: <Bot className="w-6 h-6 text-primary" />, color: 'bg-primary/20 border-primary/50', character: '🤖' };
    }
  };

  const config = getAgentConfig();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.8 }}
        className="fixed bottom-6 right-6 z-[9999] pointer-events-none"
      >
        <div className={`glass p-4 rounded-2xl border ${config.color} shadow-2xl flex items-center gap-4 max-w-sm backdrop-blur-xl relative overflow-hidden`}>
          
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

          {/* Pixel Character Container (Mocked with Emoji + CSS styling for pixel feel) */}
          <div className="relative">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl bg-black/40 border border-white/10 shadow-inner 
              ${state.actionType === 'thinking' ? 'animate-bounce' : ''}`}>
              <span style={{ imageRendering: 'pixelated' }}>{config.character}</span>
            </div>
            
            {/* Status Icon Badge */}
            <div className="absolute -bottom-2 -right-2 bg-black rounded-full p-1 border border-white/10">
              {config.icon}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1 flex items-center gap-1.5">
              <Cpu className="w-3 h-3" />
              {state.activeAgent || 'Swarm Node'}
            </p>
            <p className="text-sm font-medium text-white/90 leading-snug">
              {state.message}
            </p>
            
            {/* Progress Bar Mock */}
            {(state.actionType === 'thinking' || state.actionType === 'validating') && (
              <div className="h-1 w-full bg-black/50 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary w-1/2 animate-pulse rounded-full" style={{ animationDuration: '0.8s' }} />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
