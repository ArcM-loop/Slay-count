/**
 * SlayCount — Tax Center Page (Premium Overhaul)
 * PPN Recap, PPh Recap, Fiscal Check, Deadline Tracker, Export CSV
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah } from '@/lib/formatters';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { 
  calculateNetPPN, 
  calculatePPhSummary, 
  getTaxDeadlines, 
  calculateCorporateTax, 
  TAX_RULES 
} from '../../logic/tax/calculator.js';
import { calculateFiscalCorrection } from '../../logic/tax/fiscalRules.js';
import { 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  FileText, 
  ArrowRight,
  CheckCircle2,
  Scale
} from 'lucide-react';
import PPNReport from './PPNReport.jsx';
import PPhReport from './PPhReport.jsx';
import FiscalCheck from './FiscalCheck.jsx';

const KPIS = [
  { id: 'ppn', label: 'PPN TERUTANG', sub: 'Keluaran - Masukan', color: 'cyan' },
  { id: 'pph21', label: 'PPH 21 TERPOTONG', sub: 'Total potongan gaji', color: 'purple' },
  { id: 'pph23', label: 'PPH 23 TERPOTONG', sub: 'Jasa & dividen', color: 'green' },
  { id: 'corporate', label: 'ESTIMASI PPH BADAN', sub: '22% x Laba Fiskal', color: 'emerald' },
];

export default function TaxCenterPage() {
  const { activeBusiness } = useBusiness();
  const [activeView, setActiveView] = useState('main'); // 'main', 'ppn', 'pph', 'fiscal'

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id, status: 'Final' }),
    enabled: !!activeBusiness,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }),
    enabled: !!activeBusiness,
  });

  const deadlines = getTaxDeadlines();
  const ppnData = useMemo(() => calculateNetPPN(transactions), [transactions]);
  const pphData = useMemo(() => calculatePPhSummary(transactions), [transactions]);
  const fiscalData = useMemo(() => calculateFiscalCorrection(transactions, accounts), [transactions, accounts]);

  const pnlSummary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
    return { income, expense, profit: income - expense };
  }, [transactions]);

  const corporateTax = calculateCorporateTax(pnlSummary.profit, fiscalData.totalCorrection);
  
  // PKP Status Calculation
  const pkpLimit = 4800000000;
  const currentOmzet = pnlSummary.income;
  const pkpPercentage = Math.min((currentOmzet / pkpLimit) * 100, 100);
  const isPkp = currentOmzet >= pkpLimit;

  if (activeView !== 'main') {
    return (
      <div className="p-6">
        <button onClick={() => setActiveView('main')} className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowRight className="rotate-180 w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Kembali ke Tax Center
        </button>
        {activeView === 'ppn' && <PPNReport />}
        {activeView === 'pph' && <PPhReport />}
        {activeView === 'fiscal' && <FiscalCheck />}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-10 max-w-7xl mx-auto overflow-hidden">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Tax Center <Building2 className="w-8 h-8 text-primary" />
        </h1>
        <p className="text-muted-foreground mt-1">Pusat pengelolaan perpajakan bisnis Anda</p>
      </header>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TaxKpiCard 
          label="PPN TERUTANG" 
          amount={ppnData.netPPN} 
          sub="Keluaran - Masukan" 
          color="cyan" 
        />
        <TaxKpiCard 
          label="PPH 21 TERPOTONG" 
          amount={pphData.PPH_21?.totalTax || 0} 
          sub="Total potongan gaji" 
          color="purple" 
        />
        <TaxKpiCard 
          label="PPH 23 TERPOTONG" 
          amount={pphData.PPH_23?.totalTax || 0} 
          sub="Jasa & dividen" 
          color="green" 
        />
        <TaxKpiCard 
          label="ESTIMASI PPH BADAN" 
          amount={corporateTax} 
          sub="22% x Laba Fiskal" 
          color="emerald" 
        />
      </div>

      {/* PKP Status Section */}
      <section className="bento-card bg-card/40 border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <div>
              <h3 className="font-bold">Status PKP (Pengusaha Kena Pajak)</h3>
              <p className="text-xs text-muted-foreground">Batas omzet wajib PKP: Rp 4.800.000.000/tahun</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${isPkp ? 'bg-destructive/10 text-destructive' : 'bg-cyber-lime/10 text-cyber-lime'}`}>
            {isPkp ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            {isPkp ? 'Wajib PKP' : 'Di Bawah PKP'}
          </div>
        </div>
        
        <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pkpPercentage}%` }}
            className={`absolute top-0 left-0 h-full ${isPkp ? 'bg-destructive' : 'bg-primary'}`}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
          <span>{formatRupiah(currentOmzet)} (saat ini)</span>
          <span>{pkpPercentage.toFixed(1)}%</span>
          <span>Sisa {formatRupiah(Math.max(0, pkpLimit - currentOmzet))}</span>
        </div>
      </section>

      {/* Bento Grid Main */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BentoTaxCard 
          emoji="📄"
          title="Rekap PPN"
          subtitle="PPN Keluaran & Masukan"
          onClick={() => setActiveView('ppn')}
          color="cyan"
        />
        <BentoTaxCard 
          emoji="📋"
          title="Rekap PPh"
          subtitle="PPh 21, 23, dan 4(2)"
          onClick={() => setActiveView('pph')}
          color="purple"
        />
        <BentoTaxCard 
          emoji="⚖️"
          title="Fiscal Check"
          subtitle="Koreksi fiskal otomatis"
          onClick={() => setActiveView('fiscal')}
          color="green"
        />
      </div>

      {/* Bottom Rows: Estimate & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Estimasi PPh Badan Table */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-bold text-lg">
            <Scale className="w-5 h-5 text-primary" /> Estimasi PPh Badan
          </h3>
          <div className="bg-card/30 border border-border/40 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Laba Komersial</span>
              <span className="font-medium">{formatRupiah(pnlSummary.profit)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Koreksi Fiskal</span>
              <span className="font-medium text-destructive">{formatRupiah(fiscalData.totalCorrection)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-border/20 font-bold">
              <span>Laba Fiskal</span>
              <span>{formatRupiah(pnlSummary.profit + fiscalData.totalCorrection)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Tarif PPh Badan</span>
              <span>22%</span>
            </div>
            <div className="bg-destructive/10 p-4 rounded-xl flex justify-between items-center border border-destructive/20 mt-4">
              <span className="font-bold text-destructive">PPh Badan Terutang</span>
              <span className="font-bold text-lg text-destructive">{formatRupiah(corporateTax)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
              * Estimasi berdasarkan data transaksi yang sudah final. Konsultasikan dengan akuntan untuk perhitungan resmi.
            </p>
          </div>
        </div>

        {/* Deadlines Section */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 font-bold text-lg">
            <Clock className="w-5 h-5 text-primary" /> Deadline Pajak
          </h3>
          <div className="space-y-3">
            {deadlines.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 bg-card/30 border border-border/40 rounded-xl hover:bg-card/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${d.isOverdue ? 'border-destructive/30 bg-destructive/10' : 'border-cyber-lime/30 bg-cyber-lime/10'}`}>
                    {d.isOverdue ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <CheckCircle2 className="w-4 h-4 text-cyber-lime" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{d.name}</h4>
                    <p className="text-[10px] text-muted-foreground">Batas lapor bulan sebelumnya</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold ${d.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {d.isOverdue ? 'TERLAMBAT' : `${d.daysLeft} hari lagi`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxKpiCard({ label, amount, sub, color }) {
  const glowColors = {
    cyan: 'border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    purple: 'border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    green: 'border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.15)]',
    emerald: 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  };

  const textColors = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    emerald: 'text-emerald-400',
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`p-5 rounded-2xl border bg-card/40 backdrop-blur-md ${glowColors[color]}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color === 'cyan' ? 'bg-cyan-500' : color === 'purple' ? 'bg-purple-500' : color === 'green' ? 'bg-green-500' : 'bg-emerald-500'}`} />
        <span className="text-[10px] font-bold text-muted-foreground tracking-widest">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{formatRupiah(amount)}</p>
      <p className="text-[10px] text-muted-foreground mt-1 font-medium">{sub}</p>
    </motion.div>
  );
}

function BentoTaxCard({ emoji, title, subtitle, onClick, color }) {
  const textColors = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    green: 'text-emerald-400',
  };

  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={onClick}
      className="bento-card cursor-pointer group"
    >
      <span className="text-3xl mb-4 block">{emoji}</span>
      <h3 className={`text-xl font-bold mb-1 ${textColors[color]}`}>{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <div className={`text-xs font-bold flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity ${textColors[color]}`}>
        Lihat Detail <ArrowRight className="w-3 h-3" />
      </div>
    </motion.div>
  );
}
