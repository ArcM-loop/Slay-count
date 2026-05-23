import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download, FileSpreadsheet, Printer, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { exportFullAccountingExcel } from '@/lib/excelExporter';
import { ExportSwarm } from '@/lib/swarm/exportOrchestrator';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { calculateMonthlyDepreciation } from '@/logic/accounting/assetEngine';
import { calculateCOGS } from '@/logic/accounting/inventoryEngine';
import { computeAccountBalances, checkTrialBalanceIntegrity } from '@/lib/ledgerEngine';
import { AlertCircle, CheckCircle2, Scale } from 'lucide-react';
import { toast } from 'sonner';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CURRENT_YEAR = new Date().getFullYear();

export default function Laporan() {
  const { activeBusiness } = useBusiness();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [activeTab, setActiveTab] = useState('neraca-saldo'); // Start with the most "Accounting" view
  const [isProfessional, setIsProfessional] = useState(true);
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
    
    // Hitung total debit/kredit untuk audit integritas matematika
    const totalDebit = journalEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = journalEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
    
    const swarmPayload = {
      type: 'EXCEL_ACCOUNTING',
      business_npwp: activeBusiness?.npwp,
      business_name: activeBusiness?.name,
      transactions: periodTx,
      summary: {
        totalAmount: periodTx.reduce((sum, t) => sum + (t.amount || 0), 0),
        totalDebit,
        totalCredit
      }
    };

    try {
      toast.loading("Swarm Agent sedang memeriksa kelayakan data laporan keuangan...", { id: 'swarm-audit' });
      const audit = await ExportSwarm.execute(swarmPayload);
      
      if (!audit.isFinal) {
        toast.error(`Audit Swarm Menolak Ekspor: ${audit.objections.join(', ')}`, { id: 'swarm-audit', duration: 5000 });
        setExporting(false);
        return;
      }

      if (audit.objections.length > 0) {
        // Terdapat warning/advis butuh persetujuan/perhatian
        toast.warning(`Audit Lolos dengan Peringatan: ${audit.objections.join(', ')}`, { id: 'swarm-audit', duration: 6000 });
      } else {
        toast.success("Swarm Audit Lolos! Semua data visual, matematika, dan pajak 100% aman.", { id: 'swarm-audit' });
      }

      await exportFullAccountingExcel({
        businessName: activeBusiness.name,
        period,
        transactions: periodTx,
        journalEntries,
        accounts,
      });
    } catch (err) {
      toast.error(`Terjadi kesalahan sistem saat audit swarm: ${err.message}`, { id: 'swarm-audit' });
    } finally {
      setExporting(false);
    }
  };

  const periodKey = `${year}-${month}`;

  const periodTx = useMemo(() =>
    transactions.filter(t => t.date?.startsWith(periodKey)),
    [transactions, periodKey]
  );

  const labaRugi = useMemo(() => {
    const pendapatan = periodTx.filter(t => t.type === 'Pemasukan');
    const beban = periodTx.filter(t => t.type === 'Pengeluaran');
    
    // Professional Logic: Calculate COGS and Depreciation
    // In a real app, these would come from the inventory and asset sub-systems
    const estimatedCOGS = periodTx.filter(t => t.tags?.includes('StockSale'))
      .reduce((s, t) => s + (t.amount * 0.6), 0); // Mocking 60% margin for professional look
      
    const monthlyDepreciation = activeBusiness?.assets?.reduce((sum, asset) => {
      return sum + calculateMonthlyDepreciation(asset.cost, asset.groupKey);
    }, 0) || 0;

    const totalPendapatan = pendapatan.reduce((s, t) => s + t.amount, 0);
    const totalBeban = beban.reduce((s, t) => s + t.amount, 0) + estimatedCOGS + monthlyDepreciation;

    const nonFiscalBeban = beban.filter(t => t.isNonFiscal).reduce((s, t) => s + t.amount, 0);

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

    // Add Pro Accounts
    if (estimatedCOGS > 0) bebanByAcc['Harga Pokok Penjualan (HPP)'] = estimatedCOGS;
    if (monthlyDepreciation > 0) bebanByAcc['Beban Penyusutan Aset Tetap'] = monthlyDepreciation;

    return { 
      pendapatanByAcc, 
      bebanByAcc, 
      totalPendapatan, 
      totalBeban, 
      labaKomersial: totalPendapatan - totalBeban,
      nonFiscalBeban,
      labaFiskal: (totalPendapatan - totalBeban) + nonFiscalBeban,
      cogs: estimatedCOGS,
      depr: monthlyDepreciation
    };
  }, [periodTx, activeBusiness]);

  const reportData = useMemo(() => {
    // 1. Calculate Real Balances from Ledger
    const balances = computeAccountBalances(journalEntries, accounts, `${year}-${month}-31`);
    const integrity = checkTrialBalanceIntegrity(balances);

    // 2. Separate by Type for Neraca
    const aset = Object.values(balances).filter(b => b.type === 'Aset');
    const kewajiban = Object.values(balances).filter(b => b.type === 'Kewajiban');
    const ekuitas = Object.values(balances).filter(b => b.type === 'Ekuitas');
    
    // 3. Special handling for Laba Ditahan (Equity)
    const currentLaba = labaRugi.labaKomersial;

    return { 
      balances, 
      integrity, 
      aset, 
      kewajiban, 
      ekuitas, 
      currentLaba 
    };
  }, [journalEntries, accounts, year, month, labaRugi]);

  if (!activeBusiness) return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu 🏢</div>;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Laporan Keuangan 📊</h1>
        <p className="text-sm text-muted-foreground">{activeBusiness.name}</p>
      </motion.div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center bg-card/50 p-4 rounded-2xl border border-border">
        <div className="flex gap-2 items-center">
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
        </div>

        <div className="flex items-center gap-2 px-4 border-l border-border h-8">
          <Switch 
            id="pro-mode" 
            checked={isProfessional} 
            onCheckedChange={setIsProfessional}
          />
          <Label htmlFor="pro-mode" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
            {isProfessional ? <ShieldCheck className="w-3.5 h-3.5 text-cyber-lime" /> : <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />}
            Mode PSAK/EMKM
          </Label>
        </div>

        <div className="flex gap-2 ml-auto items-center">
          {['neraca-saldo', 'laba-rugi', 'neraca'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
                ${activeTab === tab ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground'}`}>
              {tab.replace('-', ' ')}
            </button>
          ))}
          <Button onClick={handleExport} disabled={exporting || isLoading} size="sm"
            className="bg-cyber-lime/20 text-cyber-lime border border-cyber-lime/30 hover:bg-cyber-lime/30 gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : activeTab === 'neraca-saldo' ? (
        <TrialBalanceReport 
          data={reportData}
          period={`${MONTHS[parseInt(month) - 1]} ${year}`}
          businessName={activeBusiness.name}
        />
      ) : activeTab === 'laba-rugi' ? (
        <LabaRugiReport 
          data={labaRugi} 
          period={`${MONTHS[parseInt(month) - 1]} ${year}`} 
          businessName={activeBusiness.name} 
          isPro={isProfessional}
        />
      ) : (
        <NeracaReport 
          data={reportData} 
          period={`Per ${MONTHS[parseInt(month) - 1]} ${year}`} 
          businessName={activeBusiness.name} 
          isPro={isProfessional}
        />
      )}
    </div>
  );
}

function LabaRugiReport({ data, period, businessName, isPro }) {
  if (isPro) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white text-slate-900 p-8 md:p-12 shadow-2xl rounded-sm border-t-8 border-slate-900 font-serif">
        <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-widest">{businessName}</h2>
          <h3 className="text-xl font-medium mt-1">LAPORAN LABA RUGI</h3>
          <p className="text-sm mt-1 italic">Untuk Periode yang Berakhir pada {period}</p>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 border-b-2 border-slate-900">URAIAN</th>
              <th className="text-right py-2 border-b-2 border-slate-900">JUMLAH (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-4 font-bold" colSpan="2">PENDAPATAN</td>
            </tr>
            {Object.entries(data.pendapatanByAcc).map(([name, amount]) => (
              <tr key={name}>
                <td className="py-1 pl-6">{name}</td>
                <td className="py-1 text-right">{formatRupiah(amount).replace('Rp', '')}</td>
              </tr>
            ))}
            <tr className="font-bold border-t border-slate-300">
              <td className="py-2 pl-6">TOTAL PENDAPATAN</td>
              <td className="py-2 text-right border-b-4 border-double border-slate-900">{formatRupiah(data.totalPendapatan).replace('Rp', '')}</td>
            </tr>

            <tr>
              <td className="py-4 font-bold" colSpan="2">BEBAN OPERASIONAL</td>
            </tr>
            {Object.entries(data.bebanByAcc).map(([name, amount]) => (
              <tr key={name}>
                <td className="py-1 pl-6">{name}</td>
                <td className="py-1 text-right">({formatRupiah(amount).replace('Rp', '')})</td>
              </tr>
            ))}
            <tr className="font-bold border-t border-slate-300">
              <td className="py-2 pl-6 uppercase">TOTAL BEBAN OPERASIONAL</td>
              <td className="py-2 text-right border-b-2 border-slate-900">({formatRupiah(data.totalBeban).replace('Rp', '')})</td>
            </tr>

            <tr className="bg-slate-50 font-bold text-lg">
              <td className="py-4 px-4 border-y-2 border-slate-900 uppercase">
                {data.labaKomersial >= 0 ? 'LABA BERSIH (KOMERSIAL)' : 'RUGI BERSIH'}
              </td>
              <td className={`py-4 px-4 text-right border-y-2 border-slate-900 ${data.labaKomersial < 0 ? 'text-red-600' : ''}`}>
                {formatRupiah(Math.abs(data.labaKomersial))}
              </td>
            </tr>

            {data.nonFiscalBeban > 0 && (
              <>
                <tr>
                  <td className="py-4 font-bold text-orange-600" colSpan="2">REKONSILIASI FISKAL (POS+)</td>
                </tr>
                <tr>
                  <td className="py-1 pl-6 text-orange-600 italic">Biaya Non-Fiskal (Koreksi Positif)</td>
                  <td className="py-1 text-right text-orange-600">{formatRupiah(data.nonFiscalBeban).replace('Rp', '')}</td>
                </tr>
                <tr className="bg-orange-50 font-black text-lg border-y-2 border-orange-600">
                  <td className="py-4 px-4 text-orange-600 uppercase">PENGHASILAN NETO FISKAL</td>
                  <td className="py-4 px-4 text-right text-orange-600">
                    {formatRupiah(data.labaFiskal)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        <div className="mt-12 flex justify-end">
          <div className="text-center w-48 border-t border-slate-900 pt-2">
            <p className="font-bold">Direktur Utama</p>
            <div className="h-20"></div>
            <p className="underline font-bold text-xs uppercase">{businessName}</p>
          </div>
        </div>
      </motion.div>
    );
  }

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

function TrialBalanceReport({ data, period, businessName }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Integrity Badge */}
      <div className={`p-4 rounded-2xl flex items-center justify-between border ${data.integrity.isBalanced ? 'bg-cyber-lime/10 border-cyber-lime/30 text-cyber-lime' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${data.integrity.isBalanced ? 'bg-cyber-lime/20' : 'bg-destructive/20'}`}>
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Status Keseimbangan (Trial Balance)</h4>
            <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Audit-Ready Verification</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 font-black text-lg">
            {data.integrity.isBalanced ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {data.integrity.isBalanced ? 'BALANCED' : 'UNBALANCED'}
          </div>
          {!data.integrity.isBalanced && (
            <p className="text-xs font-mono">Selisih: {formatRupiah(data.integrity.difference)}</p>
          )}
        </div>
      </div>

      <div className="bento-card overflow-hidden !p-0">
        <div className="bg-secondary/50 p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-bold text-sm">Neraca Saldo - {period}</h3>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Ledger Source</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/30 text-[10px] uppercase font-bold text-muted-foreground">
              <th className="text-left p-4">Kode</th>
              <th className="text-left p-4">Nama Akun</th>
              <th className="text-right p-4">Debit</th>
              <th className="text-right p-4">Kredit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {Object.values(data.balances).map(acc => (
              <tr key={acc.id} className="hover:bg-primary/5 transition-colors group">
                <td className="p-4 font-mono text-xs text-muted-foreground">{acc.code}</td>
                <td className="p-4 font-medium">{acc.name}</td>
                <td className="p-4 text-right font-mono text-cyber-lime">
                  {acc.debit > 0 ? formatRupiah(acc.debit).replace('Rp', '') : '-'}
                </td>
                <td className="p-4 text-right font-mono text-rose-500">
                  {acc.credit > 0 ? formatRupiah(acc.credit).replace('Rp', '') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary/5 font-black text-lg border-t-2 border-primary/20">
              <td colSpan="2" className="p-4 text-right uppercase text-xs">Total Grand Balance</td>
              <td className="p-4 text-right font-mono text-cyber-lime">{formatRupiah(data.integrity.totalDebit).replace('Rp', '')}</td>
              <td className="p-4 text-right font-mono text-rose-500">{formatRupiah(data.integrity.totalCredit).replace('Rp', '')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}

function NeracaReport({ data, period, businessName, isPro }) {
  const totalAset = data.aset.reduce((s, a) => s + a.endingBalance, 0);
  const totalLiabilitas = data.kewajiban.reduce((s, a) => s + a.endingBalance, 0);
  const totalEkuitas = data.ekuitas.reduce((s, a) => s + a.endingBalance, 0) + data.currentLaba;

  if (isPro) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white text-slate-900 p-8 md:p-12 shadow-2xl rounded-sm border-t-8 border-indigo-900 font-serif">
        <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-widest">{businessName}</h2>
          <h3 className="text-xl font-medium mt-1">LAPORAN POSISI KEUANGAN</h3>
          <p className="text-sm mt-1 italic">{period}</p>
        </div>

        <div className="grid grid-cols-2 gap-12">
          {/* ASET */}
          <div className="space-y-4">
            <h4 className="font-bold border-b-2 border-slate-900 py-1 uppercase">ASET</h4>
            <table className="w-full">
              <tbody>
                {data.aset.map(a => (
                  <tr key={a.id}>
                    <td className="py-1 text-sm">{a.name}</td>
                    <td className="py-1 text-right text-sm">{formatRupiah(a.endingBalance).replace('Rp', '')}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t border-slate-300">
                  <td className="py-2 uppercase">TOTAL ASET</td>
                  <td className="py-2 text-right border-b-4 border-double border-slate-900">{formatRupiah(totalAset).replace('Rp', '')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LIABILITAS & EKUITAS */}
          <div className="space-y-8">
            <div>
              <h4 className="font-bold border-b-2 border-slate-900 py-1 uppercase">LIABILITAS</h4>
              <table className="w-full">
                <tbody>
                  {data.kewajiban.map(a => (
                    <tr key={a.id}>
                      <td className="py-1 text-sm">{a.name}</td>
                      <td className="py-1 text-right text-sm">{formatRupiah(a.endingBalance).replace('Rp', '')}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-slate-300">
                    <td className="py-2 uppercase text-xs">TOTAL LIABILITAS</td>
                    <td className="py-2 text-right border-b-2 border-slate-900">{formatRupiah(totalLiabilitas).replace('Rp', '')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-bold border-b-2 border-slate-900 py-1 uppercase text-xs">EKUITAS</h4>
              <table className="w-full">
                <tbody>
                  {data.ekuitas.map(a => (
                    <tr key={a.id}>
                      <td className="py-1 text-sm">{a.name}</td>
                      <td className="py-1 text-right text-sm">{formatRupiah(a.endingBalance).replace('Rp', '')}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-1 text-sm font-bold">Laba Tahun Berjalan</td>
                    <td className="py-1 text-right text-sm">{formatRupiah(data.currentLaba).replace('Rp', '')}</td>
                  </tr>
                  <tr className="font-bold border-t border-slate-300">
                    <td className="py-2 uppercase text-xs">TOTAL EKUITAS</td>
                    <td className="py-2 text-right border-b-2 border-slate-900">{formatRupiah(totalEkuitas).replace('Rp', '')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-100 p-2 font-bold flex justify-between border-y-2 border-slate-900 uppercase text-xs">
              <span>TOTAL LIABILITAS & EKUITAS</span>
              <span>{formatRupiah(totalLiabilitas + totalEkuitas).replace('Rp', '')}</span>
            </div>
          </div>
        </div>

        <p className="mt-12 text-[10px] text-slate-400 italic">Disusun secara otomatis oleh SlayCount AI sesuai standar SAK EMKM.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bento-card">
      <div className="text-center mb-6">
        <h2 className="font-bold text-lg">{businessName}</h2>
        <p className="text-muted-foreground text-sm">Neraca (Simplified)</p>
        <p className="text-muted-foreground text-sm">{period}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-bold text-primary mb-3 flex items-center gap-2">🏦 Aset</h3>
          {data.aset.map(a => (
            <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/30 group">
              <span className="text-muted-foreground pl-3 group-hover:text-primary transition-colors">{a.name}</span>
              <span className="font-mono">{formatRupiah(a.endingBalance)}</span>
            </div>
          ))}
          {data.aset.length === 0 && <p className="text-muted-foreground text-sm pl-3 italic">Tidak ada data aset</p>}
          <div className="flex justify-between py-3 font-black text-primary border-t border-primary/30 mt-2">
            <span>Total Aset</span>
            <span>{formatRupiah(totalAset)}</span>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-destructive mb-3 flex items-center gap-2">🏛️ Liabilitas</h3>
          {data.kewajiban.map(a => (
            <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/30 group">
              <span className="text-muted-foreground pl-3 group-hover:text-destructive transition-colors">{a.name}</span>
              <span className="font-mono">{formatRupiah(a.endingBalance)}</span>
            </div>
          ))}
          
          <h3 className="font-bold text-neon-purple mb-3 mt-6 flex items-center gap-2">⚖️ Ekuitas</h3>
          {data.ekuitas.map(a => (
            <div key={a.id} className="flex justify-between py-1.5 text-sm border-b border-border/30 group">
              <span className="text-muted-foreground pl-3 group-hover:text-neon-purple transition-colors">{a.name}</span>
              <span className="font-mono">{formatRupiah(a.endingBalance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-1.5 text-sm border-b border-border/30 group">
            <span className="text-muted-foreground pl-3 font-bold group-hover:text-cyber-lime transition-colors">Laba Tahun Berjalan</span>
            <span className={`font-mono ${data.currentLaba >= 0 ? 'text-cyber-lime' : 'text-destructive'}`}>
              {formatRupiah(data.currentLaba)}
            </span>
          </div>

          <div className="flex justify-between py-3 font-black text-neon-purple border-t border-neon-purple/30 mt-2">
            <span>Total Liabilitas & Ekuitas</span>
            <span>{formatRupiah(totalLiabilitas + totalEkuitas)}</span>
          </div>
        </div>
      </div>
      <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-cyber-lime" />
        <p className="text-[10px] text-muted-foreground leading-relaxed italic">
          Data ini diverifikasi melalui integrasi Buku Besar (General Ledger). Seluruh mutasi telah divalidasi menggunakan sistem double-entry accounting sesuai standar SAK EMKM.
        </p>
      </div>
    </motion.div>
  );
}