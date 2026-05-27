import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah, formatDate } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, Filter, Search, ArrowRightLeft, FileText, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CURRENT_YEAR = new Date().getFullYear();

// Jurnal Types
const JOURNAL_TYPES = [
  { id: 'all', label: 'Buku Besar (Semua Jurnal)', icon: BookOpen },
  { id: 'umum', label: 'Jurnal Umum', icon: FileText },
  { id: 'penerimaan', label: 'Jurnal Penerimaan Kas', icon: ArrowDownToLine },
  { id: 'pengeluaran', label: 'Jurnal Pengeluaran Kas', icon: ArrowUpFromLine },
  { id: 'pembelian', label: 'Jurnal Pembelian', icon: BookOpen },
  { id: 'penjualan', label: 'Jurnal Penjualan', icon: BookOpen },
  { id: 'penyesuaian', label: 'Jurnal Penyesuaian', icon: Filter },
  { id: 'pembalik', label: 'Jurnal Pembalik', icon: ArrowRightLeft }
];

export default function BukuBesar() {
  const { activeBusiness } = useBusiness();
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [search, setSearch] = useState('');
  const [journalType, setJournalType] = useState('all');
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['accounts', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }),
    enabled: !!activeBusiness,
  });

  const { data: allJournals = [], isLoading: isLoadingJournals } = useQuery({
    queryKey: ['journal-entries', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.JournalEntry.filter({ business_id: activeBusiness.id }, '-date', 5000),
    enabled: !!activeBusiness,
  });

  const periodKey = `${year}-${month}`;

  const filteredJournals = useMemo(() => {
    return allJournals.filter(j => {
      if (!j.date?.startsWith(periodKey)) return false;
      
      // Search filter
      const matchSearch = !search || 
        j.description?.toLowerCase().includes(search.toLowerCase()) || 
        j.account_name?.toLowerCase().includes(search.toLowerCase());
      
      // Account filter
      const matchAccount = selectedAccountId === 'all' || j.account_id === selectedAccountId;
      
      // Journal Type logic
      let matchType = true;
      if (journalType === 'penyesuaian') {
        matchType = j.description?.toLowerCase().includes('penyesuaian') || j.description?.toLowerCase().includes('depresiasi');
      } else if (journalType === 'pembalik') {
        matchType = j.description?.toLowerCase().includes('pembalik') || j.description?.toLowerCase().includes('reversing');
      } else if (journalType === 'penerimaan') {
        // Penerimaan kas: Akun Kas/Bank di posisi Debit
        const isKasBank = j.account_name?.toLowerCase().includes('kas') || j.account_name?.toLowerCase().includes('bank');
        matchType = isKasBank && (j.debit > 0);
        // Note: in a real special journal, you group the entire transaction if it involves cash receipt
      } else if (journalType === 'pengeluaran') {
        // Pengeluaran kas: Akun Kas/Bank di posisi Kredit
        const isKasBank = j.account_name?.toLowerCase().includes('kas') || j.account_name?.toLowerCase().includes('bank');
        matchType = isKasBank && (j.credit > 0);
      } else if (journalType === 'pembelian') {
        matchType = j.account_name?.toLowerCase().includes('pembelian') || j.description?.toLowerCase().includes('beli') || j.description?.toLowerCase().includes('pembelian');
      } else if (journalType === 'penjualan') {
        matchType = j.account_name?.toLowerCase().includes('penjualan') || j.description?.toLowerCase().includes('jual') || j.description?.toLowerCase().includes('penjualan');
      } else if (journalType === 'umum') {
        // Jurnal Umum: transaksi yang bukan penerimaan/pengeluaran/penyesuaian/pembalik/pembelian/penjualan
        // Simplified logic for UI visualization
        const desc = j.description?.toLowerCase() || '';
        const acc = j.account_name?.toLowerCase() || '';
        matchType = !desc.includes('penyesuaian') && !desc.includes('pembalik') && !desc.includes('pembelian') && !desc.includes('penjualan') && !acc.includes('pembelian') && !acc.includes('penjualan');
      }

      return matchSearch && matchAccount && matchType;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort chronological for GL
  }, [allJournals, periodKey, search, selectedAccountId, journalType]);

  const totalDebit = filteredJournals.reduce((sum, j) => sum + (j.debit || 0), 0);
  const totalCredit = filteredJournals.reduce((sum, j) => sum + (j.credit || 0), 0);

  if (!activeBusiness) return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu 🏢</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Buku Besar & Jurnal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Audit trail transparan untuk semua transaksi Debit & Kredit.</p>
        </div>
      </motion.div>

      {/* Control Panel */}
      <div className="bg-card/50 p-4 rounded-2xl border border-border flex flex-wrap gap-4 items-center">
        {/* Period Selection */}
        <div className="flex gap-2 items-center">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-28 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Journal Type Selection */}
        <Select value={journalType} onValueChange={setJournalType}>
          <SelectTrigger className="w-64 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOURNAL_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" /> {type.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Account Filter */}
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="w-64 bg-secondary border-border">
            <SelectValue placeholder="Semua Akun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Akun</SelectItem>
            {accounts.map(acc => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.code} - {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari keterangan atau nama akun..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-border w-full"
          />
        </div>
      </div>

      {/* Main Table */}
      <Card className="bg-black/20 border-white/10">
        <CardContent className="p-0">
          {isLoadingJournals || isLoadingAccounts ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : filteredJournals.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">Tidak ada entri jurnal ditemukan pada periode ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-4 font-medium">Tanggal</th>
                    <th className="p-4 font-medium">Nama Akun</th>
                    <th className="p-4 font-medium">Keterangan</th>
                    <th className="p-4 font-medium text-right">Debit</th>
                    <th className="p-4 font-medium text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredJournals.map((j) => (
                    <tr key={j.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-muted-foreground font-mono">{formatDate(j.date)}</td>
                      <td className="p-4 font-semibold text-white">
                        {j.debit > 0 ? j.account_name : <span className="ml-6">{j.account_name}</span>}
                      </td>
                      <td className="p-4 text-muted-foreground">{j.description}</td>
                      <td className="p-4 text-right font-mono text-cyan-400">
                        {j.debit > 0 ? formatRupiah(j.debit) : '-'}
                      </td>
                      <td className="p-4 text-right font-mono text-orange-400">
                        {j.credit > 0 ? formatRupiah(j.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-secondary/30 font-bold border-t-2 border-border">
                    <td colSpan={3} className="p-4 text-right">Total:</td>
                    <td className="p-4 text-right font-mono text-cyan-400">{formatRupiah(totalDebit)}</td>
                    <td className="p-4 text-right font-mono text-orange-400">{formatRupiah(totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
              
              {/* Integrity Warning */}
              {totalDebit !== totalCredit && selectedAccountId === 'all' && (
                <div className="p-4 bg-destructive/20 border-t border-destructive flex items-center justify-center gap-2 text-destructive font-bold">
                  ⚠️ Peringatan: Total Debit dan Kredit tidak seimbang! Kemungkinan ada bypass sistem.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
