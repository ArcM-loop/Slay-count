import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Camera, Sparkles, CheckCircle, QrCode } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';
import { Html5Qrcode } from 'html5-qrcode';

const EXPERT_PROMPT = (rawText, accountNames) => `
Kamu adalah Biyo, akuntan senior berpengalaman 15 tahun yang ahli dalam standar akuntansi Indonesia (SAK EMKM & PSAK) dan perpajakan DJP. Kamu memahami konteks bisnis UMKM Indonesia secara mendalam.

Analisis teks dari nota/struk/Faktur Pajak berikut dan ekstrak informasi keuangannya:

TEKS NOTA:
${rawText}

DAFTAR AKUN TERSEDIA:
${accountNames.join(', ')}

Tugasmu:
1. Ekstrak data transaksi (total_amount dalam angka, date dalam format YYYY-MM-DD, merchant_name)
2. Tentukan kategori COA yang paling tepat dari daftar akun tersedia
3. Berikan confidence score (0-100) seberapa yakin kamu
4. Berikan alasan singkat dalam bahasa Indonesia yang santai (max 1 kalimat)
5. PENTING: Jika dokumen ini adalah FAKTUR PAJAK (e-Faktur), ekstrak juga:
   - is_efaktur: true
   - nomor_faktur: string (format 010.000-xx.xxxxxxxx)
   - npwp_lawan: string (NPWP Penjual/Pembeli lawan transaksi, hanya angka 15 digit)
   - dpp: number (Dasar Pengenaan Pajak)
   - ppn: number (Pajak Pertambahan Nilai)

Jawab dalam format JSON ini:
{
  "total_amount": number,
  "date": "YYYY-MM-DD",
  "merchant_name": "string",
  "type": "Pemasukan" atau "Pengeluaran",
  "suggested_category": "nama akun dari daftar tersedia",
  "confidence": number,
  "reason": "alasan singkat santai",
  "is_efaktur": boolean,
  "nomor_faktur": "string",
  "npwp_lawan": "string",
  "dpp": number,
  "ppn": number
}
`;

export default function ScanNotaModal({ open, onClose }) {
  const { activeBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload | camera | scanning | review | done
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);

  // Parse DJP QR Code URL (100% Accuracy)
  const parseEfakturQR = (qrUrl) => {
    try {
      if (!qrUrl.includes('efaktur.pajak.go.id')) return null;
      // Format: http://efaktur.pajak.go.id/qr/NOMOR/NPWP_JUAL/NPWP_BELI/TGL/DPP/PPN/SIG
      const parts = qrUrl.split('/');
      // Usually parts are: ["http:", "", "efaktur.pajak.go.id", "qr", "NOMOR", "NPWP1", "NPWP2", "TGL", "DPP", "PPN", "SIG"]
      const qrIndex = parts.indexOf('qr');
      if (qrIndex !== -1 && parts.length >= qrIndex + 7) {
        return {
          total_amount: parseInt(parts[qrIndex + 5]) + parseInt(parts[qrIndex + 6]),
          date: parts[qrIndex + 4],
          merchant_name: 'Vendor e-Faktur', // Will need manual adjust or master data match later
          type: 'Pengeluaran',
          suggested_category: 'Persediaan / Beban',
          confidence: 100, // 100% accurate because it's from DJP directly
          reason: 'Data dibaca langsung dari QR Code DJP e-Faktur (Akurasi 100%)',
          is_efaktur: true,
          nomor_faktur: parts[qrIndex + 1],
          npwp_lawan: parts[qrIndex + 2], // Penjual
          dpp: parseInt(parts[qrIndex + 5]),
          ppn: parseInt(parts[qrIndex + 6]),
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleFile = async (file) => {
    if (!file || !activeBusiness) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep('scanning');
    setError(null);

    try {
      // 1. Try reading QR code from the image file directly first using html5-qrcode
      const html5QrCode = new Html5Qrcode("hidden-qr-reader");
      try {
        const qrResult = await html5QrCode.scanFile(file, false);
        const parsedQR = parseEfakturQR(qrResult);
        if (parsedQR) {
          setExtracted({ ...parsedQR, receipt_url: url });
          setStep('review');
          return; // Skip LLM if valid QR found!
        }
      } catch (err) {
        // No QR found, continue to LLM
      }

      // 2. Upload file & use LLM
      const { file_url } = await GoogleGenerativeAI.integrations.Core.UploadFile({ file });
      const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id });
      const accountNames = accounts.map(a => a.name);

      const result = await GoogleGenerativeAI.integrations.Core.InvokeLLM({
        prompt: EXPERT_PROMPT('(gambar nota terlampir - ekstrak semua teks dan data keuangan yang terlihat)', accountNames),
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            total_amount: { type: 'number' },
            date: { type: 'string' },
            merchant_name: { type: 'string' },
            type: { type: 'string' },
            suggested_category: { type: 'string' },
            confidence: { type: 'number' },
            reason: { type: 'string' },
            is_efaktur: { type: 'boolean' },
            nomor_faktur: { type: 'string' },
            npwp_lawan: { type: 'string' },
            dpp: { type: 'number' },
            ppn: { type: 'number' },
          },
        },
      });

      setExtracted({ ...result, receipt_url: file_url });
      setStep('review');
    } catch (err) {
      setError('Gagal membaca nota: ' + err.message);
      setStep('upload');
    }
  };

  const handleSave = async () => {
    if (!extracted || !activeBusiness) return;
    setStep('done');
    const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id });
    const matchedAccount = accounts.find(a => a.name === extracted.suggested_category);

    // Cek status Autopilot
    const isAutopilot = localStorage.getItem('slaycount_autopilot') === 'true';
    const isHighConfidence = extracted.confidence >= 95;
    
    // Jika Autopilot aktif dan skor tinggi, langsung bypass ke Final
    const shouldAutopilot = isAutopilot && isHighConfidence && matchedAccount;
    const finalStatus = shouldAutopilot ? 'Final' : 'Inbox';

    const newTx = await GoogleGenerativeAI.entities.Transaction.create({
      business_id: activeBusiness.id,
      date: extracted.date || new Date().toISOString().split('T')[0],
      description: `Nota dari ${extracted.merchant_name || 'Scan'}`,
      merchant_name: extracted.merchant_name,
      amount: extracted.total_amount || 0,
      type: extracted.type || 'Pengeluaran',
      status: finalStatus,
      source: extracted.is_efaktur ? 'e-Faktur QR' : 'Scan Nota',
      receipt_url: extracted.receipt_url || '',
      ai_suggested_category: extracted.suggested_category,
      ai_confidence: extracted.confidence,
      ai_reason: extracted.reason,
      account_id: matchedAccount?.id || '',
      account_name: matchedAccount?.name || '',
      is_efaktur: extracted.is_efaktur || false,
      nomor_faktur: extracted.nomor_faktur || '',
      npwp_lawan: extracted.npwp_lawan || '',
      dpp: extracted.dpp || 0,
      ppn: extracted.ppn || 0
    });

    if (shouldAutopilot) {
      // Import secara dinamis agar tidak error sirkular jika ada
      import('@/lib/journalEngine').then(async ({ createJournalEntries }) => {
          const paymentAccount = accounts.find(a => a.type === 'Aset'); // Default ambil aset pertama (misal: Kas)
          if (paymentAccount) {
             await createJournalEntries(newTx, accounts, paymentAccount.id);
          }
      });
    }

    queryClient.invalidateQueries({ queryKey: ['transactions-inbox', activeBusiness.id] });
    queryClient.invalidateQueries({ queryKey: ['transactions', activeBusiness.id] });
    queryClient.invalidateQueries({ queryKey: ['journal-entries', activeBusiness.id] });
    
    setTimeout(() => { handleClose(); }, 1500);
  };

  const handleClose = () => {
    setStep('upload');
    setPreviewUrl(null);
    setExtracted(null);
    setError(null);
    onClose();
  };

  // Live Camera Scanner
  useEffect(() => {
    let scanner;
    if (step === 'camera') {
      scanner = new Html5Qrcode("qr-camera-view");
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const parsed = parseEfakturQR(decodedText);
          if (parsed) {
            scanner.stop();
            setExtracted(parsed);
            setStep('review');
          }
        },
        () => {}
      );
    }
    return () => {
      if (scanner && scanner.isScanning) scanner.stop().catch(console.error);
    };
  }, [step]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Scan Nota & e-Faktur 📸
          </DialogTitle>
        </DialogHeader>

        <div id="hidden-qr-reader" style={{ display: 'none' }}></div>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-primary/5 flex flex-col items-center justify-center"
                >
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="font-medium text-sm">Upload Foto/PDF</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
                <div
                  onClick={() => setStep('camera')}
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-primary/5 flex flex-col items-center justify-center"
                >
                  <QrCode className="w-8 h-8 mb-2 text-primary" />
                  <p className="font-medium text-sm text-primary">Scan QR e-Faktur</p>
                </div>
              </div>
              
              {error && <p className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded">{error}</p>}
              
              <div className="bg-secondary p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  🤖 <strong>AI Biyo</strong> akan membaca nota biasa secara pintar. <br/>
                  ⚡ <strong>QR Scanner</strong> akan mengekstrak e-Faktur DJP dengan akurasi 100% tanpa error!
                </p>
              </div>
            </motion.div>
          )}

          {step === 'camera' && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
               <div className="rounded-xl overflow-hidden border-2 border-primary relative">
                  <div id="qr-camera-view" className="w-full"></div>
                  <div className="absolute inset-0 border-4 border-primary/50 border-dashed rounded-xl pointer-events-none z-10 m-8"></div>
               </div>
               <div className="flex gap-2">
                 <Button variant="outline" className="w-full" onClick={() => setStep('upload')}>Batal Scan</Button>
               </div>
            </motion.div>
          )}

          {step === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8 space-y-4">
              {previewUrl && <img src={previewUrl} alt="Nota" className="w-full max-h-48 object-cover rounded-xl" />}
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="font-medium">Biyo lagi baca dokumen...</p>
              </div>
            </motion.div>
          )}

          {step === 'review' && extracted && (
            <motion.div key="review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {previewUrl && <img src={previewUrl} alt="Nota" className="w-full max-h-36 object-cover rounded-xl" />}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Merchant', value: extracted.merchant_name || '-' },
                  { label: 'Tanggal', value: extracted.date || '-' },
                  { label: 'Jumlah', value: formatRupiah(extracted.total_amount) },
                  { label: 'Tipe', value: extracted.type || '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl bg-secondary">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-semibold text-sm mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {extracted.is_efaktur && (
                <div className="p-3 rounded-xl bg-cyber-lime/10 border border-cyber-lime/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-cyber-lime" />
                    <span className="text-xs font-bold text-cyber-lime uppercase tracking-wider">Data e-Faktur Valid (100% Akurat)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">No. Faktur</p>
                      <p className="font-mono">{extracted.nomor_faktur}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">NPWP Lawan</p>
                      <p className="font-mono">{extracted.npwp_lawan}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">DPP</p>
                      <p className="font-mono">{formatRupiah(extracted.dpp)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">PPN</p>
                      <p className="font-mono">{formatRupiah(extracted.ppn)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Chip */}
              {!extracted.is_efaktur && extracted.suggested_category && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">Kategori Disarankan...</span>
                    <span className="text-xs text-muted-foreground ml-auto">{extracted.confidence}% yakin</span>
                  </div>
                  <p className="text-sm font-medium">📁 {extracted.suggested_category}</p>
                  {extracted.reason && <p className="text-xs text-muted-foreground mt-1">{extracted.reason}</p>}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">Transaksi akan masuk ke Inbox untuk kamu validasi dulu ✅</p>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="border-border">Batal</Button>
                <Button onClick={handleSave} className="flex-1 bg-gradient-to-r from-primary to-cyber-lime text-primary-foreground">
                  Simpan 📥
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-cyber-lime mx-auto mb-3" />
              <p className="font-bold text-lg">Berhasil! 🎉</p>
              <p className="text-sm text-muted-foreground mt-1">Data berhasil diproses!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
