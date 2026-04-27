import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { formatRupiah } from '@/lib/formatters';

const CSV_PROMPT = (csvContent, accountNames) => `
Kamu adalah Biyo, akuntan senior berpengalaman 15 tahun yang ahli dalam standar akuntansi Indonesia (SAK EMKM & PSAK).

Berikut adalah data mutasi bank dari CSV/Excel:

${csvContent.slice(0, 3000)}

DAFTAR AKUN COA TERSEDIA:
${accountNames.join(', ')}

Tugasmu: Ekstrak SEMUA transaksi dan kategorikan menggunakan COA yang tersedia.
Untuk setiap transaksi, tentukan apakah Pemasukan atau Pengeluaran, dan saran kategori akun.

Format output JSON:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "merchant_name": "string",
      "amount": number,
      "type": "Pemasukan" atau "Pengeluaran",
      "suggested_category": "nama akun dari daftar",
      "confidence": number
    }
  ]
}
`;

export default function ImportCSVModal({ open, onClose }) {
  const { activeBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [transactions, setTransactions] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file) => {
    if (!file || !activeBusiness) return;
    setStep('processing');

    const { file_url } = await GoogleGenerativeAI.integrations.Core.UploadFile({ file });
    const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id });
    const accountNames = accounts.map(a => a.name);

    const schema = {
      type: 'object',
      properties: {
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string' },
              description: { type: 'string' },
              merchant_name: { type: 'string' },
              amount: { type: 'number' },
              type: { type: 'string' },
              suggested_category: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
      },
    };

    const result = await GoogleGenerativeAI.integrations.Core.InvokeLLM({
      prompt: CSV_PROMPT('(file CSV/Excel terlampir - ekstrak semua transaksi yang ada)', accountNames),
      file_urls: [file_url],
      response_json_schema: schema,
    });

    setTransactions(result.transactions || []);
    setStep('review');
  };

  const handleImport = async () => {
    if (!activeBusiness) return;
    setSaving(true);
    const accounts = await GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id });

    const toCreate = transactions.map(tx => {
      const matchedAccount = accounts.find(a => a.name === tx.suggested_category);
      return {
        business_id: activeBusiness.id,
        date: tx.date || new Date().toISOString().split('T')[0],
        description: tx.description,
        merchant_name: tx.merchant_name,
        amount: tx.amount || 0,
        type: tx.type || 'Pengeluaran',
        status: 'Inbox',
        source: 'Import CSV',
        ai_suggested_category: tx.suggested_category,
        ai_confidence: tx.confidence,
        account_id: matchedAccount?.id || '',
        account_name: matchedAccount?.name || '',
      };
    });

    await GoogleGenerativeAI.entities.Transaction.bulkCreate(toCreate);
    queryClient.invalidateQueries({ queryKey: ['transactions-inbox', activeBusiness.id] });
    queryClient.invalidateQueries({ queryKey: ['transactions', activeBusiness.id] });
    setSaving(false);
    setStep('done');
    setTimeout(() => { handleClose(); }, 1500);
  };

  const handleClose = () => {
    setStep('upload');
    setTransactions([]);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyber-lime" />
            Import Mutasi Bank 📂
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-cyber-lime/50 rounded-2xl p-10 text-center cursor-pointer transition-all hover:bg-cyber-lime/5"
              >
                <div className="text-4xl mb-3">📊</div>
                <p className="font-medium">Upload CSV atau Excel mutasi bank</p>
                <p className="text-sm text-muted-foreground mt-1">Format: BCA, Mandiri, BNI, BRI, dll.</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">🤖 Biyo AI akan baca dan auto-kategorisasi semua transaksimu</p>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-10 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-cyber-lime mx-auto" />
              <p className="font-medium">Biyo lagi baca mutasi bankmu...</p>
              <p className="text-xs text-muted-foreground">🧠 AI sedang menganalisis dan kategorisasi, tunggu bentar ya!</p>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{transactions.length} transaksi ditemukan</p>
                <span className="text-xs text-muted-foreground">akan masuk ke Inbox</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {transactions.map((tx, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary text-sm">
                    <span className="text-base">{tx.type === 'Pemasukan' ? '💰' : '💸'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-xs">{tx.description || tx.merchant_name}</p>
                      <p className="text-xs text-muted-foreground">{tx.date} · {tx.suggested_category || '?'}</p>
                    </div>
                    <span className={`text-xs font-bold ${tx.type === 'Pemasukan' ? 'text-cyber-lime' : 'text-destructive'}`}>
                      {formatRupiah(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="border-border">Batal</Button>
                <Button onClick={handleImport} disabled={saving} className="flex-1 bg-gradient-to-r from-cyber-lime to-primary text-primary-foreground">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Import ke Inbox 📥
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-cyber-lime mx-auto mb-3" />
              <p className="font-bold text-lg">Import berhasil! 🎉</p>
              <p className="text-sm text-muted-foreground mt-1">Transaksi masuk ke Inbox, tinggal validasi!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
