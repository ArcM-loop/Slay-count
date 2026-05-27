import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
// 1. Import base44 diganti jadi GoogleGenerativeAI
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah, formatDateShort, getTypeEmoji } from '@/lib/formatters';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';
import TrialBalance from '@/components/dashboard/TrialBalance';
import HudStatCard from '@/components/hud/HudStatCard';

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const COLORS = ['hsl(199, 100%, 55%)', 'hsl(142, 70%, 50%)', 'hsl(270, 80%, 65%)', 'hsl(38, 95%, 60%)', 'hsl(0, 84%, 60%)'];

export default function Dashboard() {
  const { activeBusiness, loading: businessLoading } = useBusiness();

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id }, '-date', 100),
    enabled: !!activeBusiness,
  });

  // FIX #7: Fetch Journal Entries untuk Single Source of Truth
  const { data: journalEntries = [], isLoading: journalsLoading } = useQuery({
    queryKey: ['journal-entries', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.JournalEntry.filter({ business_id: activeBusiness.id }, '-date', 1000),
    enabled: !!activeBusiness,
  });

  const isLoading = businessLoading || transactionsLoading || journalsLoading;

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    journalEntries.forEach(j => {
        if (j.account_type === 'Pendapatan') {
            income += (parseFloat(j.credit) || 0) - (parseFloat(j.debit) || 0);
        } else if (j.account_type === 'Beban' || j.account_type === 'HPP') {
            expense += (parseFloat(j.debit) || 0) - (parseFloat(j.credit) || 0);
        }
    });
    return { income, expense, net: income - expense, total: transactions.filter(t => t.status === 'Final').length };
  }, [journalEntries, transactions]);

  const chartData = useMemo(() => {
    const monthly = {};
    journalEntries.forEach(j => {
      const key = j.date?.slice(0, 7) || 'N/A';
      if (!monthly[key]) monthly[key] = { month: key, income: 0, expense: 0 };
      
      if (j.account_type === 'Pendapatan') {
          monthly[key].income += (parseFloat(j.credit) || 0) - (parseFloat(j.debit) || 0);
      } else if (j.account_type === 'Beban' || j.account_type === 'HPP') {
          monthly[key].expense += (parseFloat(j.debit) || 0) - (parseFloat(j.credit) || 0);
      }
    });
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [journalEntries]);

  const categoryData = useMemo(() => {
    const cats = {};
    journalEntries.forEach(j => {
      if (j.account_type === 'Beban' || j.account_type === 'HPP') {
          const key = j.account_name || 'Beban Lain-lain';
          const amt = (parseFloat(j.debit) || 0) - (parseFloat(j.credit) || 0);
          cats[key] = (cats[key] || 0) + amt;
      }
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [journalEntries]);

  const recentTx = transactions.slice(0, 6);
  const inboxCount = transactions.filter(t => t.status === 'Inbox').length;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-20 bg-secondary rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-secondary rounded-3xl" />
          <div className="h-32 bg-secondary rounded-3xl" />
          <div className="h-32 bg-secondary rounded-3xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-secondary rounded-3xl" />
          <div className="h-80 bg-secondary rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!activeBusiness && !businessLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="text-6xl animate-bounce">🏢</div>
        <h2 className="text-xl font-bold">Belum ada bisnis nih</h2>
        <p className="text-muted-foreground text-sm">Yuk buat bisnis dulu di Pengaturan!</p>
        <Link to="/pengaturan">
           <Button className="mt-2 bg-primary/20 text-primary border-primary/30">Ke Pengaturan ⚙️</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Selamat datang kembali 👋</p>
          <h1 className="text-2xl font-bold mt-0.5">{activeBusiness.name}</h1>
        </div>
        {inboxCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
            <span className="text-sm font-semibold">⚠️ {inboxCount} butuh validasi</span>
          </div>
        )}
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HudStatCard label="Total Pemasukan" value={formatRupiah(stats.income)} rawValue={stats.income} sub="💰 Income" icon={TrendingUp} color="text-cyber-lime" delay={0.1} hudKey="income" />
        <HudStatCard label="Total Pengeluaran" value={formatRupiah(stats.expense)} rawValue={stats.expense} sub="💸 Expense" icon={TrendingDown} color="text-destructive" delay={0.15} hudKey="expense" />
        <HudStatCard label="Laba Bersih" value={formatRupiah(stats.net)} rawValue={stats.net} sub={stats.net >= 0 ? '📈 Profit' : '📉 Loss'} icon={Wallet} color={stats.net >= 0 ? 'text-primary' : 'text-destructive'} delay={0.2} hudKey="net" />
        <HudStatCard label="Total Transaksi" value={stats.total} rawValue={stats.total} sub="📋 Records" icon={Wallet} color="text-neon-purple" delay={0.25} hudKey="total" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash flow chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 bento-card">
          <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">📈 Tren Arus Kas</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(199, 100%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(199, 100%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215, 20%, 55%)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}jt`} />
                <Tooltip contentStyle={{ background: 'hsl(222, 22%, 11%)', border: '1px solid hsl(222, 18%, 18%)', borderRadius: 12 }} formatter={v => formatRupiah(v)} />
                <Area type="monotone" dataKey="income" stroke="hsl(199, 100%, 55%)" fill="url(#gIncome)" strokeWidth={2} name="Pemasukan" />
                <Area type="monotone" dataKey="expense" stroke="hsl(0, 84%, 60%)" fill="url(#gExpense)" strokeWidth={2} name="Pengeluaran" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Belum ada data transaksi final 📊
            </div>
          )}
        </motion.div>

        {/* Pie chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bento-card">
          <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">🥧 Pengeluaran</h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(222, 22%, 11%)', border: '1px solid hsl(222, 18%, 18%)', borderRadius: 12 }} formatter={v => formatRupiah(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                    <span className="truncate text-muted-foreground">{c.name}</span>
                    <span className="ml-auto font-medium">{formatRupiah(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Belum ada data</div>
          )}
        </motion.div>
      </div>

      {/* Neraca Saldo / Trial Balance */}
      <TrialBalance />

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bento-card">
        <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">🕒 Transaksi Terbaru</h3>
        {recentTx.length > 0 ? (
          <div className="space-y-2">
            {recentTx.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center text-lg">
                  {getTypeEmoji(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description || tx.merchant_name || 'Tanpa deskripsi'}</p>
                  <p className="text-xs text-muted-foreground">{formatDateShort(tx.date)} · {tx.account_name || 'Akun tidak diset'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.type === 'Pemasukan' ? 'text-cyber-lime' : 'text-destructive'}`}>
                    {tx.type === 'Pemasukan' ? '+' : '-'}{formatRupiah(tx.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{tx.status}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm">Belum ada transaksi nih. Yuk tambah dulu!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}