import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import { Upload as UploadIcon, CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
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
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Import Transaksi via CSV</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ textAlign: 'center', py: 3, border: '2px dashed #ccc', mb: 3 }}>
                    <input
                        type="file"
                        accept=".csv"
                        id="csv-upload"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <label htmlFor="csv-upload">
                        <Button variant="contained" component="span" startIcon={<UploadIcon />}>
                            Pilih File CSV
                        </Button>
                    </label>
                    {file && (
                        <Typography sx={{ mt: 2 }} color="primary">
                            File terpilih: {file.name}
                        </Typography>
                    )}
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {preview.length > 0 && (
                    <>
                        <Typography variant="subtitle2" gutterBottom>Pratinjau Data (5 Baris Pertama):</Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Tanggal</TableCell>
                                        <TableCell>Deskripsi</TableCell>
                                        <TableCell align="right">Jumlah</TableCell>
                                        <TableCell>Tipe</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {preview.map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{row.date}</TableCell>
                                            <TableCell>{row.description}</TableCell>
                                            <TableCell align="right">{row.amount}</TableCell>
                                            <TableCell>{row.type}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Batal</Button>
                <Button 
                    onClick={handleImport} 
                    variant="contained" 
                    color="primary" 
                    disabled={!file || loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
                >
                    {loading ? 'Mengimpor...' : 'Mulai Import'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
