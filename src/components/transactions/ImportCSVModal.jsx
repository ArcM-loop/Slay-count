import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { parseCSV } from '@/lib/utils';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';

export default function ImportCSVModal({ open, onClose, businessId, onImportSuccess }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        
        try {
            const data = await parseCSV(selectedFile);
            setPreview(data.slice(0, 5)); // Tampilkan 5 baris pertama
        } catch (err) {
            setError('Gagal membaca file CSV. Pastikan formatnya benar.');
            console.error(err);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        try {
            const data = await parseCSV(file);
            
            // Map data CSV ke format transaksi
            const transactions = data.map(row => ({
                business_id: businessId,
                date: row.date || new Date().toISOString().split('T')[0],
                description: row.description || 'Imported Transaction',
                amount: parseFloat(row.amount) || 0,
                type: row.type || 'Pengeluaran',
                status: 'Inbox',
                source: 'Import CSV'
            }));

            await GoogleGenerativeAI.entities.Transaction.bulkCreate(transactions);
            
            onImportSuccess();
            onClose();
            setFile(null);
            setPreview([]);
        } catch (err) {
            setError('Gagal mengimpor transaksi. Silakan cek format data Anda.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-2xl bg-card border-border">
                <DialogHeader>
                    <DialogTitle>Import Transaksi via CSV</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                        <input
                            type="file"
                            accept=".csv"
                            id="csv-upload"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="csv-upload">
                            <Button variant="outline" asChild className="cursor-pointer border-border">
                                <span>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Pilih File CSV
                                </span>
                            </Button>
                        </label>
                        {file && (
                            <p className="mt-3 text-sm text-primary font-medium">
                                File terpilih: {file.name}
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {preview.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Pratinjau Data (5 Baris Pertama):</h4>
                            <div className="border border-border rounded-xl overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2 font-medium">Tanggal</th>
                                            <th className="px-4 py-2 font-medium">Deskripsi</th>
                                            <th className="px-4 py-2 font-medium text-right">Jumlah</th>
                                            <th className="px-4 py-2 font-medium">Tipe</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {preview.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                                                <td className="px-4 py-2">{row.date}</td>
                                                <td className="px-4 py-2">{row.description}</td>
                                                <td className="px-4 py-2 text-right">{row.amount}</td>
                                                <td className="px-4 py-2">{row.type}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading} className="border-border">
                        Batal
                    </Button>
                    <Button 
                        onClick={handleImport} 
                        disabled={!file || loading}
                        className="bg-primary text-primary-foreground gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {loading ? 'Mengimpor...' : 'Mulai Import'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
