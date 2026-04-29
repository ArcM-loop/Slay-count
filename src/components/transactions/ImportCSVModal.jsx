import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, AlertCircle, Loader2, Sparkles, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { parseCSV } from '@/lib/utils';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';

export default function ImportCSVModal({ open, onClose, businessId, onImportSuccess }) {
    const [file, setFile] = useState(null);
    const [step, setStep] = useState('UPLOAD'); // UPLOAD, MAP, IMPORTING
    const [rawData, setRawData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [error, setError] = useState(null);
    const [aiThinking, setAiThinking] = useState(false);
    
    // Mapping state
    const [mapping, setMapping] = useState({
        date: '',
        description: '',
        amount: '',
        type: ''
    });

    const resetState = () => {
        setFile(null);
        setStep('UPLOAD');
        setRawData([]);
        setHeaders([]);
        setError(null);
        setAiThinking(false);
        setMapping({ date: '', description: '', amount: '', type: '' });
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        setAiThinking(true);
        setStep('MAP');
        
        try {
            const data = await parseCSV(selectedFile);
            if (data.length === 0) throw new Error("File CSV kosong.");
            
            setRawData(data);
            const extractedHeaders = Object.keys(data[0] || {}).filter(h => h.trim() !== '');
            setHeaders(extractedHeaders);

            // SIMULASI AI MEMBACA HEADER (AI Smart Mapper)
            // Di produksi nyata, ini bisa melempar header ke Gemini API
            setTimeout(() => {
                const guessMapping = { date: '', description: '', amount: '', type: '' };
                
                extractedHeaders.forEach(h => {
                    const lowerH = h.toLowerCase();
                    if (lowerH.includes('tgl') || lowerH.includes('tanggal') || lowerH.includes('date')) {
                        guessMapping.date = h;
                    }
                    if (lowerH.includes('ket') || lowerH.includes('desc') || lowerH.includes('uraian') || lowerH.includes('nama')) {
                        guessMapping.description = h;
                    }
                    if (lowerH.includes('jumlah') || lowerH.includes('nominal') || lowerH.includes('amount') || lowerH.includes('total') || lowerH.includes('mutasi')) {
                        guessMapping.amount = h;
                    }
                    if (lowerH.includes('tipe') || lowerH.includes('jenis') || lowerH.includes('type') || lowerH.includes('d/k')) {
                        guessMapping.type = h;
                    }
                });

                setMapping(guessMapping);
                setAiThinking(false);
            }, 1500); // Simulasi delay AI 1.5 detik

        } catch (err) {
            setError('Gagal membaca file CSV. Pastikan formatnya benar.');
            setStep('UPLOAD');
            setAiThinking(false);
            console.error(err);
        }
    };

    const handleImport = async () => {
        if (!mapping.date || !mapping.description || !mapping.amount) {
            setError("Kolom Tanggal, Keterangan, dan Nominal wajib di-map!");
            return;
        }

        setStep('IMPORTING');
        setError(null);

        try {
            // Map data CSV ke format transaksi SlayCount
            const transactions = rawData.map(row => {
                // Bersihkan nominal dari koma/titik jika ada (misal: "50.000,00" -> 50000)
                let rawAmount = String(row[mapping.amount] || '0').replace(/[^0-9.-]+/g, "");
                
                // Cek tipe (kalau gak ada mapping tipe, asumsikan pengeluaran)
                let txType = 'Pengeluaran';
                if (mapping.type && row[mapping.type]) {
                    const t = String(row[mapping.type]).toLowerCase();
                    if (t.includes('masuk') || t.includes('in') || t.includes('pendapatan') || t.includes('kredit')) {
                        txType = 'Pemasukan';
                    }
                }

                return {
                    business_id: businessId,
                    date: row[mapping.date] || new Date().toISOString().split('T')[0],
                    description: row[mapping.description] || 'Transaksi Excel',
                    amount: parseFloat(rawAmount) || 0,
                    type: txType,
                    status: 'Inbox', // Harus divalidasi manual / AI lagi nanti
                    source: 'Smart Import Excel',
                    raw_data: JSON.stringify(row) // Simpan data asli buat jaga-jaga
                };
            });

            // Filter yang kosong
            const validTransactions = transactions.filter(t => t.amount > 0 && t.description);

            await GoogleGenerativeAI.entities.Transaction.bulkCreate(validTransactions);
            
            onImportSuccess();
            handleClose();
        } catch (err) {
            setError('Gagal mengimpor transaksi. Silakan cek format data Anda.');
            setStep('MAP');
            console.error(err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogContent className="max-w-3xl bg-card border-border overflow-hidden p-0">
                <div className="bg-gradient-to-r from-primary/10 to-neon-purple/10 p-6 border-b border-border flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-neon-purple flex items-center justify-center shadow-lg shadow-primary/20">
                        <Sparkles className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black text-foreground">Slay AI Excel Importer</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">Upload data setengah jadi, biar AI yang ngerapiin formatnya otomatis!</p>
                    </div>
                </div>
                
                <div className="p-6">
                    <AnimatePresence mode="wait">
                        {step === 'UPLOAD' && (
                            <motion.div 
                                key="upload"
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                <div className="text-center py-12 px-6 border-2 border-dashed border-primary/30 rounded-3xl bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        id="csv-upload"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                    <FileSpreadsheet className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                                    <h3 className="text-lg font-bold mb-2">Tarik & Lepas File CSV Disini</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                                        Nggak perlu nyamain format header kita! Cukup upload file CSV dari bank atau catatan lama kamu, SlayBot akan otomatis mencocokkan kolomnya.
                                    </p>
                                    <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-xl pointer-events-none">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Pilih File CSV
                                    </Button>
                                </div>
                                {error && (
                                    <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 'MAP' && (
                            <motion.div 
                                key="map"
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {aiThinking ? (
                                    <div className="text-center py-16 space-y-4">
                                        <div className="relative w-20 h-20 mx-auto">
                                            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                                            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                                            <Sparkles className="w-8 h-8 text-primary absolute inset-0 m-auto animate-pulse" />
                                        </div>
                                        <h3 className="text-xl font-bold">SlayBot Sedang Membaca...</h3>
                                        <p className="text-muted-foreground text-sm">Menganalisis kolom dan format data dari file Excel kamu.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-cyber-lime/10 border border-cyber-lime/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-cyber-lime/20 flex items-center justify-center">
                                                    <CheckCircle className="w-5 h-5 text-cyber-lime" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-cyber-lime">AI Berhasil Mencocokkan Data!</p>
                                                    <p className="text-xs text-muted-foreground">Silakan periksa ulang apakah tebakan SlayBot sudah benar.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Form Mapping */}
                                            <div className="space-y-4 p-5 rounded-2xl border border-border bg-card">
                                                <h4 className="font-bold border-b border-border pb-2 mb-4">Cocokkan Kolom</h4>
                                                
                                                {[
                                                    { key: 'date', label: 'Tanggal Transaksi *' },
                                                    { key: 'description', label: 'Keterangan / Nama *' },
                                                    { key: 'amount', label: 'Nominal / Jumlah *' },
                                                    { key: 'type', label: 'Tipe (Masuk/Keluar) Opsional' },
                                                ].map(field => (
                                                    <div key={field.key} className="flex flex-col space-y-1.5">
                                                        <label className="text-xs font-bold text-muted-foreground uppercase">{field.label}</label>
                                                        <select 
                                                            className="bg-secondary/50 border border-input rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                                            value={mapping[field.key]}
                                                            onChange={e => setMapping({...mapping, [field.key]: e.target.value})}
                                                        >
                                                            <option value="">-- Pilih Kolom dari Excel --</option>
                                                            {headers.map(h => (
                                                                <option key={h} value={h}>{h}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Preview */}
                                            <div className="space-y-4 p-5 rounded-2xl border border-border bg-secondary/20">
                                                <h4 className="font-bold border-b border-border pb-2 mb-4">Preview (Hasil Akhir)</h4>
                                                <div className="space-y-3">
                                                    {rawData.slice(0, 3).map((row, idx) => (
                                                        <div key={idx} className="p-3 rounded-xl bg-background border border-border/50 text-sm flex gap-3 shadow-sm">
                                                            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="font-bold truncate text-primary">{mapping.description ? row[mapping.description] : '...'}</p>
                                                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                                                    <span>🗓 {mapping.date ? row[mapping.date] : '...'}</span>
                                                                    <span className="font-mono text-foreground font-bold">💰 {mapping.amount ? row[mapping.amount] : '0'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {rawData.length > 3 && (
                                                        <p className="text-center text-xs text-muted-foreground pt-2">
                                                            ... dan {rawData.length - 3} transaksi lainnya.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                                                <AlertCircle className="w-4 h-4" /> {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-4 border-t border-border">
                                            <Button variant="outline" onClick={() => setStep('UPLOAD')} className="flex-1 rounded-xl">
                                                Upload Ulang
                                            </Button>
                                            <Button 
                                                onClick={handleImport} 
                                                className="flex-[2] bg-gradient-to-r from-primary to-neon-purple text-primary-foreground gap-2 rounded-xl shadow-lg shadow-primary/20"
                                            >
                                                Mulai Import Data <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 'IMPORTING' && (
                            <motion.div 
                                key="importing"
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-16 space-y-4"
                            >
                                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                                <h3 className="text-xl font-bold">Menyimpan Transaksi...</h3>
                                <p className="text-muted-foreground text-sm">Sedang memasukkan data ke Inbox. Setelah ini kamu bisa membiarkan AI yang mengkategorikannya.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
