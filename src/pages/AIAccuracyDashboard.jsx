import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah } from '@/lib/formatters';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Loader2, Bot, Zap, Clock, Target, TrendingUp,
  CheckCircle, XCircle, Brain
} from 'lucide-react';
import { SwarmOffice } from '@/components/swarm/visualizer/SwarmOffice';

const SWARM_AGENTS = [
  { id: 1, name: "Tax Scout", division: "Tax" },
  { id: 2, name: "Audit Specialist", division: "Audit" },
  { id: 3, name: "CFO Analyst", division: "CFO" },
  { id: 4, name: "Core Ledger", division: "Core" },
  { id: 5, name: "Fraud Hunter", division: "Audit" },
  { id: 6, name: "VAT Master", division: "Tax" },
  { id: 7, name: "UU HPP Scout", division: "Tax" },
  { id: 8, name: "Consensus Arbitrator", division: "Core" },
  { id: 101, name: "Recession Survivor", division: "CFO" },
  { id: 102, name: "Hypergrowth Architect", division: "CFO" },
  { id: 103, name: "Price-War Strategist", division: "CFO" },
  { id: 104, name: "Supply Chain Disruptor", division: "CFO" },
  { id: 105, name: "New Market Scout", division: "CFO" },
  { id: 106, name: "Product Pivot Analyst", division: "CFO" },
  { id: 107, name: "Cash-Out Prophet", division: "CFO" },
  { id: 108, name: "Burn-Rate Watchdog", division: "CFO" },
  { id: 109, name: "Bad-Debt Detector", division: "CFO" },
  { id: 110, name: "Tax Penalty Guardian", division: "CFO" },
  { id: 111, name: "Fraud Pattern Predictor", division: "CFO" },
  { id: 112, name: "Sustainability Auditor", division: "CFO" },
  { id: 113, name: "Real-time Valuator", division: "CFO" },
  { id: 114, name: "Investor Pitch", division: "CFO" },
  { id: 115, name: "Dividend Optimizer", division: "CFO" },
  { id: 116, name: "Acquisition Scout", division: "CFO" },
  { id: 117, name: "ROI Accelerator", division: "CFO" },
  { id: 118, name: "Inflation Scout", division: "CFO" },
  { id: 119, name: "Forex Risk", division: "CFO" },
  { id: 120, name: "Policy Predictor", division: "CFO" },
  { id: 121, name: "Consumer Trend", division: "CFO" },
  { id: 122, name: "Executive Judge (CFO)", division: "CFO" },
  // ... generate 101 agen secara dinamis
  ...Array.from({ length: 79 }, (_, i) => ({
    id: i + 9,
    name: `Agent #${i + 9}`,
    division: i % 4 === 0 ? "Tax" : i % 4 === 1 ? "Audit" : i % 4 === 2 ? "CFO" : "Core"
  }))
];

const COLORS = {
  primary: '#00f3ff',
  lime: '#a3e635',
  purple: '#c084fc',
  amber: '#fbbf24',
  red: '#f87171',
  muted: '#64748b',
};

const MINUTES_PER_MANUAL_TX = 2; // Estimasi: 2 menit per nota jika manual

export default function AIAccuracyDashboard() {
  const { activeBusiness } = useBusiness();

  // Ambil semua transaksi (Final + Inbox)
  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: ['all-transactions-ai', activeBusiness?.id],
    queryFn: async () => {
      const [final, inbox] = await Promise.all([
        GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id, status: 'Final' }, '-created_at'),
        GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id, status: 'Inbox' }, '-created_at'),
      ]);
      return [...final, ...inbox];
    },
    enabled: !!activeBusiness,
  });

  // Hitung semua metrik
  const metrics = useMemo(() => {
    if (allTransactions.length === 0) {
      return {
        totalProcessed: 0, autopilotCount: 0, manualCount: 0,
        autopilotRate: 0, avgConfidence: 0, timeSavedMinutes: 0,
        correctedCount: 0, confidenceTrend: [], sourceBreakdown: [],
        categoryAccuracy: [], monthlyVolume: [],
      };
    }

    const aiProcessed = allTransactions.filter(tx => tx.ai_confidence > 0);
    const finalTx = allTransactions.filter(tx => tx.status === 'Final');

    // Autopilot = Final + source bukan manual
    const autopilotTx = finalTx.filter(tx =>
      tx.source !== 'Manual' && tx.ai_confidence >= 95
    );
    const manualTx = finalTx.filter(tx =>
      tx.source === 'Manual' || tx.ai_confidence < 95
    );

    // Koreksi = AI menyarankan kategori tapi user memilih yang berbeda
    const corrected = finalTx.filter(tx =>
      tx.ai_suggested_category &&
      tx.account_name &&
      tx.ai_suggested_category !== tx.account_name
    );

    // Rata-rata confidence
    const confidenceValues = aiProcessed
      .map(tx => tx.ai_confidence)
      .filter(c => c > 0);
    const avgConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : 0;

    // Waktu yang dihemat
    const timeSavedMinutes = autopilotTx.length * MINUTES_PER_MANUAL_TX;

    // Tren confidence per bulan
    const monthMap = {};
    aiProcessed.forEach(tx => {
      const month = tx.date ? tx.date.substring(0, 7) : 'Unknown';
      if (!monthMap[month]) monthMap[month] = { scores: [], count: 0 };
      monthMap[month].scores.push(tx.ai_confidence || 0);
      monthMap[month].count++;
    });
    const confidenceTrend = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: month.substring(5) + '/' + month.substring(2, 4),
        avg: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        count: data.count,
      }));

    // Breakdown sumber
    const sourceMap = {};
    allTransactions.forEach(tx => {
      const src = tx.source || 'Manual';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const sourceBreakdown = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

    // Akurasi per kategori (berapa yang dikonfirmasi vs dikoreksi)
    const catMap = {};
    finalTx.forEach(tx => {
      if (!tx.ai_suggested_category) return;
      const cat = tx.ai_suggested_category;
      if (!catMap[cat]) catMap[cat] = { confirmed: 0, corrected: 0 };
      if (tx.account_name === cat) {
        catMap[cat].confirmed++;
      } else {
        catMap[cat].corrected++;
      }
    });
    const categoryAccuracy = Object.entries(catMap)
      .map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 14) + '…' : name,
        confirmed: data.confirmed,
        corrected: data.corrected,
        rate: Math.round((data.confirmed / (data.confirmed + data.corrected)) * 100),
      }))
      .sort((a, b) => b.confirmed + b.corrected - (a.confirmed + a.corrected))
      .slice(0, 8);

    return {
      totalProcessed: allTransactions.length,
      autopilotCount: autopilotTx.length,
      manualCount: manualTx.length,
      autopilotRate: finalTx.length > 0
        ? Math.round((autopilotTx.length / finalTx.length) * 100) : 0,
      avgConfidence: Math.round(avgConfidence),
      timeSavedMinutes,
      correctedCount: corrected.length,
      confidenceTrend,
      sourceBreakdown,
      categoryAccuracy,
    };
  }, [allTransactions]);

  const timeSavedHours = Math.floor(metrics.timeSavedMinutes / 60);
  const timeSavedMins = metrics.timeSavedMinutes % 60;

  if (!activeBusiness) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu 🏢</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Swarm Command Center Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center shadow-lg shadow-primary/20">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-primary via-cyan-400 to-neon-purple bg-clip-text text-transparent uppercase tracking-tighter">
                SWARM COMMAND CENTER
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Monitoring 79 Specialized MiroFish-v3 Agents in Real-time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur p-2.5 px-4 rounded-2xl border border-primary/20 shadow-inner">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(0,243,255,0.8)]" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest font-bold">Live Consensus Active</span>
          </div>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : allTransactions.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* VISUALIZING THE INVISIBLE: THE OFFICE */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <SwarmOffice agents={SWARM_AGENTS} />
          </motion.div>

          {/* Swarm Insight Update */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 1 }}
            className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Swarm Intelligence Briefing 🛰️</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {metrics.autopilotRate >= 80
                    ? `Goks! Konsensus MiroFish lagi gacor banget. ${metrics.autopilotRate}% nota lo udah gue beresin autopilot tanpa drama. No cap, pembukuan lo rapi banget bulan ini! Slay terus! 💅✨`
                    : `Sistem lagi sinkronisasi pola nih, Bos. Baru ${metrics.autopilotRate}% otonomi tercapai. Sabar ya, pasukan Swarm gue lagi belajar gaya bisnis lo biar makin sat-set! Gas! 🚀`
                  }
                </p>
              </div>
            </div>
          </motion.div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<Target className="w-5 h-5" />}
              label="Trust Score (Swarm)"
              value={`${metrics.avgConfidence}%`}
              accent={metrics.avgConfidence >= 90 ? 'text-cyber-lime' : metrics.avgConfidence >= 70 ? 'text-amber-400' : 'text-destructive'}
              detail={metrics.avgConfidence >= 90 ? 'Gacor Parah! 🔥' : metrics.avgConfidence >= 70 ? 'Lumayan Lah' : 'Perlu Vibe Check ⚠️'}
              delay={0}
            />
            <StatCard
              icon={<Zap className="w-5 h-5" />}
              label="Autopilot Energy"
              value={`${metrics.autopilotRate}%`}
              accent="text-primary"
              detail={`Berhasil beresin ${metrics.autopilotCount} nota! Gas pol! 🚀`}
              delay={0.05}
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Free Time Gained"
              value={timeSavedHours > 0 ? `${timeSavedHours} jam` : `${timeSavedMins} mnt`}
              accent="text-neon-purple"
              detail={timeSavedHours > 0 ? `Bisa rebahan ${timeSavedHours} jam! 💤` : `Waktu lo gak kebuang sia-sia!`}
              delay={0.1}
            />
            <StatCard
              icon={<XCircle className="w-5 h-5" />}
              label="Human Tweak Count"
              value={metrics.correctedCount}
              accent="text-amber-400"
              detail={metrics.correctedCount > 0 ? "Kena spill user dikit" : "No cap, gue bener semua! 💅"}
              delay={0.15}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Confidence Trend */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bento-card">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Tren Akurasi Biyo (per Bulan)
              </h3>
              {metrics.confidenceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={metrics.confidenceTrend}>
                    <defs>
                      <linearGradient id="gradientConf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: COLORS.muted }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: COLORS.muted }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                      formatter={(value) => [`${value}%`, 'Rata-rata Akurasi']}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      fill="url(#gradientConf)"
                      dot={{ fill: COLORS.primary, r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10 text-sm">Belum cukup data untuk tren</p>
              )}
            </motion.div>

            {/* Source Breakdown Pie */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bento-card">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Bot className="w-4 h-4 text-neon-purple" />
                AI vs Manual (Sumber Data)
              </h3>
              {metrics.sourceBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={metrics.sourceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                    >
                      {metrics.sourceBreakdown.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={[COLORS.primary, COLORS.lime, COLORS.purple, COLORS.amber, COLORS.red][idx % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                      formatter={(value, name) => [`${value} nota`, name]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: COLORS.muted }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10 text-sm">Belum ada data</p>
              )}
            </motion.div>
          </div>

          {/* Category Accuracy */}
          {metrics.categoryAccuracy.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bento-card">
              <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyber-lime" />
                Akurasi Kategori (COA) — Biyo vs Koreksi User
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Hijau = Biyo benar, Kuning = User mengoreksi
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics.categoryAccuracy} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.muted }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: COLORS.muted }} width={110} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                    formatter={(value, name) => [value, name === 'confirmed' ? 'Biyo Benar' : 'Dikoreksi']}
                  />
                  <Bar dataKey="confirmed" stackId="a" fill={COLORS.lime} radius={[0, 0, 0, 0]} name="Biyo Benar" />
                  <Bar dataKey="corrected" stackId="a" fill={COLORS.amber} radius={[0, 4, 4, 0]} name="Dikoreksi" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Bottom Info */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              📊 <strong>Bagaimana metrik ini dihitung?</strong> Biyo menganalisa seluruh {metrics.totalProcessed} transaksi yang pernah masuk.
              Tingkat Otonomi dihitung dari nota yang diproses Autopilot (Confidence ≥ 95%) tanpa campur tangan manusia.
              Koreksi Manual dihitung dari nota yang kategori AI-nya diubah oleh user saat validasi.
              Estimasi waktu dihemat: {MINUTES_PER_MANUAL_TX} menit per nota × {metrics.autopilotCount} nota otomatis = <strong>{metrics.timeSavedMinutes} menit</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────
function StatCard({ icon, label, value, accent, detail, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-4 rounded-xl bg-card border border-border"
    >
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bento-card">
      <p className="text-5xl mb-4">🤖</p>
      <h3 className="font-bold text-lg">Biyo belum punya data performa</h3>
      <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
        Scan nota pertamamu lewat tombol <strong>"+"</strong> di pojok kanan bawah.
        Semakin banyak nota yang diproses, semakin lengkap dashboard ini.
      </p>
    </motion.div>
  );
}
