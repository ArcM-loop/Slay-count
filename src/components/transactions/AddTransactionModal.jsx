import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatRupiah } from '@/lib/formatters';
import TaxTypeSelector from '@/components/tax/TaxTypeSelector';
import { TAX_RULES, calculateTax, detectTaxType } from '@/logic/tax/calculator';

export default function AddTransactionModal({ open, onClose }) {
  const { activeBusiness } = useBusiness();
  const [form, setForm] = useState({ type: 'Pengeluaran', date: new Date().toISOString().split('T')[0], amount: '', description: '', merchant_name: '', account_id: '', tax_type: 'NONE', tax_rate: 0, tax_amount: 0, is_deductible: true, vendor_npwp: '' });
  const [saving, setSaving] = useState(false);

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

  // Auto-detect pajak saat akun berubah
  const handleAccountChange = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      const detectedTax = detectTaxType(account.name);
      const rule = TAX_RULES[detectedTax];
      const taxAmt = form.amount ? calculateTax(parseFloat(form.amount), detectedTax) : 0;
      setForm(f => ({
        ...f,
        account_id: accountId,
        tax_type: detectedTax,
        tax_rate: rule?.rate || 0,
        tax_amount: taxAmt,
        is_deductible: detectedTax === 'NONE' ? true : (rule?.type !== 'none'),
      }));
    } else {
      setForm(f => ({ ...f, account_id: accountId }));
    }
  };

  // Recalculate tax amount saat amount atau tax_type berubah
  const handleAmountChange = (val) => {
    const taxAmt = val && form.tax_type !== 'NONE' ? calculateTax(parseFloat(val), form.tax_type) : 0;
    setForm(f => ({ ...f, amount: val, tax_amount: taxAmt }));
  };

  const handleTaxTypeChange = (taxType) => {
    const rule = TAX_RULES[taxType];
    const taxAmt = form.amount ? calculateTax(parseFloat(form.amount), taxType) : 0;
    setForm(f => ({ ...f, tax_type: taxType, tax_rate: rule?.rate || 0, tax_amount: taxAmt }));
  };

  const handleSave = async () => {
    if (!activeBusiness || !form.amount || !form.date) return;
    setSaving(true);
    const account = accounts.find(a => a.id === form.account_id);
    await GoogleGenerativeAI.entities.Transaction.create({
      ...form,
      business_id: activeBusiness.id,
      amount: parseFloat(form.amount),
      account_name: account?.name || '',
      status: 'Final',
      source: 'Manual',
    });
    setSaving(false);
    setForm({ type: 'Pengeluaran', date: new Date().toISOString().split('T')[0], amount: '', description: '', merchant_name: '', account_id: '', tax_type: 'NONE', tax_rate: 0, tax_amount: 0, is_deductible: true, vendor_npwp: '' });
    onClose();
  };

  const types = [
    { value: 'Pemasukan', label: '💰 Pemasukan' },
    { value: 'Pengeluaran', label: '💸 Pengeluaran' },
    { value: 'Transfer', label: '↔️ Transfer' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Zap className="w-5 h-5 text-primary" />
            Tambah Transaksi Cepat ⚡
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Type selector */}
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
            <Label className="text-xs text-muted-foreground mb-1.5 block">Jumlah (DPP)</Label>
            <Input
              type="number"
              placeholder="0"
              value={form.amount}
              onChange={e => handleAmountChange(e.target.value)}
              className="bg-secondary border-border text-2xl font-bold h-14"
            />
            {form.amount && (
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">{formatRupiah(parseFloat(form.amount))}</p>
                {form.tax_amount > 0 && (
                  <p className="text-xs text-primary font-medium">
                    + Pajak: {formatRupiah(form.tax_amount)} ({TAX_RULES[form.tax_type]?.label})
                  </p>
                )}
              </div>
            )}
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
            <Input placeholder="Keterangan transaksi..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-secondary border-border" />
          </div>

          {/* Account */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Kategori Akun</Label>
            <Select value={form.account_id} onValueChange={handleAccountChange}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Pilih akun..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {filteredAccounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="text-muted-foreground mr-1">{a.code}</span> {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tax Type - Auto-detected, bisa di-override */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <TaxTypeSelector
              value={form.tax_type}
              onChange={handleTaxTypeChange}
              label="⚡ Jenis Pajak (auto-detect dari akun)"
            />
            {form.tax_amount > 0 && (
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-muted-foreground">Nominal pajak:</span>
                <span className="text-primary font-bold">{formatRupiah(form.tax_amount)}</span>
              </div>
            )}
            {form.tax_type !== 'NONE' && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground mb-1 block">NPWP Vendor (opsional, untuk e-Bupot)</Label>
                <Input
                  placeholder="00.000.000.0-000.000"
                  value={form.vendor_npwp}
                  onChange={e => setForm(f => ({ ...f, vendor_npwp: e.target.value }))}
                  className="bg-secondary border-border h-8 text-sm"
                />
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving || !form.amount} className="w-full h-11 bg-gradient-to-r from-primary to-neon-purple text-primary-foreground font-semibold rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ Simpan Transaksi'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
