import { motion } from 'framer-motion';

export default function HudStatCard({ label, value, sub, icon: Icon, color, delay, hudKey }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="bento-card relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
          <h3 className="text-xl sm:text-2xl font-bold">{value}</h3>
        </div>
        <div className={`p-2 rounded-xl bg-background ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-xs font-medium ${color}`}>{sub}</span>
      </div>
    </motion.div>
  );
}
