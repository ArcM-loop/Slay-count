import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah, formatDate, getTypeEmoji, getStatusColor } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Upload, Camera, Trash2, Pencil } from 'lucide-react';
import ScanNotaModal from '@/components/transactions/ScanNotaModal';
import ImportCSVModal from '@/components/transactions/ImportCSVModal';
import EditTransactionModal from '@/components/transactions/EditTransactionModal';

import { deleteJournalEntries } from '@/lib/journalEngine';

const STATUS_TABS = ['Semua', 'Inbox', 'Divalidasi', 'Final'];
const TYPE_FILTERS = ['Semua', 'Pemasukan', 'Pengeluaran', 'Transfer'];

export default function Transaksi() {
    const { activeBusiness } = useBusiness();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Semua');
    const [typeFilter, setTypeFilter] = useState('Semua');
    const [showScan, setShowScan] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editingTx, setEditingTx] = useState(null);

    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['transactions', activeBusiness?.id],
        queryFn: () => GoogleGenerativeAI.entities.Transaction.filter({ business_id: activeBusiness.id }, '-date', 200),
        enabled: !!activeBusiness,
    });

    const filtered = transactions.filter(tx => {
        const matchSearch = !search || tx.description?.toLowerCase().includes(search.toLowerCase()) || tx.merchant_name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'Semua' || tx.status === statusFilter;
        const matchType = typeFilter === 'Semua' || tx.type === typeFilter;
        return matchSearch && matchStatus && matchType;
    });

    const handleDelete = async (id) => {
        await GoogleGenerativeAI.entities.Transaction.delete(id);
        await deleteJournalEntries(id);
        queryClient.invalidateQueries({ queryKey: ['transactions', activeBusiness?.id] });
        queryClient.invalidateQueries({ queryKey: ['journal-entries', activeBusiness?.id] });
    };

    if (!activeBusiness) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu ya 🏢</div>;
    }

    return (
        <div className="p-4 lg:p-6 space-y-5 max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Transaksi 💳</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} transaksi ditemukan</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowScan(true)} className="border-border gap-2">
                        <Camera className="w-4 h-4" /> Scan Nota
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="border-border gap-2">
                        <Upload className="w-4 h-4" /> Import CSV
                    </Button>
                </div>
            </motion.div>

            {/* Filters */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari transaksi..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 bg-secondary border-border"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {STATUS_TABS.map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${statusFilter === s ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                            {s}
                        </button>
                    ))}
                    <div className="w-px bg-border mx-1" />
                    {TYPE_FILTERS.map(t => (
                        <button key={t} onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${typeFilter === t ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transaction list */}
            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-4xl mb-3">📭</p>
                    <p className="text-muted-foreground">Nggak ada transaksi yang cocok</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((tx, i) => (
                        <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                                {getTypeEmoji(tx.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold truncate">{tx.description || tx.merchant_name || 'Tanpa deskripsi'}</p>
                                    {tx.source !== 'Manual' && <span className="text-xs text-muted-foreground">· {tx.source}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.date)} · {tx.account_name || '—'}</p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-lg border ${getStatusColor(tx.status)}`}>{tx.status}</span>
                                <p className={`text-sm font-bold ${tx.type === 'Pemasukan' ? 'text-cyber-lime' : 'text-destructive'}`}>
                                    {tx.type === 'Pemasukan' ? '+' : '-'}{formatRupiah(tx.amount)}
                                </p>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => setEditingTx(tx)}
                                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tx.id)}
                                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <ScanNotaModal open={showScan} onClose={() => setShowScan(false)} />
            <ImportCSVModal open={showImport} onClose={() => setShowImport(false)} />
            <EditTransactionModal
                transaction={editingTx}
                open={!!editingTx}
                onClose={() => { setEditingTx(null); queryClient.invalidateQueries({ queryKey: ['transactions', activeBusiness?.id] }); }}
            />
        </div>
    );
}