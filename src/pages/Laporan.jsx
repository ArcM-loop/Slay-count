import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { exportFullAccountingExcel } from '@/lib/excelExporter';
import { useQueryClient } from '@tanstack/react-query';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CURRENT_YEAR = new Date().getFullYear();

export default function Laporan() {
  const { activeBusiness } = useBusiness();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [activeTab, setActiveTab] = useState('laba-rugi');
  const [exporting, setExporting] = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id, status: 'Final' }, '-date', 500),
    enabled: !!activeBusiness,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }),
    enabled: !!activeBusiness,
  });

  const { data: journalEntries = [] } = useQuery({
    queryKey: ['journal-entries', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.JournalEntry.filter({ business_id: activeBusiness.id }, '-date', 2000),
    enabled: !!activeBusiness,
  });

  const handleExport = async () => {
    setExporting(true);
    const period = `${MONTHS[parseInt(month) - 1]} ${year}`;
    await exportFullAccountingExcel({
      businessName: activeBusiness.name,
      period,
      transactions: periodTx,
      journalEntries,
      accounts,
    });
    setExporting(false);
  };

  const periodKey = `${year}-${month}`;

  const periodTx = useMemo(() =>
    transactions.filter(t => t.date?.startsWith(periodKey)),
    [transactions, periodKey]
  );

  const labaRugi = useMemo(() => {
    const pendapatan = periodTx.filter(t => t.type === 'Pemasukan');
    const beban = periodTx.filter(t => t.type === 'Pengeluaran');
    const totalPendapatan = pendapatan.reduce((s, t) => s + t.amount, 0);
    const totalBeban = beban.reduce((s, t) => s + t.amount, 0);

    // Group by account
    const pendapatanByAcc = {};
    pendapatan.forEach(t => {
      const key = t.account_name || 'Pendapatan Lain-lain';
      pendapatanByAcc[key] = (pendapatanByAcc[key] || 0) + t.amount;
    });
    const bebanByAcc = {};
    beban.forEach(t => {
      const key = t.account_name || 'Beban Lain-lain';
      bebanByAcc[key] = (bebanByAcc[key] || 0) + t.amount;
    });

    return { pendapatanByAcc, bebanByAcc, totalPendapatan, totalBeban, labaRugi: totalPendapatan - totalBeban };
  }, [periodTx]);

  const neraca = useMemo(() => {
    const allFinal = transactions;
    const asetAccounts = accounts.filter(a => a.type === 'Aset');
    const kewajibanAccounts = accounts.filter(a => a.type === 'Kewajiban');
    const ekuitasAccounts = accounts.filter(a => a.type === 'Ekuitas');

    const getBalance = (accountName, type) => {
      const income = allFinal.filter(t => t.account_name === accountName && t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
      const expense = allFinal.filter(t => t.account_name === accountName && t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);
      return income - expense;
    };

    const totalPendapatan = allFinal.filter(t => t.type === 'Pemasukan').reduce((s, t) => s + t.amount, 0);
    const totalBeban = allFinal.filter(t => t.type === 'Pengeluaran').reduce((s, t) => s + t.amount, 0);
    const labaTotal = totalPendapatan - totalBeban;

    return { asetAccounts, kewajibanAccounts, ekuitasAccounts, labaTotal };
  }, [transactions, accounts]);

  if (!activeBusiness) return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu 🏢</div>;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Laporan Keuangan 📊</h1>
        <p className="text-sm text-muted-foreground">{activeBusiness.name}</p>
      </motion.div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-36 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto items-center">
          {['laba-rugi', 'neraca'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
                ${activeTab === tab ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground'}`}>
              {tab === 'laba-rugi' ? '📈 Laba/Rugi' : '⚖️ Neraca'}
            </button>
          ))}
          <Button onClick={handleExport} disabled={exporting || isLoading} size="sm"
            className="bg-cyber-lime/20 text-cyber-lime border border-cyber-lime/30 hover:bg-cyber-lime/30 gap-2 ml-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : activeTab === 'laba-rugi' ? (
        <LabaRugiReport data={labaRugi} period={`${MONTHS[parseInt(month) - 1]} ${year}`} businessName={activeBusiness.name} />
      ) : (
        <NeracaReport data={neraca} period={`Per ${MONTHS[parseInt(month) - 1]} ${year}`} businessName={activeBusiness.name} />
      )}
    </div>
  );
}

function LabaRugiReport({ data, period, businessName }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="bento-card">
        <div className="text-center mb-6">
          <h2 className="font-bold text-lg">{businessName}</h2>
          <p className="text-muted-foreground text-sm">Laporan Laba/Rugi</p>
          <p className="text-muted-foreground text-sm">{period}</p>
        </div>

        {/* Pendapatan */}
        <div className="mb-6">
          <h3 className="font-bold text-cyber-lime mb-3 flex items-center gap-2">💰 Pendapatan</h3>
          {Object.entries(data.pendapatanByAcc).length > 0 ? (
            Object.entries(data.pendapatanByAcc).map(([name, amount]) => (
              <div key={name} className="flex justify-between py-2 border-b border-border/50 text-sm">
                <span className="text-muted-foreground pl-4">{name}</span>
                <span>{formatRupiah(amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm pl-4">Tidak ada pendapatan di periode ini</p>
          )}
          <div className="flex justify-between py-3 font-bold border-t border-border mt-2">
            <span>Total Pendapatan</span>
            <span className="text-cyber-lime">{formatRupiah(data.totalPendapatan)}</span>
          </div>
        </div>

        {/* Beban */}
        <div className="mb-6">
          <h3 className="font-bold text-destructive mb-3 flex items-center gap-2">💸 Beban</h3>
          {Object.entries(data.bebanByAcc).length > 0 ? (
            Object.entries(data.bebanByAcc).map(([name, amount]) => (
              <div key={name} className="flex justify-between py-2 border-b border-border/50 text-sm">
                <span className="text-muted-foreground pl-4">{name}</span>
                <span>{formatRupiah(amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm pl-4">Tidak ada beban di periode ini</p>
          )}
          <div className="flex justify-between py-3 font-bold border-t border-border mt-2">
            <span>Total Beban</span>
            <span className="text-destructive">{formatRupiah(data.totalBeban)}</span>
          </div>
        </div>

        {/* Laba/Rugi */}
        <div className={`p-4 rounded-2xl flex justify-between items-center font-bold text-lg
          ${data.labaRugi >= 0 ? 'bg-cyber-lime/10 border border-cyber-lime/30' : 'bg-destructive/10 border border-destructive/30'}`}>
          <span>{data.labaRugi >= 0 ? '🎉 Laba Bersih' : '😔 Rugi Bersih'}</span>
          <span className={data.labaRugi >= 0 ? 'text-cyber-lime' : 'text-destructive'}>{formatRupiah(Math.abs(data.labaRugi))}</span>
        </div>
      </div>
    </motion.div>
  );
}

function NeracaReport({ data, period, businessName }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bento-card">
      <div className="text-center mb-6">
        <h2 className="font-bold text-lg">{businessName}</h2>
        <p className="text-muted-foreground text-sm">Neraca (Simplified)</p>
        <p className="text-muted-foreground text-sm">{period}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold text-primary mb-3">🏦 Aset</h3>
          {data.asetAccounts.map(a => (
            <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/30">
              <span className="text-muted-foreground pl-3">{a.name}</span>
              <span>-</span>
            </div>
          ))}
          {data.asetAccounts.length === 0 && <p className="text-muted-foreground text-sm pl-3">Tidak ada akun aset</p>}
        </div>
        <div>
          <h3 className="font-bold text-destructive mb-3">📋 Kewajiban</h3>
          {data.kewajibanAccounts.map(a => (
            <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/30">
              <span className="text-muted-foreground pl-3">{a.name}</span>
              <span>-</span>
            </div>
          ))}
          <h3 className="font-bold text-neon-purple mb-3 mt-4">⚖️ Ekuitas</h3>
          {data.ekuitasAccounts.map(a => (
            <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/30">
              <span className="text-muted-foreground pl-3">{a.name}</span>
              <span>-</span>
            </div>
          ))}
          <div className="flex justify-between py-1.5 text-sm border-b border-border/30">
            <span className="text-muted-foreground pl-3">Laba Ditahan</span>
            <span className={data.labaTotal >= 0 ? 'text-cyber-lime' : 'text-destructive'}>{formatRupiah(data.labaTotal)}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-xl bg-secondary text-center text-xs text-muted-foreground">
        ⚠️ Neraca ini simplified. Input saldo awal akun di Pengaturan untuk neraca lengkap.
      </div>
    </motion.div>
  );
}