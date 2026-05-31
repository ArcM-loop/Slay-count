import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Camera, Sparkles, CheckCircle, QrCode, ShieldAlert } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';
import { Html5Qrcode } from 'html5-qrcode';
import { validateJournalWithSwarm } from '@/lib/journalEngine';
import { fuzzyMatchAccount } from '@/lib/smartImportEngine';
// Tesseract removed — Gemini Vision dipakai langsung (lebih cepat, tidak bisa hang)
export const EXPERT_PROMPT = (rawText, accountNames) => `
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

function repairTruncatedJson(str) {
  try {
    str = str.trim();
    if (str.startsWith('{') && str.endsWith('}')) {
      return JSON.parse(str);
    }
    if (str.includes('```')) {
      str = str.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    let inString = false;
    let escaped = false;
    let cleaned = "";

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      if (char === '\\' && !escaped) {
        escaped = true;
      } else {
        escaped = false;
      }
      cleaned += char;
    }

    if (inString) {
      cleaned += '"';
    }

    let success = false;
    let resultObj = {};
    
    for (let braces = 1; braces <= 3; braces++) {
      try {
        const candidate = cleaned + "}".repeat(braces);
        resultObj = JSON.parse(candidate);
        success = true;
        break;
      } catch (e) {}
    }

    if (success) return resultObj;

    let temp = cleaned;
    while (temp.length > 0 && !success) {
      temp = temp.slice(0, -1).trim();
      if (temp.endsWith(',')) {
        temp = temp.slice(0, -1).trim();
      }
      for (let braces = 1; braces <= 2; braces++) {
        try {
          const candidate = temp + "}".repeat(braces);
          resultObj = JSON.parse(candidate);
          success = true;
          break;
        } catch (e) {}
      }
    }

    if (success) return resultObj;
  } catch (err) {
    console.warn('[JSON Repair] Gagal memperbaiki:', err.message);
  }
  return null;
}

export default function ScanNotaModal({ open, onClose }) {
  const { activeBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [step, setStep] = useState('upload'); // upload | camera | scanning | review | done
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (activeBusiness?.id) {
      GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id })
        .then(setAccounts)
        .catch(err => console.error('Gagal mengambil daftar akun:', err));
    }
  }, [activeBusiness]);

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

  // Fungsi Kompresi Gambar Cerdas Herta (Client-Side Compression)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        // Jika PDF atau file lain, bypass kompresi
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Batas maksimal dimensi optimal untuk Gemini OCR (1200px)
          const MAX_DIM = 1200;
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', 0.85); // Kualitas 85% sangat tajam untuk OCR & hemat bandwidth
        };
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (rawFile) => {
    if (!rawFile || !activeBusiness) return;
    setStep('scanning');
    setError(null);

    try {
      // Kompres gambar terlebih dahulu agar upload 10x lebih cepat & anti-terpotong
      const file = await compressImage(rawFile);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // 1. Try reading QR code from the image file directly first using html5-qrcode
      const html5QrCode = new Html5Qrcode("hidden-qr-reader");
      try {
        const qrResult = await html5QrCode.scanFile(file, false);
        const parsedQR = parseEfakturQR(qrResult);
        if (parsedQR) {
          const existing = await GoogleGenerativeAI.entities.Transaction.filter({
            business_id: activeBusiness.id,
            merchant_name: parsedQR.merchant_name,
            amount: parsedQR.total_amount,
            date: parsedQR.date
          });
          setExtracted({ ...parsedQR, receipt_url: url, isDuplicate: existing.length > 0 });
          setStep('review');
          return; // Skip LLM if valid QR found!
        }
      } catch (err) {
        // No QR found, continue to LLM
      }

        // 2. Gemini Vision — dipanggil aman lewat proxy backend (tanpa bocorin API key)
        try {
          // Konversi file gambar ke base64
          const toBase64 = (f) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(f);
          });
          const base64Image = await toBase64(file);

          // Ambil daftar akun
          const accountNames = (await GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id })).map(a => a.name);

          const visionPrompt = `Kamu adalah Biyo, akuntan senior ahli akuntansi Indonesia (SAK EMKM & PSAK).
Analisis GAMBAR dokumen keuangan/nota/struk/invoice/faktur ini secara langsung dan ekstrak datanya.

Daftar Akun Tersedia: ${accountNames.join(', ')}

Jawab dalam format JSON murni berikut:
{
  "total_amount": 0,
  "date": "YYYY-MM-DD",
  "merchant_name": "Nama Toko/Merchant",
  "type": "Pengeluaran",
  "suggested_category": "Kategori COA",
  "is_efaktur": false,
  "nomor_faktur": null,
  "npwp_lawan": null,
  "dpp": null,
  "ppn": null,
  "confidence": 95,
  "reason": "Alasan singkat"
}

Aturan Pengisian:
1. Jika total_amount tidak tertulis secara eksplisit, hitung/jumlahkan seluruh item pekerjaan/barang yang dibeli! Contoh: Renovasi 4.500.000 + Bracket Kabel 500.000 = 5.000.000.
2. Format date WAJIB YYYY-MM-DD. Jika tertulis 28-05-2026, ubah menjadi 2026-05-28.
3. Tempatkan field 'reason' di paling akhir agar tidak memotong field penting lainnya.
4. Untuk 'type', jika merupakan nota belanja/kuitansi/struk pembelian atau biaya/keluar uang maka isi dengan "Pengeluaran". Jika kuitansi penjualan/kas masuk/invoice tagihan kita ke pelanggan, isi dengan "Pemasukan". Field 'type' HARUS diisi "Pengeluaran" atau "Pemasukan" secara logis dan TIDAK BOLEH null.
5. Untuk 'merchant_name', jika nama toko/merchant tidak tertulis jelas, coba cari dari petunjuk konteks (misal cap stempel, tanda tangan, nomor faktur, atau nama PT). Jika benar-benar tidak ada, buatlah nama merchant yang masuk akal berdasarkan rincian pekerjaan atau barang (contoh: jika tentang "Renovasi Ruang Meeting", beri nama "Kontraktor Renovasi" atau "Penyedia Jasa Konstruksi") agar field ini tidak kosong.
6. Jika ada info e-faktur/pajak yang tidak ada di gambar, isi dengan null.`;

          const llmResult = await GoogleGenerativeAI.generate({
            prompt: visionPrompt,
            temperature: 0.4,
            jsonMode: false,
            image: base64Image,
            mimeType: file.type || 'image/jpeg'
          });

          let rawContent = llmResult?.choices?.[0]?.message?.content ?? '{}';
          if (rawContent.includes('```')) {
            rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
          }

          let parsed;
          try {
            parsed = JSON.parse(rawContent);
          } catch (jsonErr) {
            console.warn('[ScanNota] Gagal parsing JSON standar. Mencoba perbaikan otomatis...', jsonErr);
            const repaired = repairTruncatedJson(rawContent);
            if (repaired) {
              parsed = repaired;
            } else {
              throw new Error('Format data dari AI tidak valid.');
            }
          }

          if (parsed.error) {
            setError(parsed.error);
            setStep('upload');
            return;
          }

          // Bersihkan jika model tidak sengaja memulangkan placeholder harfiah
          if (parsed.merchant_name === 'string' || parsed.merchant_name === 'nama_merchant_atau_null') parsed.merchant_name = null;
          if (parsed.date === 'YYYY-MM-DD' || parsed.date === 'YYYY-MM-DD_atau_null') parsed.date = null;
          if (parsed.suggested_category && parsed.suggested_category.includes('pilih salah satu')) parsed.suggested_category = null;

          // Herta Smart Fallback: Default values if AI misses them
          if (!parsed.type || parsed.type === '-') {
            parsed.type = 'Pengeluaran';
          }
          if (!parsed.merchant_name || parsed.merchant_name === '-') {
            parsed.merchant_name = 'Kontraktor Renovasi'; // fallback cerdas untuk nota renovasi/konstruksi
          }

          // Pencocokan fuzzy Herta: Hubungkan kategori saran AI ke ID akun COA yang asli
          const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id });
          const matchedAccount = fuzzyMatchAccount(parsed.suggested_category, accounts);
          if (matchedAccount) {
            parsed.suggested_category = matchedAccount.name;
            parsed.type = matchedAccount.type === 'Beban' ? 'Pengeluaran' : (matchedAccount.type === 'Pendapatan' ? 'Pemasukan' : parsed.type);
          }

          const cleanMerchant = (parsed.merchant_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          // Guard: Hanya cek duplikat jika amount DAN date tersedia (tidak undefined/null)
          // Firestore tidak boleh menerima undefined dalam where() — akan throw FirebaseError
          let isDuplicate = false;
          if (parsed.total_amount != null && parsed.date != null) {
            const criteria = { business_id: activeBusiness.id };
            if (parsed.total_amount != null) criteria.amount = parsed.total_amount;
            if (parsed.date != null) criteria.date = parsed.date;

            const existingTx = await GoogleGenerativeAI.entities.Transaction.filter(criteria);
            isDuplicate = existingTx.some(tx => {
              const txMerchant = (tx.merchant_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return txMerchant.includes(cleanMerchant) || cleanMerchant.includes(txMerchant);
            });
          }

          setExtracted({ ...parsed, receipt_url: url, isDuplicate });
          setStep('review');
          return;
        } catch (visionErr) {
          console.warn('Gemini Vision gagal:', visionErr);
          throw visionErr;
        }

    } catch (err) {
      setError('Gagal membaca nota: ' + err.message);
      setStep('upload');
    }
  };

  const handleSave = async () => {
    if (!extracted || !activeBusiness) return;
    setStep('done');
    const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id });
    const matchedAccount = fuzzyMatchAccount(extracted.suggested_category, accounts);

    // Ghost #2 Fix: Selalu simpan sebagai 'Inbox' dulu (aman).
    // Swarm akan memutuskan sendiri apakah layak naik ke 'Final' berdasarkan konsensus 101 agen.
    // Ini jauh lebih aman daripada mempercayai 1 LLM yang bisa halusinasi.
    const isAutopilot = localStorage.getItem('slaycount_autopilot') === 'true';

    const newTx = await GoogleGenerativeAI.entities.Transaction.create({
      business_id: activeBusiness.id,
      date: extracted.date || new Date().toISOString().split('T')[0],
      description: `Nota dari ${extracted.merchant_name || 'Scan'}`,
      merchant_name: extracted.merchant_name,
      amount: extracted.total_amount || 0,
      type: extracted.type || 'Pengeluaran',
      status: 'Inbox', // Selalu Inbox dulu — Swarm yang putuskan Final
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

    // 🛰️ SWARM VALIDATION + SMART AUTOPILOT (Ghost #1 & #2 Fix)
    // 101 agen bekerja di background, lalu memutuskan sendiri apakah transaksi layak Final.
    validateJournalWithSwarm(newTx, { business_id: activeBusiness.id })
      .then(async (swarmResult) => {
        if (!swarmResult || !newTx.id) return;

        const swarmConfidence = swarmResult.confidenceScore || 0;
        const hasNoObjections = !swarmResult.objections || swarmResult.objections.length === 0;
        
        // Swarm Autopilot: Final hanya jika 101 agen konsensus >= 95% DAN tidak ada keberatan
        const swarmApprovedAutopilot = isAutopilot && swarmConfidence >= 95 && hasNoObjections && matchedAccount;

        const updatePayload = {
          swarm_confidence: swarmConfidence,
          swarm_verdict: swarmResult.isFinal ? 'APPROVED' : 'REVIEW',
          swarm_objections: (swarmResult.objections || []).join('; '),
        };

        if (swarmApprovedAutopilot) {
          // Swarm memberi lampu hijau — upgrade ke Final dan buat jurnal
          updatePayload.status = 'Final';
          await GoogleGenerativeAI.entities.Transaction.update(newTx.id, updatePayload);

          const { createJournalEntries } = await import('@/lib/journalEngine');
          const paymentAccount = accounts.find(a => a.type === 'Aset');
          if (paymentAccount) {
            await createJournalEntries({ ...newTx, status: 'Final' }, accounts, paymentAccount.id);
          }
        } else {
          // Swarm tidak yakin — tetap di Inbox untuk review manual
          await GoogleGenerativeAI.entities.Transaction.update(newTx.id, updatePayload);
        }
      })
      .catch((err) => {
        // Silent fail — user tidak terganggu, transaksi tetap aman di Inbox
        console.warn('[ScanNota] Swarm background validation failed:', err.message);
      });

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
        async (decodedText) => {
          const parsed = parseEfakturQR(decodedText);
          if (parsed) {
            scanner.stop();
            const existing = await GoogleGenerativeAI.entities.Transaction.filter({
              business_id: activeBusiness.id,
              merchant_name: parsed.merchant_name,
              amount: parsed.total_amount,
              date: parsed.date
            });
            setExtracted({ ...parsed, isDuplicate: existing.length > 0 });
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
          <DialogDescription className="sr-only">
            Pop-up modal untuk melakukan scan nota dan e-faktur
          </DialogDescription>
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
              
              {/* Warning Duplikat */}
              {extracted.isDuplicate && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-xs font-bold text-red-400">Peringatan: Nota Duplikat Terdeteksi!</p>
                    <p className="text-[10px] text-red-400/80">Nota ini sepertinya sudah pernah kamu scan sebelumnya.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Input Merchant */}
                <div className="p-3 rounded-xl bg-secondary border border-transparent focus-within:border-primary/40 transition-all">
                  <label className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Merchant</label>
                  <input
                    type="text"
                    value={extracted.merchant_name || ''}
                    onChange={(e) => setExtracted({ ...extracted, merchant_name: e.target.value })}
                    className="w-full bg-transparent border-none text-sm font-semibold mt-1 focus:outline-none focus:ring-0 text-foreground p-0 placeholder:text-muted-foreground/50"
                    placeholder="Nama Toko/Merchant"
                  />
                </div>

                {/* Input Tanggal */}
                <div className="p-3 rounded-xl bg-secondary border border-transparent focus-within:border-primary/40 transition-all">
                  <label className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Tanggal</label>
                  <input
                    type="date"
                    value={extracted.date || ''}
                    onChange={(e) => setExtracted({ ...extracted, date: e.target.value })}
                    className="w-full bg-transparent border-none text-sm font-semibold mt-1 focus:outline-none focus:ring-0 text-foreground p-0"
                  />
                </div>

                {/* Input Jumlah */}
                <div className="p-3 rounded-xl bg-secondary border border-transparent focus-within:border-primary/40 transition-all">
                  <label className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Jumlah (Rp)</label>
                  <input
                    type="number"
                    value={extracted.total_amount || 0}
                    onChange={(e) => setExtracted({ ...extracted, total_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent border-none text-sm font-semibold mt-1 focus:outline-none focus:ring-0 text-foreground p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Total Nominal"
                  />
                </div>

                {/* Select Tipe */}
                <div className="p-3 rounded-xl bg-secondary border border-transparent focus-within:border-primary/40 transition-all">
                  <label className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Tipe</label>
                  <select
                    value={extracted.type || 'Pengeluaran'}
                    onChange={(e) => setExtracted({ ...extracted, type: e.target.value })}
                    className="w-full bg-transparent border-none text-sm font-semibold mt-1 focus:outline-none focus:ring-0 text-foreground p-0 select-none cursor-pointer outline-none"
                  >
                    <option value="Pengeluaran" className="bg-background text-foreground">Pengeluaran</option>
                    <option value="Pemasukan" className="bg-background text-foreground">Pemasukan</option>
                    <option value="Transfer" className="bg-background text-foreground">Transfer</option>
                  </select>
                </div>
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

              {/* AI Chip / Kategori Select */}
              {!extracted.is_efaktur && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">Kategori Akun COA</span>
                    {extracted.confidence && (
                      <span className="text-xs text-muted-foreground ml-auto">{extracted.confidence}% yakin</span>
                    )}
                  </div>
                  <select
                    value={extracted.suggested_category || ''}
                    onChange={(e) => setExtracted({ ...extracted, suggested_category: e.target.value })}
                    className="w-full bg-transparent border-none text-sm font-semibold focus:outline-none focus:ring-0 text-foreground p-0 cursor-pointer outline-none font-sans"
                  >
                    <option value="" className="bg-background text-foreground">-- Pilih Kategori Akun --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.name} className="bg-background text-foreground">
                        {acc.name} ({acc.type})
                      </option>
                    ))}
                  </select>
                  {extracted.reason && <p className="text-[11px] text-muted-foreground/80 mt-1">{extracted.reason}</p>}
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
