import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { computeAccountBalances } from '@/lib/journalEngine';
import { formatRupiah } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

const TYPE_ORDER = ['Aset', 'Kewajiban', 'Ekuitas', 'Pendapatan', 'Beban'];
const TYPE_COLOR = {
  Aset: 'text-electric-blue',
  Kewajiban: 'text-warm-amber',
  Ekuitas: 'text-neon-purple',
  Pendapatan: 'text-cyber-lime',
  Beban: 'text-destructive',
};
const TYPE_EMOJI = { Aset: '🏦', Kewajiban: '📋', Ekuitas: '👑', Pendapatan: '💰', Beban: '💸' };

export default function TrialBalance() {
  const { activeBusiness } = useBusiness();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal-entries', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.JournalEntry.filter({ business_id: activeBusiness.id }, '-date', 500),
    enabled: !!activeBusiness,
  });

  const balances = useMemo(() => computeAccountBalances(entries), [entries]);

  const grouped = useMemo(() => {
    return TYPE_ORDER.reduce((acc, type) => {
      acc[type] = balances.filter(b => b.account_type === type);
      return acc;
    }, {});
  }, [balances]);

  const totalDebit = balances.reduce((s, b) => s + b.total_debit, 0);
  const totalCredit = balances.reduce((s, b) => s + b.total_credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  if (isLoading) return (
    <div className="bento-card flex items-center justify-center h-40">
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
    </div>
  );

  if (entries.length === 0) return (
    <div className="bento-card text-center py-10">
      <p className="text-3xl mb-2">📒</p>
      <p className="text-sm text-muted-foreground">Belum ada entri jurnal. Finalisasi transaksi dulu untuk membuat buku besar.</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bento-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">📒 Neraca Saldo</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${isBalanced ? 'bg-cyber-lime/10 text-cyber-lime border-cyber-lime/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
          {isBalanced ? '✅ Balance' : '⚠️ Tidak Balance'}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium px-2 pb-1 border-b border-border">
        <span className="col-span-2">Akun</span>
        <span className="text-right">Debit</span>
        <span className="text-right">Kredit</span>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto">
        {TYPE_ORDER.map(type => {
          const list = grouped[type];
          if (!list || list.length === 0) return null;
          return (
            <div key={type}>
              <p className={`text-xs font-bold mb-1.5 ${TYPE_COLOR[type]}`}>{TYPE_EMOJI[type]} {type}</p>
              {list.map(b => (
                <div key={b.account_id} className="grid grid-cols-4 text-xs py-1 px-2 hover:bg-secondary/40 rounded-lg transition-colors">
                  <span className="col-span-2 truncate text-foreground">{b.account_name}</span>
                  <span className="text-right text-cyber-lime">{b.total_debit > 0 ? formatRupiah(b.total_debit) : '—'}</span>
                  <span className="text-right text-destructive">{b.total_credit > 0 ? formatRupiah(b.total_credit) : '—'}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 text-xs font-bold px-2 pt-2 border-t border-border">
        <span className="col-span-2 text-foreground">Total</span>
        <span className="text-right text-cyber-lime">{formatRupiah(totalDebit)}</span>
        <span className="text-right text-destructive">{formatRupiah(totalCredit)}</span>
      </div>
    </motion.div>
  );
}