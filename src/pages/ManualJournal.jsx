import React, { useState } from 'react';
import { 
    Plus, 
    Trash2, 
    Save, 
    AlertTriangle, 
    CheckCircle2,
    ArrowLeftRight,
    Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useBusiness } from '@/lib/BusinessContext';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { auditLogger } from '@/lib/auditLogger';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const ManualJournal = () => {
    const { activeBusiness } = useBusiness();
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [rows, setRows] = useState([
        { id: 1, account_id: '', debit: 0, credit: 0 },
        { id: 2, account_id: '', debit: 0, credit: 0 },
    ]);

    // Fetch Accounts for dropdown
    const { data: accounts = [] } = useQuery({
        queryKey: ['accounts', activeBusiness?.id],
        queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }),
        enabled: !!activeBusiness
    });

    const addRow = () => {
        setRows([...rows, { id: Date.now(), account_id: '', debit: 0, credit: 0 }]);
    };

    const removeRow = (id) => {
        if (rows.length <= 2) return;
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id, field, value) => {
        setRows(rows.map(r => {
            if (r.id === id) {
                const newRow = { ...r, [field]: value };
                // If debit is entered, credit should be 0 and vice versa
                if (field === 'debit' && value > 0) newRow.credit = 0;
                if (field === 'credit' && value > 0) newRow.debit = 0;
                return newRow;
            }
            return r;
        }));
    };

    const totalDebit = rows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
    const totalCredit = rows.reduce((sum, r) => sum + Number(r.credit || 0), 0);
    const isBalanced = totalDebit === totalCredit && totalDebit > 0;
    const difference = Math.abs(totalDebit - totalCredit);

    const handleSave = async () => {
        if (!isBalanced) {
            toast.error("Jurnal tidak seimbang! Total Debit harus sama dengan Total Kredit.");
            return;
        }

        try {
            const entries = rows.map(r => {
                const acc = accounts.find(a => a.id === r.account_id);
                return {
                    business_id: activeBusiness.id,
                    account_id: r.account_id,
                    account_code: acc.code,
                    account_name: acc.name,
                    account_type: acc.type,
                    debit: Number(r.debit),
                    credit: Number(r.credit),
                    description: description || 'Manual Adjustment',
                    date: date,
                    entry_type: 'manual_adjustment',
                    created_at: new Date().toISOString()
                };
            });

            await GoogleGenerativeAI.entities.JournalEntry.bulkCreate(entries);
            
            // Audit Log using centralized logger
            await auditLogger.log(
                activeBusiness.id, 
                'CREATE_MANUAL_JOURNAL', 
                `Created manual journal: ${description || 'No Ref'}. Lines: ${rows.length}. Total: ${totalDebit}`
            );

            toast.success("Jurnal manual berhasil disimpan!");
            setDescription('');
            setRows([
                { id: 1, account_id: '', debit: 0, credit: 0 },
                { id: 2, account_id: '', debit: 0, credit: 0 },
            ]);
        } catch (error) {
            toast.error("Gagal menyimpan jurnal.");
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-[1200px] mx-auto pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Entri Jurnal Manual</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-cyber-lime" />
                        Buat penyesuaian akuntansi (AJE) profesional
                    </p>
                </div>
                <Button 
                    onClick={handleSave} 
                    disabled={!isBalanced}
                    className="bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                >
                    <Save className="w-4 h-4 mr-2" /> Posting Jurnal
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 bg-black/40 border-white/10 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Detail Jurnal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground">TANGGAL JURNAL</label>
                                <Input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-black/50 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground">KETERANGAN / REFERENSI</label>
                                <Input 
                                    placeholder="Contoh: Penyesuaian akhir bulan..." 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="bg-black/50 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="mt-8">
                            <table className="w-full">
                                <thead className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-white/10">
                                    <tr>
                                        <th className="pb-4 text-left">Akun</th>
                                        <th className="pb-4 text-right w-32">Debit</th>
                                        <th className="pb-4 text-right w-32">Kredit</th>
                                        <th className="pb-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {rows.map((row) => (
                                        <tr key={row.id}>
                                            <td className="py-4">
                                                <select 
                                                    value={row.account_id}
                                                    onChange={(e) => updateRow(row.id, 'account_id', e.target.value)}
                                                    className="w-full bg-transparent text-sm focus:outline-none text-white border-none"
                                                >
                                                    <option value="" disabled className="bg-black text-muted-foreground">Pilih Akun...</option>
                                                    {accounts.map(acc => (
                                                        <option key={acc.id} value={acc.id} className="bg-[#111]">{acc.code} - {acc.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-4">
                                                <Input 
                                                    type="number" 
                                                    className="text-right bg-transparent border-none focus-visible:ring-0 h-8" 
                                                    value={row.debit || ''}
                                                    onChange={(e) => updateRow(row.id, 'debit', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-4">
                                                <Input 
                                                    type="number" 
                                                    className="text-right bg-transparent border-none focus-visible:ring-0 h-8" 
                                                    value={row.credit || ''}
                                                    onChange={(e) => updateRow(row.id, 'credit', e.target.value)}
                                                />
                                            </td>
                                            <td className="py-4 text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-400"
                                                    onClick={() => removeRow(row.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Button variant="ghost" className="mt-4 text-cyber-lime hover:text-cyber-lime hover:bg-cyber-lime/10 text-xs font-bold" onClick={addRow}>
                                <Plus className="w-3 h-3 mr-2" /> TAMBAH BARIS
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-md overflow-hidden">
                        <CardHeader className={isBalanced ? "bg-green-500/10" : "bg-red-500/10"}>
                            <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
                                {isBalanced ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                                Journal Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Total Debit</span>
                                <span className="text-sm font-bold text-cyber-lime">{new Intl.NumberFormat('id-ID').format(totalDebit)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Total Kredit</span>
                                <span className="text-sm font-bold text-white">{new Intl.NumberFormat('id-ID').format(totalCredit)}</span>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Selisih (Out of Balance)</span>
                                <span className={`text-sm font-bold ${difference === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {new Intl.NumberFormat('id-ID').format(difference)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-primary/10 border-primary/20 backdrop-blur-md">
                        <CardContent className="pt-6 space-y-3">
                            <div className="flex items-center gap-2 text-primary">
                                <Info className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Audit Tip</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Jurnal manual akan dicatat dalam Audit Trail. Gunakan ini hanya untuk penyesuaian akhir tahun atau koreksi kesalahan yang tidak bisa dilakukan lewat modul transaksi.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ManualJournal;
