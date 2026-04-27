import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, RotateCcw, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CURRENT_YEAR = new Date().getFullYear();

// ── Hitung penyusutan bulanan ─────────────────────────────────────
function calcMonthlyDepreciation(asset) {
    const depreciable = asset.acquisition_cost - (asset.salvage_value || 0);
    if (asset.depreciation_method === 'Saldo Menurun') {
        const rate = 2 / asset.useful_life_months;
        const bookValue = asset.acquisition_cost - (asset.accumulated_depreciation || 0);
        return Math.max(0, bookValue * rate);
    }
    // Garis lurus (default)
    return depreciable / asset.useful_life_months;
}

export default function SiklusAkuntansi() {
    const { activeBusiness } = useBusiness();
    const queryClient = useQueryClient();

    const [showAddAsset, setShowAddAsset] = useState(false);
    const [depMonth, setDepMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [depYear, setDepYear] = useState(String(CURRENT_YEAR));
    const [closingMonth, setClosingMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
    const [closingYear, setClosingYear] = useState(String(CURRENT_YEAR));
    const [depRunning, setDepRunning] = useState(false);
    const [closingRunning, setClosingRunning] = useState(false);
    const [depResult, setDepResult] = useState(null);
    const [closingResult, setClosingResult] = useState(null);

    const { data: assets = [], isLoading: loadingAssets } = useQuery({
        queryKey: ['fixed-assets', activeBusiness?.id],
        queryFn: () => GoogleGenerativeAI.entities.FixedAsset.filter({ business_id: activeBusiness.id }),
        enabled: !!activeBusiness,
    });

    const { data: accounts = [] } = useQuery({
        queryKey: ['accounts', activeBusiness?.id],
        queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }),
        enabled: !!activeBusiness,
    });

    const { data: closingHistory = [] } = useQuery({
        queryKey: ['period-closings', activeBusiness?.id],
        queryFn: () => GoogleGenerativeAI.entities.PeriodClosing.filter({ business_id: activeBusiness.id }, '-created_date', 20),
        enabled: !!activeBusiness,
    });

    // ── Jalankan Penyusutan ──────────────────────────────────────────
    const handleRunDepreciation = async () => {
        setDepRunning(true);
        setDepResult(null);
        const period = `${depYear}-${depMonth}`;
        const activeAssets = assets.filter(a => a.is_active);
        let count = 0;
        let totalDep = 0;

        // Akun beban penyusutan & akumulasi penyusutan
        const bebanDepAcc = accounts.find(a => a.name?.toLowerCase().includes('penyusutan') && a.type === 'Beban');
        const akumDepAcc = accounts.find(a => a.name?.toLowerCase().includes('akumulasi') && a.type === 'Aset');

        for (const asset of activeAssets) {
            // Skip jika sudah diproses bulan ini
            if (asset.last_depreciation_date?.startsWith(period)) continue;
            // Skip jika sudah habis umurnya
            if ((asset.accumulated_depreciation || 0) >= (asset.acquisition_cost - (asset.salvage_value || 0))) continue;

            const monthlyDep = calcMonthlyDepreciation(asset);
            if (monthlyDep <= 0) continue;

            const groupId = uuidv4();
            const entries = [];

            // Debit: Beban Penyusutan
            entries.push({
                business_id: activeBusiness.id,
                transaction_group_id: groupId,
                account_id: bebanDepAcc?.id || 'depreciation_expense',
                account_code: bebanDepAcc?.code || '6-9001',
                account_name: bebanDepAcc?.name || 'Beban Penyusutan',
                account_type: 'Beban',
                debit: monthlyDep,
                credit: 0,
                description: `Penyusutan ${asset.name} - ${period}`,
                date: `${period}-01`,
                entry_type: 'auto_depreciation',
            });

            // Kredit: Akumulasi Penyusutan
            entries.push({
                business_id: activeBusiness.id,
                transaction_group_id: groupId,
                account_id: akumDepAcc?.id || 'accum_depreciation',
                account_code: akumDepAcc?.code || '1-9001',
                account_name: akumDepAcc?.name || 'Akumulasi Penyusutan',
                account_type: 'Aset',
                debit: 0,
                credit: monthlyDep,
                description: `Akumulasi penyusutan ${asset.name} - ${period}`,
                date: `${period}-01`,
                entry_type: 'auto_depreciation',
            });

            await GoogleGenerativeAI.entities.JournalEntry.bulkCreate(entries);

            // Update accumulated_depreciation & last_depreciation_date
            await GoogleGenerativeAI.entities.FixedAsset.update(asset.id, {
                accumulated_depreciation: (asset.accumulated_depreciation || 0) + monthlyDep,
                last_depreciation_date: `${period}-01`,
            });

            count++;
            totalDep += monthlyDep;
        }

        queryClient.invalidateQueries({ queryKey: ['fixed-assets', activeBusiness.id] });
        queryClient.invalidateQueries({ queryKey: ['journal-entries', activeBusiness.id] });
        setDepResult({ count, totalDep, period });
        setDepRunning(false);
    };

    // ── Tutup Periode ────────────────────────────────────────────────
    const handleClosePeriod = async () => {
        setClosingRunning(true);
        setClosingResult(null);
        const period = `${closingYear}-${closingMonth}`;

        // Cek sudah pernah ditutup?
        const alreadyClosed = closingHistory.find(c => c.period === period);
        if (alreadyClosed) {
            setClosingResult({ error: `Periode ${period} sudah pernah ditutup!` });
            setClosingRunning(false);
            return;
        }

        // Ambil semua entri jurnal periode ini
        const { data: allEntries = [] } = await GoogleGenerativeAI.entities.JournalEntry.filter({
            business_id: activeBusiness.id,
        }, '-date', 5000);

        const inPeriodEntries = allEntries.filter(e => e.date?.startsWith(period));
        
        // Hitung saldo per akun untuk penutupan
        const balanceMap = {};
        inPeriodEntries.forEach(e => {
            if (!balanceMap[e.account_id]) {
                balanceMap[e.account_id] = { id: e.account_id, name: e.account_name, code: e.account_code, type: e.account_type, debit: 0, credit: 0 };
            }
            balanceMap[e.account_id].debit += e.debit || 0;
            balanceMap[e.account_id].credit += e.credit || 0;
        });

        const balances = Object.values(balanceMap);
        const revenueAccs = balances.filter(b => b.type === 'Pendapatan');
        const expenseAccs = balances.filter(b => b.type === 'Beban');

        const totalPendapatan = revenueAccs.reduce((s, a) => s + (a.credit - a.debit), 0);
        const totalBeban = expenseAccs.reduce((s, a) => s + (a.debit - a.credit), 0);
        const labaBersih = totalPendapatan - totalBeban;

        // Cari akun Ikhtisar Laba Rugi & Laba Ditahan
        const ikhtisarAcc = accounts.find(a => a.name?.toLowerCase().includes('ikhtisar'));
        const labaditahanAcc = accounts.find(a => a.name?.toLowerCase().includes('laba ditahan') || a.name?.toLowerCase().includes('retained'));
        const modalAcc = accounts.find(a => a.type === 'Ekuitas');

        const closingDate = `${period}-${new Date(parseInt(closingYear), parseInt(closingMonth), 0).getDate().toString().padStart(2, '0')}`;
        const groupId = uuidv4();
        const closingEntries = [];

        // 1. Tutup Pendapatan ke Ikhtisar Laba Rugi
        revenueAccs.forEach(acc => {
            const netCredit = acc.credit - acc.debit;
            if (netCredit === 0) return;
            closingEntries.push({
                business_id: activeBusiness.id,
                transaction_group_id: groupId,
                account_id: acc.id,
                account_code: acc.code,
                account_name: acc.name,
                account_type: 'Pendapatan',
                debit: netCredit,
                credit: 0,
                description: `Penutupan Pendapatan: ${acc.name} - ${period}`,
                date: closingDate,
                entry_type: 'closing',
            });
        });
        if (totalPendapatan !== 0) {
            closingEntries.push({
                business_id: activeBusiness.id,
                transaction_group_id: groupId,
                account_id: ikhtisarAcc?.id || 'income_summary',
                account_code: ikhtisarAcc?.code || '3-9000',
                account_name: ikhtisarAcc?.name || 'Ikhtisar Laba Rugi',
                account_type: 'Ekuitas',
                debit: 0,
                credit: totalPendapatan,
                description: `Ringkasan Pendapatan ke Ikhtisar - ${period}`,
                date: closingDate,
                entry_type: 'closing',
            });
        }

        // 2. Tutup Beban ke Ikhtisar Laba Rugi
        expenseAccs.forEach(acc => {
            const netDebit = acc.debit - acc.credit;
            if (netDebit === 0) return;
            closingEntries.push({
                business_id: activeBusiness.id,
                transaction_group_id: groupId,
                account_id: acc.id,
                account_code: acc.code,
                account_name: acc.name,
                account_type: 'Beban',
                debit: 0,
                credit: netDebit,
                description: `Penutupan Beban: ${acc.name} - ${period}`,
                date: closingDate,
                entry_type: 'closing',
            });
        });
        if (totalBeban !== 0) {
            closingEntries.push({
                business_id: activeBusiness.id,
                transaction_group_id: groupId,
                account_id: ikhtisarAcc?.id || 'income_summary',
                account_code: ikhtisarAcc?.code || '3-9000',
                account_name: ikhtisarAcc?.name || 'Ikhtisar Laba Rugi',
                account_type: 'Ekuitas',
                debit: totalBeban,
                credit: 0,
                description: `Ringkasan Beban ke Ikhtisar - ${period}`,
                date: closingDate,
                entry_type: 'closing',
            });
        }

        // 3. Tutup Ikhtisar Laba Rugi ke Laba Ditahan/Modal
        if (labaBersih !== 0) {
            closingEntries.push({
                business_id: activeBusiness.id,
                transaction_group_id: groupId,
                account_id: ikhtisarAcc?.id || 'income_summary',
                account_code: ikhtisarAcc?.code || '3-9000',
                account_name: ikhtisarAcc?.name || 'Ikhtisar Laba Rugi',
                account_type: 'Ekuitas',
                debit: labaBersih > 0 ? labaBersih : 0,
                credit: labaBersih < 0 ? Math.abs(labaBersih) : 0,
                description: `Tutup Ikhtisar ke Laba Ditahan - ${period}`,
                date: closingDate,
                entry_type: 'closing',
            });
            closingEntries.push({
                business_id: activeBusiness.id,
                transaction_group_id: groupId,
                account_id: labaditahanAcc?.id || modalAcc?.id || 'retained_earnings',
                account_code: labaditahanAcc?.code || modalAcc?.code || '3-1002',
                account_name: labaditahanAcc?.name || modalAcc?.name || 'Laba Ditahan',
                account_type: 'Ekuitas',
                debit: labaBersih < 0 ? Math.abs(labaBersih) : 0,
                credit: labaBersih > 0 ? labaBersih : 0,
                description: `Laba/Rugi Bersih Periode ${period}`,
                date: closingDate,
                entry_type: 'closing',
            });
        }

        if (closingEntries.length > 0) {
            await GoogleGenerativeAI.entities.JournalEntry.bulkCreate(closingEntries);
        }

        // Simpan record PeriodClosing
        await GoogleGenerativeAI.entities.PeriodClosing.create({
            business_id: activeBusiness.id,
            period,
            closed_at: new Date().toISOString(),
            closing_balance: labaBersih,
            total_pendapatan: totalPendapatan,
            total_beban: totalBeban,
            notes: `Ditutup manual — ${inPeriod.length} transaksi`,
        });

        queryClient.invalidateQueries({ queryKey: ['period-closings', activeBusiness.id] });
        queryClient.invalidateQueries({ queryKey: ['journal-entries', activeBusiness.id] });
        setClosingResult({ period, labaBersih, totalPendapatan, totalBeban, txCount: inPeriod.length });
        setClosingRunning(false);
    };

    if (!activeBusiness) return (
        <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu 🏢</div>
    );

    return (
        <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl font-bold">Siklus Akuntansi ♻️</h1>
                <p className="text-sm text-muted-foreground">Penyusutan Aset & Penutupan Periode</p>
            </motion.div>

            {/* ── SIKLUS 7: Penyusutan Aset ── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bento-card space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-lg flex items-center gap-2">📉 Siklus 7 — Penyusutan Aset</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Hitung dan posting beban penyusutan per bulan (metode Garis Lurus / Saldo Menurun)</p>
                    </div>
                    <Button onClick={() => setShowAddAsset(true)} size="sm" className="gap-1.5 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30">
                        <Plus className="w-4 h-4" /> Tambah Aset
                    </Button>
                </div>

                {/* Daftar Aset */}
                {loadingAssets ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : assets.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        <p className="text-3xl mb-2">🏭</p>
                        Belum ada aset tetap. Tambah dulu ya!
                    </div>
                ) : (
                    <div className="space-y-2">
                        {assets.map(asset => {
                            const depreciable = asset.acquisition_cost - (asset.salvage_value || 0);
                            const pct = Math.min(100, ((asset.accumulated_depreciation || 0) / depreciable) * 100);
                            const monthlyDep = calcMonthlyDepreciation(asset);
                            return (
                                <div key={asset.id} className="p-3 rounded-xl bg-secondary/50 border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{asset.name}</p>
                                            <p className="text-xs text-muted-foreground">{asset.depreciation_method} · {asset.useful_life_months} bulan · Penyusutan/bln: {formatRupiah(monthlyDep)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-primary">{formatRupiah(asset.acquisition_cost)}</p>
                                            <p className="text-xs text-muted-foreground">Akm: {formatRupiah(asset.accumulated_depreciation || 0)}</p>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="w-full bg-muted rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full bg-gradient-to-r from-primary to-destructive" style={{ width: `${pct}%` }} />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-right">{pct.toFixed(1)}% tersusutkan</p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Run Depreciation */}
                <div className="flex flex-wrap gap-3 items-center p-4 rounded-2xl bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium text-primary flex-1 min-w-[150px]">🔄 Jalankan Penyusutan untuk:</p>
                    <Select value={depMonth} onValueChange={setDepMonth}>
                        <SelectTrigger className="w-32 bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={depYear} onValueChange={setDepYear}>
                        <SelectTrigger className="w-24 bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleRunDepreciation} disabled={depRunning || assets.length === 0}
                        className="bg-gradient-to-r from-primary to-cyber-lime text-primary-foreground gap-2">
                        {depRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Jalankan
                    </Button>
                </div>

                {depResult && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 rounded-2xl border ${depResult.count > 0 ? 'bg-cyber-lime/10 border-cyber-lime/30' : 'bg-muted border-border'}`}>
                        {depResult.count > 0 ? (
                            <>
                                <p className="font-bold text-cyber-lime">✅ Penyusutan berhasil dijalankan!</p>
                                <p className="text-sm mt-1">{depResult.count} aset diproses · Total beban: <b>{formatRupiah(depResult.totalDep)}</b></p>
                                <p className="text-xs text-muted-foreground mt-0.5">Jurnal double-entry sudah otomatis dibuat</p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">⚠️ Tidak ada aset yang perlu diproses untuk periode ini (sudah dijalankan atau umur habis)</p>
                        )}
                    </motion.div>
                )}
            </motion.div>

            {/* ── SIKLUS 8: Tutup Periode ── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bento-card space-y-5">
                <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">🔒 Siklus 8 — Penutupan Periode</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Buat jurnal penutup dan kunci periode — saldo laba/rugi ditransfer ke ekuitas</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive flex-1 min-w-[150px]">🔒 Tutup Periode:</p>
                    <Select value={closingMonth} onValueChange={setClosingMonth}>
                        <SelectTrigger className="w-32 bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={closingYear} onValueChange={setClosingYear}>
                        <SelectTrigger className="w-24 bg-secondary border-border text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR + 1].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleClosePeriod} disabled={closingRunning}
                        className="bg-destructive/80 hover:bg-destructive text-white gap-2">
                        {closingRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        Tutup Periode
                    </Button>
                </div>

                {closingResult && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className={`p-4 rounded-2xl border ${closingResult.error ? 'bg-destructive/10 border-destructive/30' : 'bg-cyber-lime/10 border-cyber-lime/30'}`}>
                        {closingResult.error ? (
                            <p className="text-sm text-destructive font-medium">⚠️ {closingResult.error}</p>
                        ) : (
                            <>
                                <p className="font-bold text-cyber-lime">✅ Periode {closingResult.period} berhasil ditutup!</p>
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    {[
                                        ['Pendapatan', closingResult.totalPendapatan, 'text-cyber-lime'],
                                        ['Beban', closingResult.totalBeban, 'text-destructive'],
                                        ['Laba/Rugi', closingResult.labaBersih, closingResult.labaBersih >= 0 ? 'text-cyber-lime' : 'text-destructive'],
                                    ].map(([label, val, cls]) => (
                                        <div key={label} className="text-center p-2 rounded-xl bg-secondary/50">
                                            <p className="text-xs text-muted-foreground">{label}</p>
                                            <p className={`font-bold text-sm ${cls}`}>{formatRupiah(val)}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">{closingResult.txCount} transaksi · Jurnal penutup dibuat otomatis</p>
                            </>
                        )}
                    </motion.div>
                )}

                {/* Riwayat Penutupan */}
                {closingHistory.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">📋 Riwayat Penutupan</p>
                        <div className="space-y-2">
                            {closingHistory.map(c => (
                                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
                                    <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{c.period}</p>
                                        <p className="text-xs text-muted-foreground">{c.notes}</p>
                                    </div>
                                    <p className={`text-sm font-bold ${c.closing_balance >= 0 ? 'text-cyber-lime' : 'text-destructive'}`}>
                                        {formatRupiah(c.closing_balance)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Modal Tambah Aset */}
            <AddAssetModal
                open={showAddAsset}
                onClose={() => setShowAddAsset(false)}
                accounts={accounts}
                businessId={activeBusiness.id}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['fixed-assets', activeBusiness.id] })}
            />
        </div>
    );
}

// ── Modal Tambah Aset Tetap ──────────────────────────────────────
function AddAssetModal({ open, onClose, accounts, businessId, onSaved }) {
    const [form, setForm] = useState({
        name: '',
        acquisition_date: new Date().toISOString().slice(0, 10),
        acquisition_cost: '',
        salvage_value: '',
        useful_life_months: '',
        depreciation_method: 'Garis Lurus',
        account_id: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);

    const asetAccounts = accounts.filter(a => a.type === 'Aset');

    const handleSave = async () => {
        setSaving(true);
        const account = asetAccounts.find(a => a.id === form.account_id);
        await GoogleGenerativeAI.entities.FixedAsset.create({
            ...form,
            business_id: businessId,
            acquisition_cost: parseFloat(form.acquisition_cost) || 0,
            salvage_value: parseFloat(form.salvage_value) || 0,
            useful_life_months: parseInt(form.useful_life_months) || 12,
            account_name: account?.name || '',
            accumulated_depreciation: 0,
            is_active: true,
        });
        onSaved();
        onClose();
        setSaving(false);
        setForm({ name: '', acquisition_date: new Date().toISOString().slice(0, 10), acquisition_cost: '', salvage_value: '', useful_life_months: '', depreciation_method: 'Garis Lurus', account_id: '', notes: '' });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-card border-border max-w-md">
                <DialogHeader>
                    <DialogTitle>Tambah Aset Tetap 🏭</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                    {[
                        { label: 'Nama Aset *', key: 'name', placeholder: 'Laptop, Kendaraan, Mesin...' },
                        { label: 'Tanggal Perolehan *', key: 'acquisition_date', type: 'date' },
                        { label: 'Harga Perolehan (Rp) *', key: 'acquisition_cost', placeholder: '10000000', type: 'number' },
                        { label: 'Nilai Sisa (Rp)', key: 'salvage_value', placeholder: '1000000', type: 'number' },
                        { label: 'Umur Ekonomis (bulan) *', key: 'useful_life_months', placeholder: '48', type: 'number' },
                    ].map(({ label, key, placeholder, type }) => (
                        <div key={key}>
                            <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                            <Input type={type || 'text'} placeholder={placeholder} value={form[key]}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                className="bg-secondary border-border" />
                        </div>
                    ))}

                    <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Metode Penyusutan</Label>
                        <Select value={form.depreciation_method} onValueChange={v => setForm(f => ({ ...f, depreciation_method: v }))}>
                            <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="Garis Lurus">Garis Lurus (Straight-Line)</SelectItem>
                                <SelectItem value="Saldo Menurun">Saldo Menurun (Declining Balance)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Akun Aset (COA)</Label>
                        <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                            <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Pilih akun..." /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                {asetAccounts.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        <span className="text-muted-foreground text-xs mr-1">{a.code}</span>{a.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleSave} disabled={saving || !form.name || !form.acquisition_cost || !form.useful_life_months}
                        className="w-full bg-gradient-to-r from-primary to-neon-purple text-primary-foreground">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Simpan Aset 🏭
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}