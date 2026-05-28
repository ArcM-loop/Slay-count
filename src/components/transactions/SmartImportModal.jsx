import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
    Upload, 
    FileSpreadsheet, 
    ArrowRight, 
    Check, 
    AlertCircle, 
    Zap, 
    X,
    Table as TableIcon,
    Settings2,
    Database,
    Trash2,
    Info
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    TooltipProvider, 
    Tooltip, 
    TooltipTrigger, 
    TooltipContent 
} from "@/components/ui/tooltip";
import { analyzeColumns, cleanData } from '@/lib/smartImportEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { visualizerStore } from '@/lib/swarm/visualizerStore';

const SmartImportModal = ({ isOpen, onClose, onComplete }) => {
    const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Review
    const [fileData, setFileData] = useState({ headers: [], rows: [], fileName: '' });
    const [mapping, setMapping] = useState({});
    const [cleanedData, setCleanedData] = useState([]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        visualizerStore.startAction('DataAgent', 'Membaca file Excel/CSV secara pintar...');
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Ambil sheet pertama
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Konversi worksheet ke array of arrays (2D Array)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                if (jsonData.length === 0) {
                    throw new Error("File Excel kosong atau tidak terbaca.");
                }

                // Baris pertama adalah headers
                const headers = jsonData[0].map(h => String(h || '').trim());
                // Baris selanjutnya adalah rows
                const rows = jsonData.slice(1).map(row => row.map(c => String(c || '').trim()));

                setFileData({ headers, rows, fileName: file.name });

                // AI Analyze Columns
                setTimeout(() => {
                    const initialMapping = analyzeColumns(headers);
                    setMapping(initialMapping);
                    setStep(2);
                    visualizerStore.endAction('Struktur file berhasil dipetakan.', 2000);
                }, 500);

            } catch (err) {
                console.error(err);
                alert("Gagal membaca file: " + err.message);
                visualizerStore.endAction('Gagal membaca file.', 2000);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleStartReview = async () => {
        visualizerStore.startAction('AuditAgent', 'Membersihkan dan menstandarisasi format data...');
        // Gunakan Engine untuk bersihkan data berdasarkan mapping user
        try {
            const result = await cleanData(fileData.rows, mapping, [
                { name: 'Beban Operasional', keywords: ['listrik', 'air', 'internet', 'telkom'] },
                { name: 'Beban Kendaraan', keywords: ['bensin', 'parkir', 'service', 'pertamina'] },
                { name: 'Beban Gaji', keywords: ['gaji', 'bonus', 'thr'] },
                { name: 'Pendapatan Usaha', keywords: ['penjualan', 'invoice', 'lunas'] },
            ]);
            setCleanedData(result);
            setStep(3);
            visualizerStore.endAction('Data berhasil dibersihkan.', 2000);
        } catch (err) {
            console.error(err);
            visualizerStore.endAction('Gagal memproses data.', 2000);
        }
    };

    const handleFinalImport = () => {
        visualizerStore.startAction('AuditAgent', 'Menyimpan data impor ke Buku Besar...');
        onComplete(cleanedData);
        setTimeout(() => visualizerStore.endAction('Impor berhasil diselesaikan.', 3000), 1000);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[#0c0c0c] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header Modal */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <Zap className="w-5 h-5 text-primary fill-current" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Biyo Smart Import</h2>
                            <p className="text-xs text-muted-foreground">Otomasi mapping data Excel berantakan ke SlayCount</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Progress Bar */}
                <div className="flex h-1 bg-white/5">
                    <div className={`h-full transition-all duration-500 bg-primary ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-6">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center space-y-4 hover:border-primary/50 transition-colors group relative cursor-pointer">
                                    <input 
                                        type="file" 
                                        accept=".csv,.xlsx" 
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                        <FileSpreadsheet className="w-8 h-8 text-muted-foreground group-hover:text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">Upload File Excel / CSV</h3>
                                        <p className="text-sm text-muted-foreground">Tarik file ke sini atau klik untuk memilih file</p>
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <Badge variant="outline" className="text-[10px]">.XLSX</Badge>
                                        <Badge variant="outline" className="text-[10px]">.CSV</Badge>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3">
                                        <Info className="w-5 h-5 text-blue-400 shrink-0" />
                                        <p className="text-xs text-blue-400">Nggak perlu template khusus! Biyo bakal tebak isi kolommu secara otomatis.</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20 flex gap-3">
                                        <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                                        <p className="text-xs text-orange-400">Pastikan baris pertama adalah judul kolom agar mapping lebih akurat.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Settings2 className="w-5 h-5 text-cyber-lime" /> Mapping Kolom
                                    </h3>
                                    <Badge className="bg-cyber-lime/10 text-cyber-lime">{fileData.fileName}</Badge>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {Object.entries(mapping).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-primary/30 transition-colors">
                                            <div className="w-32">
                                                <span className="text-sm font-bold capitalize text-muted-foreground">{key}</span>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                            <div className="flex-1">
                                                <Select 
                                                    value={value?.headerName} 
                                                    onValueChange={(val) => {
                                                        const idx = fileData.headers.indexOf(val);
                                                        setMapping(prev => ({ ...prev, [key]: { index: idx, headerName: val } }));
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-black border-white/10">
                                                        <SelectValue placeholder="Pilih Kolom..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#1a1a1a] border-white/10">
                                                        {fileData.headers.map(h => (
                                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-10 flex justify-center">
                                                {value ? <Check className="w-5 h-5 text-cyber-lime" /> : <AlertCircle className="w-5 h-5 text-orange-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3 mt-8">
                                    <Button variant="ghost" onClick={() => setStep(1)}>Kembali</Button>
                                    <Button className="bg-primary text-primary-foreground font-bold" onClick={handleStartReview}>
                                        Mulai Review Data <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Database className="text-primary w-5 h-5" /> Preview & Cleaning
                                    </h3>
                                    <div className="text-xs text-muted-foreground">
                                        Total: <span className="text-white font-bold">{cleanedData.length} baris</span> terdeteksi
                                    </div>
                                </div>

                                <div className="border border-white/10 rounded-xl overflow-hidden max-h-[400px] overflow-auto scrollbar-thin">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/5 sticky top-0 z-10 border-b border-white/10">
                                            <tr>
                                                <th className="p-3">Tanggal</th>
                                                <th className="p-3">Keterangan</th>
                                                <th className="p-3 text-right">Nominal</th>
                                                <th className="p-3">Akun / Kategori</th>
                                                <th className="p-3 text-center">AI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {cleanedData.map((row, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-3 text-xs font-mono text-muted-foreground">{row.date}</td>
                                                    <td className="p-3 font-medium">{row.description}</td>
                                                    <td className="p-3 text-right font-mono text-cyber-lime">
                                                        {new Intl.NumberFormat('id-ID').format(row.amount)}
                                                    </td>
                                                    <td className="p-3">
                                                        <Badge variant={row.isSuggested ? "secondary" : "outline"} className={row.isSuggested ? "bg-blue-500/10 text-blue-400" : ""}>
                                                            {row.category || 'Belum Ditentukan'}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {row.isSuggested && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <Zap className="w-4 h-4 text-primary fill-current animate-pulse" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>AI menebak akun ini berdasarkan deskripsi.</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex justify-between items-center mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                    <div className="flex gap-2 items-center">
                                        <Zap className="w-5 h-5 text-primary fill-current" />
                                        <p className="text-xs text-muted-foreground">
                                            <span className="text-white font-bold">{cleanedData.filter(d => d.isSuggested).length} baris</span> dikategorikan otomatis oleh Biyo.
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="ghost" onClick={() => setStep(2)}>Cek Mapping</Button>
                                        <Button className="bg-primary text-primary-foreground font-bold" onClick={handleFinalImport}>
                                            Selesaikan Import
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default SmartImportModal;
