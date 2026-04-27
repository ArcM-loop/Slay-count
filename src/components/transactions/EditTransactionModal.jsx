import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatRupiah } from '@/lib/formatters';

export default function EditTransactionModal({ transaction, open, onClose }) {
  const { activeBusiness } = useBusiness();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

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
    if (!transaction || !form.amount) return;
    setSaving(true);
    const account = accounts.find(a => a.id === form.account_id);
    await GoogleGenerativeAI.entities.Transaction.update(transaction.id, {
      ...form,
      amount: parseFloat(form.amount),
      account_name: account?.name || transaction.account_name || '',
    });
    setSaving(false);
    onClose();
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
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="bg-secondary border-border text-xl font-bold h-12"
            />
            {form.amount && <p className="text-xs text-muted-foreground mt-1">{formatRupiah(parseFloat(form.amount))}</p>}
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

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Deskripsi</Label>
            <Input placeholder="Keterangan..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border" />
          </div>

          {/* Account */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Kategori Akun</Label>
            <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Pilih akun..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {filteredAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="text-muted-foreground mr-1 font-mono text-xs">{a.code}</span> {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <Button onClick={handleSave} disabled={saving || !form.amount} className="w-full h-11 bg-gradient-to-r from-primary to-neon-purple text-primary-foreground font-semibold rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾 Simpan Perubahan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
