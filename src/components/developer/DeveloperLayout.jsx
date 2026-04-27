import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DeveloperSidebar from './DeveloperSidebar';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function DeveloperLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-[#0f1117] text-[#f0f0f5]">
      {/* Sidebar */}
      <DeveloperSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content Area */}
      <div 
        className={`transition-all duration-300 min-h-screen flex flex-col ${
          collapsed ? 'ml-20' : 'ml-72'
        }`}
      >
        {/* Topbar */}
        <header className="h-20 border-b border-white/5 bg-[#0f1117]/80 backdrop-blur-xl sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-6 flex-1">
            <div className="relative max-w-md w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5e72] group-focus-within:text-[#00f3ff] transition-colors" />
              <input 
                type="text" 
                placeholder="Search resources, logs, or users..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-[#00f3ff1a] focus:ring-1 focus:ring-[#00f3ff1a] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-xl hover:bg-white/5 text-[#8b8fa3] transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#ef4444] rounded-full border-2 border-[#0f1117]" />
            </button>
            
            <div className="h-8 w-px bg-white/10 mx-2" />

            <div className="flex items-center gap-3 pl-2 cursor-pointer group">
              <div className="text-right">
                <p className="text-sm font-semibold text-white group-hover:text-[#00f3ff] transition-colors line-clamp-1">
                  {user?.displayName || 'Developer'}
                </p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#00f3ff] opacity-80">
                  {role}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1c1f2e] border border-white/10 flex items-center justify-center group-hover:border-[#00f3ff/30] transition-all">
                <User size={20} className="text-[#8b8fa3] group-hover:text-[#00f3ff]" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-8 border-t border-white/5 text-center">
          <p className="text-xs text-[#5a5e72] font-medium tracking-wide">
            SlayCount Developer Console v4.2.0 • System Status: <span className="text-[#a3e635]">Operational</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
