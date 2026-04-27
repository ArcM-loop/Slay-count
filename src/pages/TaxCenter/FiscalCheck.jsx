import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
// 1. base44 diganti jadi GoogleGenerativeAI
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah, formatDate } from '@/lib/formatters';
import { calculatePPhBadan } from '@/logic/tax/calculator';
import { categorizeFiscalTransactions as catFiscal } from '@/logic/tax/fiscalRules';
import TaxSummaryCard from '@/components/tax/TaxSummaryCard';
import { ArrowLeft, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FiscalCheck() {
  const { activeBusiness } = useBusiness();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', activeBusiness?.id],
    // 2. base44 diganti jadi GoogleGenerativeAI
    queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id }, '-date', 500),
    enabled: !!activeBusiness,
  });

  const { deductible, nonDeductible, uncategorized } = useMemo(() => {
    return catFiscal(transactions);
  }, [transactions]);

  const income = useMemo(() => transactions.filter(t => t.type === 'Pemasukan' && t.status === 'Final').reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalDeductible = deductible.reduce((s, t) => s + t.amount, 0);
  const totalNonDeductible = nonDeductible.reduce((s, t) => s + t.amount, 0);
  const labaKomersial = income - (totalDeductible + totalNonDeductible);
  const koreksiFiskal = totalNonDeductible; // Biaya tidak boleh dikurang → tambah balik ke laba fiskal
  const pphCalc = calculatePPhBadan(labaKomersial, koreksiFiskal);

  if (!activeBusiness) return null;

  const sections = [
    {
      title: 'Biaya Boleh Dikurangkan (Deductible)',
      icon: CheckCircle,
      colorClass: 'text-cyber-lime',
      borderClass: 'border-cyber-lime/20',
      bgClass: 'bg-cyber-lime/5',
      data: deductible,
      total: totalDeductible,
      tag: 'DEDUCTIBLE',
      tagColor: 'bg-cyber-lime/15 text-cyber-lime',
    },
    {
      title: 'Biaya TIDAK Boleh Dikurangkan (Non-Deductible)',
      icon: XCircle,
      colorClass: 'text-destructive',
      borderClass: 'border-destructive/20',
      bgClass: 'bg-destructive/5',
      data: nonDeductible,
      total: totalNonDeductible,
      tag: 'KOREKSI +',
      tagColor: 'bg-destructive/15 text-destructive',
    },
    {
      title: 'Perlu Dikaji Lebih Lanjut',
      icon: HelpCircle,
      colorClass: 'text-warm-amber',
      borderClass: 'border-warm-amber/20',
      bgClass: 'bg-warm-amber/5',
      data: uncategorized,
      total: uncategorized.reduce((s, t) => s + t.amount, 0),
      tag: '?',
      tagColor: 'bg-warm-amber/15 text-warm-amber',
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <Link to="/tax" className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Fiscal Check ⚖️</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Koreksi fiskal otomatis berdasarkan UU PPh</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <TaxSummaryCard label="Total Deductible" amount={totalDeductible} sub="Boleh dikurangkan" color="lime" delay={0.1} />
        <TaxSummaryCard label="Total Non-Deductible" amount={totalNonDeductible} sub="Koreksi positif" color="red" delay={0.15} />
        <TaxSummaryCard label="Laba Fiskal" amount={pphCalc.labaFiskal} sub="Setelah koreksi" color="cyan" delay={0.2} />
        <TaxSummaryCard label="PPh Badan (22%)" amount={pphCalc.pphBadan} sub="Estimasi terutang" color="red" delay={0.25} />
      </div>

      {/* Rekonsiliasi Fiskal */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bento-card">
        <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">📊 Rekonsiliasi Fiskal</h3>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Total Pendapatan', value: income, color: 'text-cyber-lime' },
            { label: '(-) Biaya Deductible', value: -totalDeductible, color: 'text-muted-foreground' },
            { label: '(-) Biaya Non-Deductible (Komersial)', value: -totalNonDeductible, color: 'text-muted-foreground' },
            { label: 'Laba Komersial', value: labaKomersial, color: 'text-foreground', bold: true, border: true },
            { label: '(+) Koreksi Fiskal Positif (Non-Ded)', value: koreksiFiskal, color: 'text-destructive' },
            { label: 'Laba Fiskal (PKP)', value: pphCalc.labaFiskal, color: 'text-[#00f3ff]', bold: true, border: true },
            { label: 'PPh Badan 22%', value: pphCalc.pphBadan, color: 'text-destructive', bold: true },
          ].map((row, i) => (
            <div key={i} className={`flex justify-between py-2 ${row.border ? 'border-t border-border mt-2 pt-3' : ''}`}>
              <span className={`${row.bold ? 'font-bold' : 'text-muted-foreground'}`}>{row.label}</span>
              <span className={`font-mono ${row.bold ? 'font-bold' : ''} ${row.color}`}>
                {formatRupiah(Math.abs(row.value))}
                {row.value < 0 ? '' : ''}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Sections */}
      {sections.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 + si * 0.05 }}
          className={`rounded-2xl border p-5 ${section.borderClass} ${section.bgClass}`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold flex items-center gap-2 ${section.colorClass}`}>
              <section.icon className="w-4 h-4" /> {section.title}
            </h3>
            <div className="text-right">
              <p className={`font-bold ${section.colorClass}`}>{formatRupiah(section.total)}</p>
              <p className="text-xs text-muted-foreground">{section.data.length} transaksi</p>
            </div>
          </div>

          {section.data.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Tidak ada transaksi di kategori ini</p>
          ) : (
            <div className="space-y-1.5">
              {section.data.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-background/50 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tx.account_name || tx.description || 'Tanpa keterangan'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(tx.date)}
                      {tx.fiscal_rule && ` · ${tx.fiscal_rule.pasal}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0 ${section.tagColor}`}>
                    {section.tag}
                  </span>
                  <p className={`font-bold flex-shrink-0 ml-1 ${section.colorClass}`}>{formatRupiah(tx.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}