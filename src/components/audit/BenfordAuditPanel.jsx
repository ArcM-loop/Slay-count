/**
 * BenfordAuditPanel.jsx
 * Panel visualisasi hasil analisis forensik Benford's Law.
 * Menampilkan bar chart perbandingan distribusi aktual vs harapan Benford.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBenfordAudit } from '@/hooks/useBenfordAudit';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { ShieldAlert, ScanSearch, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

export default function BenfordAuditPanel() {
  const { runAudit, result, isRunning, error, chartData } = useBenfordAudit();
  const [showDetails, setShowDetails] = useState(false);

  const riskInfo = result?.benford;
  const riskColor = riskInfo?.riskColor || '#6b7280';

  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Audit Forensik Benford's Law</h3>
            <p className="text-[10px] text-muted-foreground">Deteksi anomali statistik pada distribusi transaksi</p>
          </div>
        </div>

        <Button
          onClick={runAudit}
          disabled={isRunning}
          size="sm"
          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl h-8 text-xs gap-2"
          variant="ghost"
        >
          {isRunning ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Menganalisis...</>
          ) : (
            <><ScanSearch className="w-3 h-3" /> Jalankan Audit</>
          )}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Risk Badge */}
            <div 
              className="flex items-center justify-between p-3 rounded-xl border"
              style={{ 
                borderColor: riskColor + '40',
                backgroundColor: riskColor + '10' 
              }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: riskColor }}>
                  {riskInfo?.riskLabel || result.message}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {riskInfo?.riskDescription}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">MAD Score</p>
                <p className="text-xl font-black" style={{ color: riskColor }}>
                  {result.benford?.mad?.toFixed(4) || 'N/A'}
                </p>
              </div>
            </div>

            {/* Patterns Detected */}
            {riskInfo?.patterns?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                  Pola Kecurangan Terdeteksi
                </p>
                {riskInfo.patterns.map((p, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    {p}
                  </div>
                ))}
              </div>
            )}

            {/* Insufficient Data */}
            {result.benford?.insufficient && (
              <div className="p-3 rounded-xl bg-secondary text-muted-foreground text-xs text-center">
                {result.benford.message}
              </div>
            )}

            {/* Bar Chart */}
            {chartData.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">
                  Distribusi Digit Pertama vs Benford
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="digit" tick={{ fontSize: 9, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#888' }} unit="%" />
                    <Tooltip
                      contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                      formatter={(val) => `${val}%`}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Aktual (%)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Harapan Benford (%)" fill="#22c55e40" radius={[4, 4, 0, 0]} stroke="#22c55e" strokeWidth={1} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Detail Tabel */}
            {riskInfo?.suspiciousDigits?.length > 0 && (
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Detail Per Digit
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-2"
                    >
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border">
                            <th className="text-left py-1">Digit</th>
                            <th className="text-right py-1">Harapan</th>
                            <th className="text-right py-1">Aktual</th>
                            <th className="text-right py-1">Deviasi</th>
                            <th className="text-right py-1">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riskInfo.suspiciousDigits.map(d => (
                            <tr key={d.digit} className="border-b border-border/50">
                              <td className="py-1 font-bold">{d.digit}</td>
                              <td className="text-right py-1 text-muted-foreground">{d.expected.toFixed(1)}%</td>
                              <td className="text-right py-1">{d.actual.toFixed(1)}%</td>
                              <td className="text-right py-1" style={{ 
                                color: d.deviation > 0.03 ? '#ef4444' : d.deviation > 0.01 ? '#f97316' : '#22c55e'
                              }}>
                                {d.direction === 'OVER' ? '+' : '-'}{(d.deviation * 100).toFixed(2)}%
                              </td>
                              <td className="text-right py-1">
                                {d.deviation > 0.03 ? '🚨' : d.deviation > 0.01 ? '⚠️' : '✅'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Footer */}
            <p className="text-[9px] text-muted-foreground text-center opacity-50">
              Dianalisis: {riskInfo?.validCount || 0} transaksi | {' '}
              {result.benford?.analyzedAt ? new Date(result.benford.analyzedAt).toLocaleString('id-ID') : ''}
              {' '} | Metode: Nigrini (2012) MAD Threshold
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !isRunning && (
        <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
          <ShieldAlert className="w-8 h-8 opacity-20" />
          <p className="text-xs text-center opacity-50">
            Klik "Jalankan Audit" untuk mendeteksi anomali statistik<br />
            pada seluruh histori transaksi bisnis.
          </p>
        </div>
      )}
    </div>
  );
}
