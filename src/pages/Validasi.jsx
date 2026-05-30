import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah, formatDate, getTypeEmoji } from '@/lib/formatters';
import { createJournalEntries, validateJournalWithSwarm } from '@/lib/journalEngine';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditTrail';
import { fuzzyMatchAccount } from '@/lib/smartImportEngine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, CheckCircle, X, Bot, Zap, ShieldAlert, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import ParticleExplosion from '@/components/hud/ParticleExplosion';
import HudTypewriter from '@/components/hud/HudTypewriter';
import { toast } from 'sonner';

export default function Validasi() {
    const { activeBusiness } = useBusiness();
    const queryClient = useQueryClient();

    // Autopilot State
    const [isAutopilot, setIsAutopilot] = useState(false);
    const [duplicates, setDuplicates] = useState(new Set());
    const [showEnableModal, setShowEnableModal] = useState(false);
    const [showDisableModal, setShowDisableModal] = useState(false);

    useEffect(() => {
        const savedState = localStorage.getItem('slaycount_autopilot');
        if (savedState === 'true') setIsAutopilot(true);
    }, []);

    const { data: inboxTx = [], isLoading } = useQuery({
        queryKey: ['transactions-inbox', activeBusiness?.id],
        queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id, status: 'Inbox' }, '-created_at'),
        enabled: !!activeBusiness,
    });

    // Cek Duplikat di Inbox
    useEffect(() => {
        if (inboxTx.length > 0) {
            const potentialDupes = new Set();
            inboxTx.forEach((tx, idx) => {
                const isDupe = inboxTx.some((other, oIdx) => 
                    idx !== oIdx && 
                    other.vendor_name === tx.vendor_name && 
                    Math.abs(other.amount - tx.amount) < 1 && 
                    other.date === tx.date
                );
                if (isDupe) potentialDupes.add(tx.id);
            });
            setDuplicates(potentialDupes);
        }
    }, [inboxTx]);

    const handleEnableAutopilot = () => {
        localStorage.setItem('slaycount_autopilot', 'true');
        setIsAutopilot(true);
        setShowEnableModal(false);
    };

    const handleDisableAutopilot = () => {
        localStorage.setItem('slaycount_autopilot', 'false');
        setIsAutopilot(false);
        setShowDisableModal(false);
    };


    const { data: accounts = [] } = useQuery({
        queryKey: ['accounts', activeBusiness?.id],
        queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }),
        enabled: !!activeBusiness,
    });

    const handleFinalize = async (tx, accountId, paymentAccountId) => {
        // FIX #10: Cegah Finalize jika Akun atau Akun Pembayaran kosong
        if (!accountId || !paymentAccountId) {
            toast.error("Validasi Gagal: Akun Tujuan dan Akun Pembayaran harus diisi.");
            return;
        }

        const account = accounts.find(a => a.id === accountId);
        
        try {
            // 1. Panggil createJournalEntries terlebih dahulu (ini akan memvalidasi & menulis jurnal ke server)
            // Dan jika sukses, createJournalEntries di dalam journalEngine.js juga akan mengupdate 
            // status transaksi menjadi 'Final' dan menyimpan journal_id-nya secara aman!
            const updatedTx = { ...tx, account_id: accountId, account_name: account?.name || '' };
            await createJournalEntries(updatedTx, accounts, paymentAccountId);

            // 2. Catat Audit Log (Hanya jika sukses berkomitmen jurnal)
            await logAudit({
                action: AUDIT_ACTIONS.UPDATE,
                entityType: 'TRANSACTION',
                entityId: tx.id,
                before: tx,
                after: { ...tx, status: 'Final', account_id: accountId },
                reason: 'User validation and finalization successful'
            });

            toast.success("🎉 Transaksi berhasil divalidasi & Jurnal dicatat ke Ledger!");
        } catch (error) {
            console.error('[Validasi] Gagal melakukan finalisasi:', error);
            toast.error(`Gagal Finalisasi: ${error.message}`);
            // PENTING: Karena createJournalEntries gagal, status di database tetap 'Inbox',
            // transaksi tidak hangus atau hilang dari list Inbox!
            throw error; // Lempar kembali agar loading/saving state di UI berhenti dengan benar
        }

        queryClient.invalidateQueries({ queryKey: ['transactions-inbox', activeBusiness?.id] });
        queryClient.invalidateQueries({ queryKey: ['transactions', activeBusiness?.id] });
        queryClient.invalidateQueries({ queryKey: ['journal-entries', activeBusiness?.id] });
    };

    const handleReject = async (tx) => {
        // 2. Audit Log untuk Penolakan
        await logAudit({
            action: AUDIT_ACTIONS.DELETE,
            entityType: 'TRANSACTION',
            entityId: tx.id,
            before: tx,
            after: { status: 'Deleted' },
            reason: 'User rejected transaction from inbox'
        });

        // 3. SOFT DELETE: Ubah status, jangan hapus fisik
        await GoogleGenerativeAI.entities.Transaction.update(tx.id, {
            status: 'Deleted'
        });

        queryClient.invalidateQueries({ queryKey: ['transactions-inbox', activeBusiness?.id] });
    };

    if (!activeBusiness) return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu 🏢</div>;

    return (
        <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
            {/* Header & Autopilot Toggle */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Validasi ✅</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {inboxTx.length} transaksi menunggu — finalisasi otomatis buat jurnal
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    {isAutopilot ? (
                        <Button 
                            onClick={() => setShowDisableModal(true)} 
                            className="bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/50 hover:bg-cyber-lime/20 font-bold gap-2 relative overflow-hidden"
                        >
                            <motion.div 
                                animate={{ rotate: 360 }} 
                                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                className="absolute inset-0 border-2 border-cyber-lime/20 rounded-md" 
                            />
                            <Zap className="w-4 h-4 fill-cyber-lime" />
                            AUTOPILOT AKTIF
                        </Button>
                    ) : (
                        <Button 
                            variant="outline" 
                            onClick={() => setShowEnableModal(true)} 
                            className="border-border text-muted-foreground hover:text-primary hover:border-primary/50 gap-2"
                        >
                            <Bot className="w-4 h-4" />
                            Aktifkan Autopilot
                        </Button>
                    )}
                </div>
            </motion.div>

            {/* Modal Enable Autopilot */}
            <Dialog open={showEnableModal} onOpenChange={setShowEnableModal}>
                <DialogContent className="bg-card border-border max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Zap className="w-5 h-5 text-cyber-lime" /> Aktifkan Autopilot?
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground leading-relaxed pt-2">
                            <strong>Autopilot Mode</strong> memungkinkan <strong>101 Agen Swarm</strong> SlayCount untuk memproses dan menjurnal nota secara otomatis <strong>100% tanpa sentuhan manusia</strong> jika tingkat konsensus Swarm di atas 95% dan tidak ada keberatan dari agen manapun.
                            <br/><br/>
                            Nota yang masih diragukan atau memicu perdebatan antar agen (skor {'<'} 95%) akan tetap masuk ke Inbox ini untuk kamu review manual.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setShowEnableModal(false)} className="border-border">Batal</Button>
                        <Button onClick={handleEnableAutopilot} className="bg-gradient-to-r from-primary to-cyber-lime text-primary-foreground font-bold">
                            Oke, Aktifkan Sekarang! 🚀
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Disable Autopilot */}
            <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
                <DialogContent className="bg-card border-border max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-destructive">
                            <ShieldAlert className="w-5 h-5" /> Nonaktifkan Autopilot?
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground pt-2">
                            Apakah Anda yakin ingin menonaktifkan Autopilot? <br/>
                            Semua nota yang di-scan akan kembali masuk ke Inbox dan memerlukan validasi manual dari kamu, terlepas dari seberapa yakin AI tersebut.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setShowDisableModal(false)} className="border-border">Batal</Button>
                        <Button variant="destructive" onClick={handleDisableAutopilot} className="font-bold">
                            Ya, Nonaktifkan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : inboxTx.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bento-card">
                    <p className="text-5xl mb-4">🎉</p>
                    <h3 className="font-bold text-lg">Semua beres!</h3>
                    <p className="text-muted-foreground text-sm mt-1">Nggak ada transaksi yang perlu divalidasi.</p>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    {inboxTx.map((tx, i) => (
                        <ValidationCard
                            key={tx.id}
                            tx={tx}
                            accounts={accounts}
                            duplicates={duplicates}
                            onFinalize={handleFinalize}
                            onReject={handleReject}
                            delay={i * 0.05}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ValidationCard({ tx, accounts, duplicates = new Set(), onFinalize, onReject, delay }) {
    const [accountId, setAccountId] = useState(tx.account_id || '');
    const [paymentAccountId, setPaymentAccountId] = useState('');
    const [hasManuallySelectedAccount, setHasManuallySelectedAccount] = useState(false);
    const [hasManuallySelectedPayment, setHasManuallySelectedPayment] = useState(false);
    const [showAIChip, setShowAIChip] = useState(!!tx.ai_suggested_category);
    const [saving, setSaving] = useState(false);
    const [exploding, setExploding] = useState(false);
    const [finalized, setFinalized] = useState(false);

    // Akun relevan sesuai tipe transaksi
    const txAccounts = accounts.filter(a => {
        if (tx.type === 'Pemasukan') return a.type === 'Pendapatan';
        if (tx.type === 'Pengeluaran') return a.type === 'Beban';
        return true;
    });

    // Akun pembayaran: selalu Aset (Kas/Bank)
    const paymentAccounts = accounts.filter(a => a.type === 'Aset');

    // Auto-select when accounts load or tx changes
    useEffect(() => {
        if (accounts.length > 0) {
            const filteredTxAccounts = accounts.filter(a => {
                if (tx.type === 'Pemasukan') return a.type === 'Pendapatan';
                if (tx.type === 'Pengeluaran') return a.type === 'Beban';
                return true;
            });
            const filteredPaymentAccounts = accounts.filter(a => a.type === 'Aset');

            setAccountId(prev => {
                if (prev) return prev;
                if (tx.account_id) return tx.account_id;
                
                // 1. Try to match tx.ai_suggested_category (Exact match, then fuzzy match)
                if (tx.ai_suggested_category) {
                    const found = accounts.find(a => a.name?.toLowerCase() === tx.ai_suggested_category.toLowerCase());
                    if (found) return found.id;
                    const fuzzyFound = fuzzyMatchAccount(tx.ai_suggested_category, accounts);
                    if (fuzzyFound) return fuzzyFound.id;
                }
                
                // 2. Fallback to keyword matching in description/merchant_name
                const txDesc = (tx.description || tx.merchant_name || '').toLowerCase();
                const matched = filteredTxAccounts.find(a => txDesc.includes(a.name?.toLowerCase()));
                if (matched) return matched.id;
                
                // 3. Pemasukan fallback: Pendapatan Usaha
                if (tx.type === 'Pemasukan') {
                    const pendapatanUsaha = filteredTxAccounts.find(a => a.name?.toLowerCase().includes('pendapatan usaha') || a.code === '4-1001');
                    if (pendapatanUsaha) return pendapatanUsaha.id;
                }
                
                // 4. Default to first available account
                if (filteredTxAccounts.length > 0) return filteredTxAccounts[0].id;
                return '';
            });

            setPaymentAccountId(prev => {
                if (prev) return prev;
                if (tx.payment_account_id) return tx.payment_account_id;
                
                const txDesc = (tx.description || tx.merchant_name || '').toLowerCase();
                
                // 1. BCA matching
                if (txDesc.includes('bca')) {
                    const bca = filteredPaymentAccounts.find(a => a.name?.toLowerCase().includes('bca') || a.code === '1-1002');
                    if (bca) return bca.id;
                }
                // 2. Mandiri matching
                if (txDesc.includes('mandiri')) {
                    const mandiri = filteredPaymentAccounts.find(a => a.name?.toLowerCase().includes('mandiri') || a.code === '1-1003');
                    if (mandiri) return mandiri.id;
                }
                
                // 3. Default to Kas (1-1001)
                const kas = filteredPaymentAccounts.find(a => a.name?.toLowerCase() === 'kas' || a.code === '1-1001');
                if (kas) return kas.id;
                
                // 4. Default to first asset
                if (filteredPaymentAccounts.length > 0) return filteredPaymentAccounts[0].id;
                return '';
            });
        }
    }, [accounts, tx]);

    const handleFinalizeClick = async () => {
        if (!accountId || !paymentAccountId) return;
        setSaving(true);
        setExploding(true);
        try {
            await onFinalize(tx, accountId, paymentAccountId);
            setFinalized(true);
        } catch (err) {
            console.error('[Validasi] Finalisasi gagal:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRejectClick = async () => {
        setSaving(true);
        try {
            await onReject(tx);
            setFinalized(true);
        } catch (err) {
            console.error('[Validasi] Gagal menghapus:', err);
        } finally {
            setSaving(false);
        }
    };

    const categoryEmoji = (name) => {
        if (!name) return '📁';
        if (name.toLowerCase().includes('makan')) return '🍜';
        if (name.toLowerCase().includes('transport')) return '🚗';
        if (name.toLowerCase().includes('gaji')) return '👥';
        if (name.toLowerCase().includes('software') || name.toLowerCase().includes('langganan')) return '💻';
        if (name.toLowerCase().includes('marketing')) return '📣';
        if (name.toLowerCase().includes('sewa')) return '🏢';
        if (name.toLowerCase().includes('pendapatan')) return '💰';
        return '📁';
    };

    const canFinalize = accountId && paymentAccountId;

    // Check if the current selections are AI predictions
    const isTargetAutoSelected = accountId && !hasManuallySelectedAccount;
    const isPaymentAutoSelected = paymentAccountId && !hasManuallySelectedPayment;

    if (finalized) {
        return (
            <motion.div 
                initial={{ opacity: 1, scale: 1, height: 'auto' }}
                animate={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0, padding: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="overflow-hidden"
            />
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bento-card space-y-4 relative overflow-hidden"
        >
            <ParticleExplosion active={exploding} onDone={() => setExploding(false)} />
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                    {getTypeEmoji(tx.type)}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{tx.merchant_name || tx.description || 'Transaksi dari ' + tx.source}</p>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{tx.source}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.date)}</p>
                </div>
                <div className="text-right">
                    <p className={`text-lg font-bold ${tx.type === 'Pemasukan' ? 'text-cyber-lime' : 'text-destructive'}`}>
                        {tx.type === 'Pemasukan' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.type}</p>
                </div>
            </div>

            {/* Foto nota */}
            {tx.receipt_url && (
                <div className="rounded-xl overflow-hidden border border-border">
                    <img src={tx.receipt_url} alt="Nota" className="w-full max-h-48 object-cover" />
                </div>
            )}

            {/* PO Match Indicator */}
            {tx.po_match_status && tx.po_match_status !== 'No PO' && (
                <div className={`p-3 rounded-xl border ${
                    tx.po_match_status === 'Exact Match' ? 'bg-cyber-lime/5 border-cyber-lime/30' :
                    tx.po_match_status === 'Variance Match' ? 'bg-amber-400/5 border-amber-400/30' :
                    'bg-destructive/5 border-destructive/30'
                }`}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{
                            tx.po_match_status === 'Exact Match' ? '🟢' :
                            tx.po_match_status === 'Variance Match' ? '🟡' : '🔴'
                        }</span>
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                            tx.po_match_status === 'Exact Match' ? 'text-cyber-lime' :
                            tx.po_match_status === 'Variance Match' ? 'text-amber-400' :
                            'text-destructive'
                        }`}>
                            PO: {tx.po_match_status}
                        </span>
                        {tx.variance_percent > 0 && (
                            <span className="text-xs text-muted-foreground ml-auto">
                                Selisih {tx.variance_percent}%
                            </span>
                        )}
                    </div>
                    {tx.variance_reason && (
                        <p className="text-xs text-muted-foreground">{tx.variance_reason}</p>
                    )}
                </div>
            )}

            {/* AI Chip */}
            <AnimatePresence>
                {showAIChip && tx.ai_suggested_category && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -8 }}
                        className="p-3 rounded-xl bg-primary/5 border border-primary/20"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Bot className="w-4 h-4 text-primary" />
                            <span className="text-xs font-medium text-primary">Biyo AI nebak nih...</span>
                            {tx.swarm_confidence ? (
                                <span className="text-xs font-bold text-primary ml-auto">🛰️ {tx.swarm_confidence}% (101 Agen)</span>
                            ) : tx.ai_confidence ? (
                                <span className="text-xs text-muted-foreground ml-auto">{tx.ai_confidence}% yakin</span>
                            ) : null}
                        </div>
                        <p className="text-sm font-medium mb-1">
                            "{categoryEmoji(tx.ai_suggested_category)} Ini kayaknya {tx.ai_suggested_category} deh"
                        </p>
                        {tx.swarm_objections && (
                            <p className="text-xs text-amber-400 mb-2">⚠️ {tx.swarm_objections}</p>
                        )}
                        {tx.ai_reason && !tx.swarm_objections && <p className="text-xs text-muted-foreground mb-3">{tx.ai_reason}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={() => { 
                                    const match = accounts.find(a => a.name?.toLowerCase() === tx.ai_suggested_category?.toLowerCase());
                                    if (match) {
                                        setAccountId(match.id);
                                        setHasManuallySelectedAccount(false);
                                    }
                                    setShowAIChip(false); 
                                }}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
                            >✅ Yep, bener!</button>
                            <button
                                onClick={() => setShowAIChip(false)}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-secondary text-muted-foreground text-sm hover:bg-secondary/80 transition-colors"
                            >❌ Hmm, bukan deh</button>
                        </div>
                        {/* Ghost #3 Fix: Swarm Re-Check Button */}
                        <button
                            onClick={async () => {
                                const result = await validateJournalWithSwarm(tx, {});
                                if (result) {
                                    await GoogleGenerativeAI.entities.Transaction.update(tx.id, {
                                        swarm_confidence: result.confidenceScore || 0,
                                        swarm_verdict: result.isFinal ? 'APPROVED' : 'REVIEW',
                                        swarm_objections: (result.objections || []).join('; '),
                                    });
                                }
                            }}
                            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-800/50 text-slate-400 text-xs hover:bg-slate-700/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5 border border-slate-700/50"
                        >
                            <RefreshCw className="w-3 h-3" />
                            🛰️ Swarm Re-Check (101 Agen)
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Double-entry fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/40 border border-border">
                <div>
                    <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-destructive inline-block"></span>
                        {tx.type === 'Pemasukan' ? 'Akun Pendapatan (Kredit)' : 'Akun Beban (Debit)'}
                        {isTargetAutoSelected && (
                            <span className="text-[10px] text-cyber-lime bg-cyber-lime/10 px-1.5 py-0.5 rounded border border-cyber-lime/20 flex items-center gap-0.5 animate-pulse font-sans">
                                <Sparkles className="w-2.5 h-2.5" /> Tebakan AI
                            </span>
                        )}
                    </label>
                    <Select 
                        value={accountId} 
                        onValueChange={(val) => { 
                            setAccountId(val); 
                            setHasManuallySelectedAccount(true); 
                        }}
                    >
                        <SelectTrigger className="bg-background border-border text-sm">
                            <SelectValue placeholder="Pilih akun..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {txAccounts.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                    <span className="text-muted-foreground mr-1 font-mono text-xs">{a.code}</span> {a.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyber-lime inline-block"></span>
                        {tx.type === 'Pemasukan' ? 'Diterima di (Debit)' : 'Dibayar dari (Kredit)'}
                        {isPaymentAutoSelected && (
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 flex items-center gap-0.5 animate-pulse font-sans">
                                <Bot className="w-2.5 h-2.5" /> Auto-Select
                            </span>
                        )}
                    </label>
                    <Select 
                        value={paymentAccountId} 
                        onValueChange={(val) => { 
                            setPaymentAccountId(val); 
                            setHasManuallySelectedPayment(true); 
                        }}
                    >
                        <SelectTrigger className="bg-background border-border text-sm">
                            <SelectValue placeholder="Kas / Bank..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {paymentAccounts.map(a => (
                                <SelectItem key={a.id} value={a.id}>
                                    <span className="text-muted-foreground mr-1 font-mono text-xs">{a.code}</span> {a.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Jurnal preview */}
            {canFinalize && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs font-mono space-y-1">
                    <p className="text-primary font-semibold mb-2">📒 Preview Jurnal:</p>
                    {tx.type === 'Pengeluaran' ? (
                        <>
                            <div className="flex justify-between"><span className="text-foreground">Dr. {accounts.find(a => a.id === accountId)?.name}</span><span className="text-cyber-lime">{formatRupiah(tx.amount)}</span></div>
                            <div className="flex justify-between pl-4"><span className="text-muted-foreground">Cr. {accounts.find(a => a.id === paymentAccountId)?.name}</span><span className="text-destructive">{formatRupiah(tx.amount)}</span></div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between"><span className="text-foreground">Dr. {accounts.find(a => a.id === paymentAccountId)?.name}</span><span className="text-cyber-lime">{formatRupiah(tx.amount)}</span></div>
                            <div className="flex justify-between pl-4"><span className="text-muted-foreground">Cr. {accounts.find(a => a.id === accountId)?.name}</span><span className="text-destructive">{formatRupiah(tx.amount)}</span></div>
                        </>
                    )}
                </div>
            )}

            {/* HUD Advice bawah */}
            {canFinalize && !saving && (
                <div className="px-1">
                    <HudTypewriter
                        text={`[AI_ADVICE]: Ready to inject into ledger. Account ${accounts.find(a => a.id === accountId)?.code || '—'} mapped. Execute finalization?`}
                        delay={0.2}
                        speed={20}
                        color="#00f3ff90"
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={saving} onClick={handleRejectClick} className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} Hapus
                </Button>
                <motion.button
                    onClick={handleFinalizeClick}
                    disabled={saving || !canFinalize}
                    whileHover={canFinalize ? { scale: 1.02 } : {}}
                    whileTap={canFinalize ? { scale: 0.97 } : {}}
                    animate={saving ? {
                        boxShadow: ['0 0 0px #00f3ff', '0 0 20px #00f3ff', '0 0 40px #4ade80', '0 0 60px #00f3ff'],
                    } : canFinalize ? {
                        boxShadow: ['0 0 4px #00f3ff40', '0 0 12px #00f3ff60', '0 0 4px #00f3ff40'],
                    } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 px-3 text-sm font-semibold rounded-md bg-gradient-to-r from-primary to-cyber-lime text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="font-mono text-xs tracking-widest">INJECTING...</span>
                        </>
                    ) : (
                        <>
                            {duplicates.has(tx.id) && (
                                <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> POTENSI DUPLIKAT
                                </Badge>
                            )}
                            <CheckCircle className="w-3.5 h-3.5" />
                            Finalisasi + Jurnal ✅
                        </>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
}