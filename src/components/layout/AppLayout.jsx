import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useBusiness } from '@/lib/BusinessContext';
import {
  LayoutDashboard, ArrowLeftRight, BookOpen, BarChart3, ShieldCheck, Settings,
  ChevronDown, Plus, Zap, Menu, X, RotateCcw, Landmark, BookOpenCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddTransactionModal from '@/components/transactions/AddTransactionModal';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, emoji: '🏠' },
  { path: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight, emoji: '💳' },
  { path: '/akun', label: 'COA', icon: BookOpen, emoji: '📚' },
  { path: '/laporan', label: 'Laporan', icon: BarChart3, emoji: '📊' },
  { path: '/validasi', label: 'Validasi', icon: ShieldCheck, emoji: '✅' },
  { path: '/siklus', label: 'Siklus', icon: RotateCcw, emoji: '♻️' },
  { path: '/purchase-order', label: 'Purchase Order', icon: BookOpen, emoji: '📦' },
  { path: '/tax', label: 'Tax Center', icon: Landmark, emoji: '🏛️' },
  { path: '/ai-dashboard', label: 'Biyo AI', icon: Zap, emoji: '🤖' },
  { path: '/pengaturan', label: 'Pengaturan', icon: Settings, emoji: '⚙️' },
];

export default function AppLayout() {
  const location = useLocation();
  const { activeBusiness, businesses, setActiveBusiness } = useBusiness();
  const [showAddTx, setShowAddTx] = useState(false);
  const [showBusinessMenu, setShowBusinessMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-jakarta">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border
        transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center glow-blue">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg gradient-text-blue leading-none">Slay Count</h1>
              <p className="text-xs text-muted-foreground">AI Finance ✨</p>
            </div>
          </div>

          {/* Business Switcher */}
          <div className="mb-6 relative">
            <button
              onClick={() => setShowBusinessMenu(!showBusinessMenu)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-[10px] bg-gradient-to-br from-neon-purple to-[#4a00e0] shadow-[inset_0px_2px_4px_rgba(255,255,255,0.5),inset_0px_-3px_5px_rgba(0,0,0,0.4),0px_4px_12px_rgba(157,0,255,0.3)] border border-white/20">
                <span className="text-sm drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">🏢</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {activeBusiness?.name || 'Pilih Bisnis'}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showBusinessMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showBusinessMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute top-full left-0 right-0 mt-1 glass rounded-xl p-1 z-50"
                >
                  {businesses.map(b => (
                    <button
                      key={b.id}
                      onClick={() => { setActiveBusiness(b); setShowBusinessMenu(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                        ${b.id === activeBusiness?.id ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-secondary'}`}
                    >
                      {b.name}
                    </button>
                  ))}
                  <Link
                    to="/pengaturan"
                    onClick={() => setShowBusinessMenu(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors mt-1 border-t border-border pt-2"
                  >
                    <Plus className="w-3 h-3" /> Tambah Bisnis
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nav - Scrollable Area */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
            {NAV_ITEMS.map(({ path, label, emoji }) => {
              const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-sm font-medium
                    ${isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 glow-blue'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                    }`}
                >
                  <div className={`
                    relative flex items-center justify-center w-8 h-8 rounded-[10px] transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-br from-[#00f3ff] to-[#0051ff] shadow-[inset_0px_2px_4px_rgba(255,255,255,0.6),inset_0px_-3px_5px_rgba(0,0,0,0.4),0px_4px_12px_rgba(0,243,255,0.4)] border border-white/30' 
                      : 'bg-gradient-to-br from-sidebar-accent to-background shadow-[inset_0px_2px_3px_rgba(255,255,255,0.1),inset_0px_-2px_4px_rgba(0,0,0,0.4),0px_3px_6px_rgba(0,0,0,0.2)] border border-white/5 group-hover:shadow-[inset_0px_2px_4px_rgba(255,255,255,0.2),inset_0px_-2px_4px_rgba(0,0,0,0.4),0px_4px_8px_rgba(0,0,0,0.4)]'
                    }
                  `}>
                    <span className={`text-sm transition-transform duration-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{emoji}</span>
                  </div>
                  {label}
                  {isActive && (
                    <motion.div layoutId="nav-indicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#00f3ff]" />
                  )}
                </Link>
              );
            })}
          </nav>


          {/* Bottom */}
          <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-neon-purple/10 border border-primary/20">
            <p className="text-xs text-muted-foreground">✨ Powered by AI</p>
            <p className="text-xs font-medium text-primary mt-0.5">Slay Count v1.0</p>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-secondary">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-bold gradient-text-blue">Slay Count</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating Action Button — Cyan Pulse */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Pulse rings */}
        <motion.span
          className="absolute inset-0 rounded-2xl"
          animate={{ scale: [1, 1.5, 1.8], opacity: [0.5, 0.2, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
          style={{ background: 'radial-gradient(circle, #00f3ff40, transparent)', pointerEvents: 'none' }}
        />
        <motion.span
          className="absolute inset-0 rounded-2xl"
          animate={{ scale: [1, 1.3, 1.6], opacity: [0.4, 0.15, 0] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.4, ease: 'easeOut' }}
          style={{ background: 'radial-gradient(circle, #00f3ff30, transparent)', pointerEvents: 'none' }}
        />
        <motion.button
          onClick={() => setShowAddTx(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-neon-purple
            flex items-center justify-center text-primary-foreground"
          style={{ boxShadow: '0 0 20px #00f3ff60, 0 4px 24px rgba(0,0,0,0.4)' }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
        {/* HUD label */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.5 }}
          className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap pointer-events-none"
        >
          <span className="font-mono text-[10px] text-primary/60 tracking-widest">READY_FOR_NEW_ENTRY</span>
        </motion.div>
      </div>

      <AddTransactionModal open={showAddTx} onClose={() => setShowAddTx(false)} />

    </div>
  );
}