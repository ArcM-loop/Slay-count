import React, { useEffect, useRef, useState } from 'react';

/**
 * SLAYCOUNT SWARM OFFICE VISUALIZER
 * ================================
 * Menampilkan 79+ agen dalam lingkungan pixel art kantor.
 */

const TILE_SIZE = 16;
const SCALE = 3;

export const SwarmOffice = ({ agents = [], activeAgentId = null }) => {
  const canvasRef = useRef(null);
  const [officeState, setOfficeState] = useState({
    agents: [],
    ticks: 0
  });

  // Initialize Agents and Positions
  useEffect(() => {
    const initialAgents = agents.map((agent, index) => {
      // Logic pembagian kuadran berdasarkan divisi
      let startX = 2;
      let startY = 2;
      
      if (agent.division === 'Tax') { startX = 5; startY = 5; }
      else if (agent.division === 'Audit') { startX = 25; startY = 5; }
      else if (agent.division === 'CFO') { startX = 5; startY = 20; }
      else { startX = 25; startY = 20; }

      return {
        ...agent,
        id: agent.id || index,
        x: (startX + (index % 5)) * TILE_SIZE,
        y: (startY + Math.floor(index / 5)) * TILE_SIZE,
        state: 'IDLE', // IDLE, WALKING, TYPING, WARNING
        frame: 0
      };
    });
    
    setOfficeState(prev => ({ ...prev, agents: initialAgents }));
  }, [agents]);

  // Real-time Event Listener Bridge
  useEffect(() => {
    const handleAgentActive = (e) => {
      const { agentName } = e.detail;
      setOfficeState(prev => ({
        ...prev,
        agents: prev.agents.map(a => 
          a.name === agentName ? { ...a, state: 'TYPING', frame: (prev.ticks % 4) } : a
        )
      }));
    };

    const handleComplete = () => {
      setOfficeState(prev => ({
        ...prev,
        agents: prev.agents.map(a => ({ ...a, state: 'IDLE' }))
      }));
    };

    window.addEventListener('swarm:agent_active', handleAgentActive);
    window.addEventListener('swarm:complete', handleComplete);
    
    return () => {
      window.removeEventListener('swarm:agent_active', handleAgentActive);
      window.removeEventListener('swarm:complete', handleComplete);
    };
  }, []);

  // Main Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const spriteSheet = new Image();
    spriteSheet.src = '/assets/swarm/characters.png';

    let animationFrameId;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Floor (Placeholder pattern)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Agents
      officeState.agents.forEach(agent => {
        const isCurrent = agent.id === activeAgentId;
        
        // Simpel sprite drawing logic
        // characters.png biasanya 16x24 per frame
        ctx.drawImage(
          spriteSheet,
          agent.frame * 16, isCurrent ? 24 : 0, 16, 24, // source
          agent.x * SCALE, agent.y * SCALE, 16 * SCALE, 24 * SCALE // target
        );

        // Name Tag
        if (isCurrent) {
          ctx.fillStyle = '#00f3ff';
          ctx.font = '10px Inter';
          ctx.fillText(agent.name, (agent.x * SCALE), (agent.y * SCALE) - 5);
          
          // Glow effect for active agent
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00f3ff';
        } else {
          ctx.shadowBlur = 0;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    spriteSheet.onload = render;
    return () => cancelAnimationFrame(animationFrameId);
  }, [officeState, activeAgentId]);

  return (
    <div className="relative w-full h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur p-3 rounded-lg border border-cyan-500/30">
        <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-widest">Swarm Live Activity</h3>
        <p className="text-slate-400 text-xs mt-1">Monitoring 79+ Autonomous Specialized Agents</p>
      </div>
      
      <canvas 
        ref={canvasRef}
        width={800 * SCALE}
        height={500 * SCALE}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Division Labels Overlay */}
      <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2">
        <div className="border border-slate-800/30 flex items-start p-10"><span className="text-slate-700 font-black text-4xl opacity-20">TAX</span></div>
        <div className="border border-slate-800/30 flex items-start justify-end p-10"><span className="text-slate-700 font-black text-4xl opacity-20">AUDIT</span></div>
        <div className="border border-slate-800/30 flex items-end p-10"><span className="text-slate-700 font-black text-4xl opacity-20">CFO</span></div>
        <div className="border border-slate-800/30 flex items-end justify-end p-10"><span className="text-slate-700 font-black text-4xl opacity-20">CORE</span></div>
      </div>
    </div>
  );
};
