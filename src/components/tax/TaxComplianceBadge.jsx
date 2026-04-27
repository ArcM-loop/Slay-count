import { motion } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getUpcomingDeadlines } from '@/logic/tax/calculator';

export default function TaxComplianceBadge({ compact = false }) {
  const deadlines = getUpcomingDeadlines();
  const urgentCount = deadlines.filter(d => d.isUrgent).length;
  const warningCount = deadlines.filter(d => d.isWarning && !d.isUrgent).length;

  if (compact) {
    return (
      <div className="relative">
        <Bell className="w-5 h-5 text-muted-foreground" />
        {(urgentCount + warningCount) > 0 && (
          <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center
            ${urgentCount > 0 ? 'bg-destructive text-white animate-pulse' : 'bg-warm-amber text-black'}`}>
            {urgentCount + warningCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold">Deadline Pajak</h4>
        {urgentCount > 0 && (
          <span className="ml-auto text-xs text-destructive font-bold animate-pulse">
            ⚠️ {urgentCount} MENDESAK
          </span>
        )}
      </div>

      {deadlines.slice(0, 4).map((d, i) => (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs
            ${d.isUrgent
              ? 'border-destructive/40 bg-destructive/10'
              : d.isWarning
              ? 'border-yellow-500/30 bg-yellow-500/10'
              : 'border-border bg-secondary/30'
            }`}
        >
          {d.isUrgent ? (
            <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
          ) : d.isWarning ? (
            <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate ${d.isUrgent ? 'text-destructive' : d.isWarning ? 'text-yellow-300' : 'text-foreground'}`}>
              {d.label}
            </p>
            <p className="text-muted-foreground truncate">{d.description}</p>
          </div>
          <div className={`flex-shrink-0 font-bold tabular-nums
            ${d.isUrgent ? 'text-destructive' : d.isWarning ? 'text-yellow-300' : 'text-muted-foreground'}`}>
            {d.daysLeft}h
          </div>
        </motion.div>
      ))}
    </div>
  );
}
