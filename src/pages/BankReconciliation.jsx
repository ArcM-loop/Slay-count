import React, { useState, useEffect, useMemo } from 'react';
import { 
    FileText, 
    Upload, 
    CheckCircle2, 
    AlertCircle, 
    Zap, 
    ArrowRightLeft, 
    Search,
    Filter,
    Plus,
    Download,
    Info,
    ChevronRight,
    HelpCircle,
    Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { useBusiness } from '@/lib/BusinessContext';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { runBatchMatch } from '@/lib/swarm/agents/bankMatchAgent';

const BankReconciliation = () => {
    const { activeBusiness } = useBusiness();
    const [isUploading, setIsUploading] = useState(false);
    const [reconProgress, setReconProgress] = useState(0);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [matchSummary, setMatchSummary] = useState(null);
    
    // 1. Fetch Accounts (Hanya Kas & Bank)
    const { data: accounts = [] } = useQuery({
        queryKey: ['accounts', activeBusiness?.id],
        queryFn: async () => {
            const all = await GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id });
            return all.filter(a => a.type.toLowerCase().includes('bank') || a.type.toLowerCase().includes('cash'));
        },
        enabled: !!activeBusiness
    });

    // Auto-select first account
    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts]);

    // 2. Fetch Journal Entries for the selected account
    const { data: journalEntries = [], isLoading: journalsLoading } = useQuery({
        queryKey: ['bank-journals', selectedAccountId],
        queryFn: () => GoogleGenerativeAI.entities.JournalEntry.filter({ 
            business_id: activeBusiness.id,
            account_id: selectedAccountId 
        }, '-date', 500),
        enabled: !!selectedAccountId
    });

    // 3. Mock Bank Statement (Simulasi upload PDF/CSV)
    // Dalam realita, ini akan di-parse dari file yang diunggah
    const [bankRows, setBankRows] = useState([
        { id: 'b1', date: '2024-05-01', desc: 'TRF DR BPK BUDI - INV 001', amount: 2500000, type: 'CR', status: 'unmatched' },
        { id: 'b2', date: '2024-05-02', desc: 'ADM BANK BULANAN', amount: -6500, type: 'DB', status: 'unmatched' },
        { id: 'b3', date: '2024-05-03', desc: 'PAYMENT TO PT SUMBER MAKMUR', amount: -1200000, type: 'DB', status: 'unmatched' },
    ]);

    // 4. Calculate Book Balance
    const bookBalance = useMemo(() => {
        return journalEntries.reduce((sum, entry) => sum + (entry.debit || 0) - (entry.credit || 0), 0);
    }, [journalEntries]);

    // 5. Smart Auto Match — Menggunakan BankMatchAgent Engine
    const handleAutoMatch = async () => {
        setIsUploading(true);
        setReconProgress(0);

        try {
            // Simulasi progress UI (operasi cepat)
            const progressInterval = setInterval(() => {
                setReconProgress(p => Math.min(p + 15, 90));
            }, 100);

            // Jalankan algoritma matching berlapis
            const { results, summary } = runBatchMatch(bankRows, journalEntries);

            clearInterval(progressInterval);
            setReconProgress(100);

            // Update bankRows dengan hasil matching
            setBankRows(prev => prev.map(row => {
                const matchResult = results.find(r => r.bankRowId === row.id);
                if (!matchResult) return row;

                return {
                    ...row,
                    status: matchResult.status.toLowerCase(),   // 'matched' | 'suggested' | 'unmatched'
                    matchId: matchResult.journalMatch?.id || null,
                    confidence: matchResult.confidence,
                    matchTier: matchResult.matchTier,
                    suggestion: matchResult.suggestion
                        ? matchResult.suggestion.category
                        : matchResult.journalMatch?.description || null,
                    needsReview: matchResult.needsManualReview
                };
            }));

            // Simpan summary untuk ditampilkan
            setMatchSummary(summary);

        } catch (err) {
            console.error('[BankRecon] Auto-match failed:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        Bank Reconciliation
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-cyber-lime" />
                        Sinkronkan buku besar dengan rekening koran asli
                    </p>
                </div>
                <div className="flex gap-3">
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-[240px] bg-black/40 border-white/10">
                            <SelectValue placeholder="Pilih Akun Bank" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111] border-white/10 text-white">
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button className="bg-primary text-primary-foreground font-bold">
                        <Upload className="w-4 h-4 mr-2" /> Import Statement
                    </Button>
                </div>
            </div>

            {/* Summary Bento Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-black/40 border-white/10 backdrop-blur-md">
                    <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Saldo Rekening Koran</div>
                        <div className="text-2xl font-bold text-cyber-lime">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(12450000)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Info className="w-3 h-3" /> Data dari file yang diunggah
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-white/10 backdrop-blur-md">
                    <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Saldo Buku SlayCount</div>
                        <div className="text-2xl font-bold text-white">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(bookBalance)}
                        </div>
                        <div className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                            <Database className="w-3 h-3" /> Real-time dari Ledger
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-black/40 border-white/10 backdrop-blur-md">
                    <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Tingkat Kecocokan</div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className={bankRows.every(r => r.status === 'matched') ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}>
                                {Math.round((bankRows.filter(r => r.status === 'matched').length / bankRows.length) * 100)}% Matched
                            </Badge>
                        </div>
                        <Progress value={(bankRows.filter(r => r.status === 'matched').length / bankRows.length) * 100} className="h-1.5 mt-3" />
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-primary/20 to-cyber-lime/10 border-primary/20 backdrop-blur-md relative overflow-hidden group">
                    <CardContent className="pt-6 relative z-10">
                        <div className="text-sm font-bold text-cyber-lime mb-2 flex items-center gap-1">
                            <Zap className="w-4 h-4 fill-current" /> BIYO SMART RECON
                        </div>
                        <Button 
                            onClick={handleAutoMatch}
                            disabled={isUploading || !selectedAccountId}
                            className="w-full bg-cyber-lime text-black hover:bg-cyber-lime/90 font-bold"
                        >
                            {isUploading ? 'Matching...' : 'Jalankan Auto-Match'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Main Recon Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-400px)]">
                {/* Left Side: Bank Statement */}
                <Card className="bg-black/20 border-white/10 flex flex-col overflow-hidden">
                    <CardHeader className="border-b border-white/10 bg-white/5 py-3 px-4 flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <CardTitle className="text-sm uppercase">Rekening Koran</CardTitle>
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-white/10">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#0a0a0a] text-xs text-muted-foreground z-10 border-b border-white/10">
                                <tr>
                                    <th className="p-4">Tanggal</th>
                                    <th className="p-4">Keterangan</th>
                                    <th className="p-4 text-right">Nominal</th>
                                    <th className="p-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {bankRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm text-muted-foreground">{row.date}</td>
                                        <td className="p-4 text-sm font-medium">{row.desc}</td>
                                        <td className={`p-4 text-sm text-right ${row.amount > 0 ? 'text-cyber-lime' : 'text-white'}`}>
                                            {new Intl.NumberFormat('id-ID').format(row.amount)}
                                        </td>
                                        <td className="p-4 text-center">
                                            {row.status === 'matched' ? (
                                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Matched</Badge>
                                            ) : row.status === 'suggested' ? (
                                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse">Suggest</Badge>
                                            ) : (
                                                <Badge variant="outline" className="opacity-50">Open</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Right Side: SlayCount Books */}
                <Card className="bg-black/20 border-white/10 flex flex-col overflow-hidden">
                    <CardHeader className="border-b border-white/10 bg-white/5 py-3 px-4 flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-cyber-lime" />
                            <CardTitle className="text-sm uppercase">Buku Besar SlayCount</CardTitle>
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-white/10">
                        {journalsLoading ? (
                            <div className="p-10 text-center text-muted-foreground animate-pulse">Memuat data ledger...</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#0a0a0a] text-xs text-muted-foreground z-10 border-b border-white/10">
                                    <tr>
                                        <th className="p-4">Tanggal</th>
                                        <th className="p-4">Keterangan</th>
                                        <th className="p-4 text-right">Nominal</th>
                                        <th className="p-4 text-center">Match</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {journalEntries.map((entry) => {
                                        const isMatched = bankRows.some(br => br.matchId === entry.id);
                                        const amount = (entry.debit || 0) - (entry.credit || 0);
                                        return (
                                            <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-sm text-muted-foreground">{entry.date}</td>
                                                <td className="p-4 text-sm">{entry.description}</td>
                                                <td className={`p-4 text-sm text-right ${amount > 0 ? 'text-cyber-lime' : 'text-white'}`}>
                                                    {new Intl.NumberFormat('id-ID').format(amount)}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {isMatched ? (
                                                        <CheckCircle2 className="w-4 h-4 text-cyber-lime mx-auto" />
                                                    ) : (
                                                        <div className="w-4 h-4 border border-white/10 rounded mx-auto" />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>

            {/* Recon Progress Overlay */}
            <AnimatePresence>
                {isUploading && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-black border border-white/10 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl"
                        >
                            <Zap className="w-10 h-10 text-cyber-lime mx-auto animate-pulse fill-current" />
                            <h3 className="text-xl font-bold text-white">Biyo AI Matching...</h3>
                            <Progress value={reconProgress} className="h-2 bg-white/5" />
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Membandingkan nominal dan tanggal...</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BankReconciliation;
