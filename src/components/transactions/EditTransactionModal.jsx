import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatRupiah } from '@/lib/formatters';
import { Sparkles } from 'lucide-react';
import { isPeriodLocked, PERIOD_LOCKED_ERROR } from '@/lib/accountingValidation';
import { toast } from 'sonner';
import { createJournalEntries, deleteJournalEntries } from '@/lib/journalEngine';
import DigitalVATBadge from '@/components/tax/DigitalVATBadge';

export default function EditTransactionModal({ transaction, open, onClose }) {
  const { activeBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [swarmWarnings, setSwarmWarnings] = useState([]);

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type || 'Pengeluaran',
        date: transaction.date || new Date().toISOString().split('T')[0],
        amount: transaction.amount || '',
        description: transaction.description || '',
        merchant_name: transaction.merchant_name || '',
        account_id: transaction.account_id || '',
        status: transaction.status || 'Inbox',
        ppn: transaction.ppn || 0,
        pph_type: transaction.pph_type || 'none',
        pph_amount: transaction.pph_amount || 0,
        dpp: transaction.dpp || transaction.amount || 0,
        isExpertService: transaction.isExpertService || false,
        isNonBKP: transaction.isNonBKP || false,
        isRegionalTax: transaction.isRegionalTax || false,
        isForeignResident: transaction.isForeignResident || false,
      });
    }
  }, [transaction]);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }),
    enabled: !!activeBusiness,
  });

  const filteredAccounts = accounts.filter(a => {
    if (form.type === 'Pemasukan') return a.type === 'Pendapatan';
    if (form.type === 'Pengeluaran') return a.type === 'Beban';
    return true;
  });

  const handleSave = async () => {
    if (!transaction || !form.dpp) return;

    // 1. Lock Period Check
    const originalLocked = await isPeriodLocked(transaction.date, activeBusiness.id);
    const newLocked = await isPeriodLocked(form.date, activeBusiness.id);
    if (originalLocked || newLocked) {
      toast.error(PERIOD_LOCKED_ERROR);
      return;
    }

    setSaving(true);
    setSwarmWarnings([]);

    try {
      const account = accounts.find(a => a.id === form.account_id);
      const updatedTx = {
        ...form,
        id: transaction.id,
        business_id: activeBusiness.id,
        amount: parseFloat(form.dpp) + parseFloat(form.ppn || 0) - parseFloat(form.pph_amount || 0),
        account_name: account?.name || transaction.account_name || '',
      };

      // 2. Update data transaksi di database
      await GoogleGenerativeAI.entities.Transaction.update(transaction.id, updatedTx);

      // 3. Jika status Final → Re-create jurnal melalui Swarm Validation
      if (form.status === 'Final') {
        // Hapus jurnal lama terlebih dahulu
        await deleteJournalEntries(transaction.id);

        // Cari akun Kas/Bank default sebagai paymentAccount
        const paymentAccount = accounts.find(a =>
          a.type === 'Aset' && (a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank'))
        );

        if (paymentAccount) {
          // Buat jurnal baru dengan validasi Swarm penuh
          await createJournalEntries(updatedTx, accounts, paymentAccount.id);
          toast.success('✅ Transaksi diperbarui & jurnal baru divalidasi Swarm!');
        } else {
          toast.warning('⚠️ Jurnal tidak dibuat: Akun Kas/Bank tidak ditemukan.');
        }
      } else {
        toast.success('Transaksi berhasil diperbarui.');
      }

      // 4. Refresh data di seluruh halaman
      queryClient.invalidateQueries({ queryKey: ['transactions', activeBusiness?.id] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries', activeBusiness?.id] });
      onClose();

    } catch (err) {
      // Tangkap error dari Swarm (misalnya konsensus gagal)
      toast.error(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };


  const types = [
    { value: 'Pemasukan', label: '💰 Pemasukan' },
    { value: 'Pengeluaran', label: '💸 Pengeluaran' },
    { value: 'Transfer', label: '↔️ Transfer' },
  ];

  const statuses = ['Inbox', 'Divalidasi', 'Final'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Transaksi ✏️
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulir untuk memperbarui detail transaksi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Type */}
          <div className="flex gap-2">
            {types.map(t => (
              <button
                key={t.value}
                onClick={() => setForm(f => ({ ...f, type: t.value, account_id: '' }))}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all
                  ${form.type === t.value ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Jumlah</Label>
            <Input
              type="number"
              value={form.dpp}
              onChange={e => setForm(f => ({ ...f, dpp: e.target.value }))}
              className="bg-secondary border-border text-xl font-bold h-12"
            />
            {form.dpp && <p className="text-xs text-muted-foreground mt-1">Pokok (DPP): {formatRupiah(parseFloat(form.dpp))}</p>}
          </div>

          {/* Date & Merchant */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Tanggal</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Merchant/Vendor</Label>
              <Input placeholder="Nama toko..." value={form.merchant_name} onChange={e => setForm(f => ({ ...f, merchant_name: e.target.value }))} className="bg-secondary border-border" />
            </div>
          </div>

          {/* Digital VAT Status Badge — Muncul otomatis jika vendor asing terdeteksi */}
          <DigitalVATBadge
            merchantName={form.merchant_name}
            isForeignResident={form.isForeignResident}
          />
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Deskripsi</Label>
            <Input placeholder="Keterangan..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border" />
          </div>

          {/* Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Kategori Akun</Label>
              <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                <SelectTrigger className="bg-secondary border-border h-10">
                  <SelectValue placeholder="Pilih akun..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {filteredAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="text-muted-foreground mr-1 font-mono text-[10px]">{a.code}</span> {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="bg-secondary border-border h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Inbox">📥 Inbox</SelectItem>
                  <SelectItem value="Final">✅ Final (Jurnal)</SelectItem>
                  <SelectItem value="Review">🧐 Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tax Section - Unified CoreTax Ready */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
            <p className="text-[10px] font-bold uppercase text-primary tracking-widest flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Pajak Unifikasi (CoreTax Ready)
            </p>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button 
                onClick={() => setForm(f => ({ ...f, isNonBKP: !f.isNonBKP, ppn: !f.isNonBKP ? 0 : f.ppn, isRegionalTax: false }))}
                className={`py-1 rounded-md text-[9px] font-bold uppercase border transition-all ${form.isNonBKP ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-secondary border-border text-muted-foreground'}`}
              >
                {form.isNonBKP ? '🚫 Non-BKP (Bebas PPN)' : '📦 Objek PPN'}
              </button>
              <button 
                onClick={() => setForm(f => ({ ...f, isRegionalTax: !f.isRegionalTax, ppn: 0, isNonBKP: false }))}
                className={`py-1 rounded-md text-[9px] font-bold uppercase border transition-all ${form.isRegionalTax ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' : 'bg-secondary border-border text-muted-foreground'}`}
              >
                {form.isRegionalTax ? '🏛️ Pajak Daerah (PBJT)' : '🏢 Pajak Pusat'}
              </button>
              <button 
                onClick={() => setForm(f => ({ ...f, isExpertService: !f.isExpertService }))}
                className={`py-1 rounded-md text-[9px] font-bold uppercase border transition-all ${form.isExpertService ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500' : 'bg-secondary border-border text-muted-foreground'}`}
              >
                {form.isExpertService ? '🎓 Tenaga Ahli (50%)' : '👨‍💼 Umum'}
              </button>
              <button 
                onClick={() => setForm(f => ({ ...f, isForeignResident: !f.isForeignResident }))}
                className={`py-1 rounded-md text-[9px] font-bold uppercase border transition-all ${form.isForeignResident ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-secondary border-border text-muted-foreground'}`}
              >
                {form.isForeignResident ? '🌏 Luar Negeri (PPh 26)' : '🇮🇩 Domestik'}
              </button>
              <button 
                onClick={() => setForm(f => ({ ...f, isNonFiscal: !f.isNonFiscal }))}
                className={`py-1 rounded-md text-[9px] font-bold uppercase border transition-all ${form.isNonFiscal ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' : 'bg-secondary border-border text-muted-foreground'}`}
              >
                {form.isNonFiscal ? '⚠️ Biaya Non-Fiskal' : '✅ Biaya Fiskal'}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">PPN (11%)</Label>
                <div className="flex gap-1">
                  <Input 
                    type="number" 
                    value={form.ppn} 
                    onChange={e => setForm(f => ({ ...f, ppn: e.target.value }))}
                    className="bg-background border-border h-8 text-xs"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 px-2 text-[10px] bg-primary/10 text-primary"
                    onClick={() => setForm(f => ({ ...f, ppn: Math.floor(f.dpp * 0.11) }))}
                  >
                    Auto
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Potong PPh</Label>
                <Select value={form.pph_type} onValueChange={(v) => {
                    let rate = 0;
                    let dppFactor = 1;
                    if (v === '21') {
                      rate = 0.05; 
                      if (form.isExpertService) dppFactor = 0.5;
                    }
                    if (v === '23') rate = 0.02;
                    if (v === '4(2)') rate = 0.10;
                    if (form.isForeignResident) {
                      rate = 0.20; // PPh 26 Override
                    }
                    setForm(f => ({ ...f, pph_type: v, pph_amount: Math.floor(f.dpp * dppFactor * rate) }));
                  }}>
                  <SelectTrigger className="bg-background border-border h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="none">Tanpa PPh</SelectItem>
                    <SelectItem value="21">{form.isExpertService ? 'PPh 21 (Norma 50%)' : 'PPh 21 (Pegawai)'}</SelectItem>
                    <SelectItem value="23">PPh 23 (2%)</SelectItem>
                    <SelectItem value="4(2)">PPh 4(2) (10%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.pph_type !== 'none' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nominal PPh</Label>
                <Input 
                  type="number" 
                  value={form.pph_amount} 
                  onChange={e => setForm(f => ({ ...f, pph_amount: e.target.value }))}
                  className="bg-background border-border h-8 text-xs text-destructive"
                />
              </div>
            )}

            <div className="pt-2 border-t border-primary/10 flex justify-between items-center">
              <span className="text-[10px] font-bold text-muted-foreground">TOTAL BAYAR (NET)</span>
              <span className="text-sm font-black text-primary">
                {formatRupiah(parseFloat(form.dpp || 0) + parseFloat(form.ppn || 0) - parseFloat(form.pph_amount || 0))}
              </span>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
            <div className="flex gap-2">
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all
                    ${form.status === s ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || !form.dpp || (activeBusiness?.lockDate && form.date <= activeBusiness.lockDate)} 
            className="w-full h-11 bg-gradient-to-r from-primary to-neon-purple text-primary-foreground font-semibold rounded-xl"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             (activeBusiness?.lockDate && form.date <= activeBusiness.lockDate) ? '🔒 Periode Terkunci' : '💾 Simpan Perubahan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
