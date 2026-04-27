import React from 'react';
import { Construction } from 'lucide-react';

export default function DevPlaceholderPage({ title, description }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold neon-text">{title}</h1>
        <p className="text-[#8b8fa3]">{description || 'This module is currently under development.'}</p>
      </div>

      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 rounded-3xl bg-[#fb923c]/10 flex items-center justify-center text-[#fb923c] mb-6 shadow-glow-purple/20">
          <Construction size={48} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Module Under Construction</h2>
        <p className="text-[#8b8fa3] max-w-md mx-auto leading-relaxed">
          The engineering team is currently building the {title} interface. 
          Check the system logs for implementation progress or contribute via the internal repo.
        </p>
        <div className="mt-10 flex gap-4">
          <button className="btn btn-primary px-8">Read Specs</button>
          <button className="btn btn-secondary px-8">Contact Engineering</button>
        </div>
      </div>
    </div>
  );
}
