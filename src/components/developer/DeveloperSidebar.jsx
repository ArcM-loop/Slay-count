import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  BarChart3, 
  Globe, 
  Puzzle, 
  ShieldCheck, 
  Cpu, 
  Terminal, 
  Activity, 
  Settings,
  Code2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/developer/overview' },
  { icon: Users, label: 'Manage Users', path: '/developer/users' },
  { icon: Database, label: 'Monitoring Data', path: '/developer/monitoring' },
  { icon: BarChart3, label: 'Analytics', path: '/developer/analytics' },
  { icon: Globe, label: 'Domains', path: '/developer/domains' },
  { icon: Puzzle, label: 'Integrations', path: '/developer/integrations' },
  { icon: ShieldCheck, label: 'Security Audit', path: '/developer/security' },
  { icon: Cpu, label: 'AI Agents', path: '/developer/ai' },
  { icon: Terminal, label: 'System Logs', path: '/developer/logs' },
  { icon: Activity, label: 'API Usage', path: '/developer/api-usage' },
  { icon: Settings, label: 'Technical Settings', path: '/developer/settings' },
];

export default function DeveloperSidebar({ collapsed, setCollapsed }) {
  return (
    <aside 
      className={`fixed top-0 left-0 h-full bg-[#161822] border-r border-white/5 transition-all duration-300 z-50 flex flex-col ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/5 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f3ff] to-[#c084fc] flex items-center justify-center flex-shrink-0 shadow-glow-cyan">
            <Code2 className="text-[#0f1117] w-6 h-6" />
          </div>
          {!collapsed && (
            <span className="font-bold text-xl tracking-tight neon-text whitespace-nowrap">
              DevConsole
            </span>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
              ${isActive 
                ? 'bg-gradient-to-r from-[#00f3ff1a] to-transparent text-[#00f3ff] border border-[#00f3ff1a]' 
                : 'text-[#8b8fa3] hover:text-white hover:bg-white/5'}
            `}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
            {!collapsed && (
              <span className="font-medium text-sm">{item.label}</span>
            )}
            {!collapsed && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00f3ff] opacity-0 group-[.active]:opacity-100 transition-opacity" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-4 border-t border-white/5">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-3 rounded-xl bg-white/5 text-[#8b8fa3] hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
}
