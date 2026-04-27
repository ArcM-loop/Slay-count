import { motion } from 'framer-motion';
import { formatRupiah } from '@/lib/formatters';

export default function TaxSummaryCard({ label, amount, sub, color = 'cyan', icon, delay = 0 }) {
  const colorMap = {
    cyan: {
      glow: 'shadow-[0_0_20px_rgba(0,243,255,0.2)]',
      text: 'text-[#00f3ff]',
      border: 'border-[#00f3ff]/20',
      bg: 'bg-[#00f3ff]/5',
      dot: 'bg-[#00f3ff]',
    },
    red: {
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
      text: 'text-destructive',
      border: 'border-destructive/20',
      bg: 'bg-destructive/5',
      dot: 'bg-destructive',
    },
    lime: {
      glow: 'shadow-[0_0_20px_rgba(34,197,94,0.2)]',
      text: 'text-cyber-lime',
      border: 'border-cyber-lime/20',
      bg: 'bg-cyber-lime/5',
      dot: 'bg-cyber-lime',
    },
    purple: {
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]',
      text: 'text-neon-purple',
      border: 'border-neon-purple/20',
      bg: 'bg-neon-purple/5',
      dot: 'bg-neon-purple',
    },
  };

  const c = colorMap[color] || colorMap.cyan;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl p-5 border ${c.border} ${c.bg} ${c.glow} transition-all duration-300`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${c.dot} animate-pulse`} />
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text}`} style={color === 'cyan' ? { textShadow: '0 0 12px rgba(0,243,255,0.5)' } : {}}>
        {formatRupiah(amount)}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </motion.div>
  );
}