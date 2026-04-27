import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { formatRupiah, formatDate } from '@/lib/formatters';
import { generatePONumber, TOLERANCE } from '@/lib/poMatchingEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Loader2, Plus, Package, FileText, CheckCircle, Clock,
  AlertTriangle, Trash2, X, ShoppingCart
} from 'lucide-react';

const PO_STATUSES = {
  Draft: { color: 'text-muted-foreground', bg: 'bg-muted/30', icon: FileText, label: 'Draft' },
  Open: { color: 'text-primary', bg: 'bg-primary/10', icon: Clock, label: 'Menunggu' },
  Partial: { color: 'text-amber-400', bg: 'bg-amber-400/10', icon: AlertTriangle, label: 'Sebagian' },
  Closed: { color: 'text-cyber-lime', bg: 'bg-cyber-lime/10', icon: CheckCircle, label: 'Selesai' },
};

export default function PurchaseOrderPage() {
  const { activeBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Semua');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', activeBusiness?.id],
    queryFn: () => GoogleGenerativeAI.entities.PurchaseOrder.filter(
      { business_id: activeBusiness.id }, '-created_date'
    ),
    enabled: !!activeBusiness,
  });

  const filtered = useMemo(() => {
    if (filterStatus === 'Semua') return purchaseOrders;
    return purchaseOrders.filter(po => po.status === filterStatus);
  }, [purchaseOrders, filterStatus]);

  const stats = useMemo(() => ({
    total: purchaseOrders.length,
    open: purchaseOrders.filter(p => p.status === 'Open').length,
    partial: purchaseOrders.filter(p => p.status === 'Partial').length,
    closed: purchaseOrders.filter(p => p.status === 'Closed').length,
    totalValue: purchaseOrders
      .filter(p => p.status !== 'Closed')
      .reduce((s, p) => s + (p.remaining_balance ?? p.total_amount ?? 0), 0),
  }), [purchaseOrders]);

  const handleDelete = async (id) => {
    await GoogleGenerativeAI.entities.PurchaseOrder.delete(id);
    queryClient.invalidateQueries({ queryKey: ['purchase-orders', activeBusiness?.id] });
    setShowDeleteConfirm(null);
  };

  if (!activeBusiness) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu 🏢</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Purchase Order <Package className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola pemesanan ke vendor — AI akan otomatis mencocokkan nota masuk
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-primary to-neon-purple text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> Buat PO Baru
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total PO', value: stats.total, icon: '📦', accent: 'text-foreground' },
          { label: 'Menunggu', value: stats.open, icon: '⏳', accent: 'text-primary' },
          { label: 'Sebagian', value: stats.partial, icon: '🟡', accent: 'text-amber-400' },
          { label: 'Outstanding', value: formatRupiah(stats.totalValue), icon: '💰', accent: 'text-cyber-lime' },
        ].map(({ label, value, icon, accent }) => (
          <div key={label} className="p-4 rounded-xl bg-card border border-border">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon} {label}</p>
            <p className={`text-xl font-bold mt-1 ${accent}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['Semua', 'Open', 'Partial', 'Closed', 'Draft'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === s
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {s === 'Semua' ? '📋' : PO_STATUSES[s]?.label || s} {s !== 'Semua' && `(${purchaseOrders.filter(p => s === 'Semua' || p.status === s).length})`}
          </button>
        ))}
      </div>

      {/* PO List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 bento-card">
          <p className="text-5xl mb-4">📦</p>
          <h3 className="font-bold text-lg">Belum ada Purchase Order</h3>
          <p className="text-muted-foreground text-sm mt-1">Buat PO pertamamu agar AI bisa mencocokkan nota vendor secara otomatis.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((po, i) => {
            const statusInfo = PO_STATUSES[po.status] || PO_STATUSES.Draft;
            const StatusIcon = statusInfo.icon;
            const items = po.items || [];
            const isPartial = po.status === 'Partial';

            return (
              <motion.div
                key={po.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bento-card space-y-3 group"
              >
                {/* Top row */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${statusInfo.bg}`}>
                    <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{po.vendor_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{po.po_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatRupiah(po.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(po.date)}</p>
                  </div>
                </div>

                {/* Items preview */}
                {items.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {items.map((item, idx) => (
                      <span key={idx} className="text-xs bg-secondary px-2.5 py-1 rounded-lg text-muted-foreground">
                        {item.name} × {item.qty}
                      </span>
                    ))}
                  </div>
                )}

                {/* Partial info */}
                {isPartial && (
                  <div className="p-2.5 rounded-lg bg-amber-400/5 border border-amber-400/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sisa Outstanding:</span>
                      <span className="font-bold text-amber-400">{formatRupiah(po.remaining_balance ?? 0)}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((po.total_amount - (po.remaining_balance ?? 0)) / po.total_amount) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Notes */}
                {po.notes && (
                  <p className="text-xs text-muted-foreground italic">📝 {po.notes}</p>
                )}

                {/* Actions */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(po.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create PO Modal */}
      <CreatePOModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        businessId={activeBusiness.id}
        existingCount={purchaseOrders.length}
        queryClient={queryClient}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Hapus Purchase Order?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              PO yang sudah dihapus tidak bisa dikembalikan. Transaksi yang sudah di-match dengan PO ini tidak akan terpengaruh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="border-border">Batal</Button>
            <Button variant="destructive" onClick={() => handleDelete(showDeleteConfirm)}>Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tolerance Info */}
      <div className="p-4 rounded-xl bg-secondary/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          ⚡ <strong>Auto-Matching aktif.</strong> Saat nota vendor masuk lewat Scan, AI akan otomatis mencari PO berdasarkan nomor atau nama vendor.
          Toleransi selisih harga: <strong>Normal ≤ {TOLERANCE.NORMAL_MAX}%</strong>, Maks <strong>{TOLERANCE.HARD_MAX}%</strong>. Di atas {TOLERANCE.HARD_MAX}% akan diblokir untuk review manual.
        </p>
      </div>
    </div>
  );
}

// ─── Create PO Modal ──────────────────────────────────────────
function CreatePOModal({ open, onClose, businessId, existingCount, queryClient }) {
  const [form, setForm] = useState({
    vendor_name: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'Open',
  });
  const [items, setItems] = useState([{ name: '', qty: 1, price: 0 }]);
  const [saving, setSaving] = useState(false);

  const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.price), 0);

  const addItem = () => setItems(prev => [...prev, { name: '', qty: 1, price: 0 }]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    if (!form.vendor_name.trim() || totalAmount <= 0) return;
    setSaving(true);

    const poNumber = generatePONumber(
      form.vendor_name.substring(0, 2).toUpperCase(),
      existingCount
    );

    await GoogleGenerativeAI.entities.PurchaseOrder.create({
      business_id: businessId,
      po_number: poNumber,
      vendor_name: form.vendor_name.trim(),
      date: form.date,
      status: form.status,
      total_amount: totalAmount,
      remaining_balance: totalAmount,
      items: items.filter(i => i.name.trim()),
      notes: form.notes,
    });

    queryClient.invalidateQueries({ queryKey: ['purchase-orders', businessId] });
    setSaving(false);
    // Reset
    setForm({ vendor_name: '', date: new Date().toISOString().split('T')[0], notes: '', status: 'Open' });
    setItems([{ name: '', qty: 1, price: 0 }]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> Buat Purchase Order Baru
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Vendor & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Nama Vendor/Supplier</Label>
              <Input
                placeholder="PT Maju Jaya..."
                value={form.vendor_name}
                onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))}
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Tanggal PO</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Daftar Barang/Jasa</Label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="Nama barang..."
                    value={item.name}
                    onChange={e => updateItem(idx, 'name', e.target.value)}
                    className="bg-secondary border-border flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.qty}
                    onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 0)}
                    className="bg-secondary border-border w-20"
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Harga"
                    value={item.price || ''}
                    onChange={e => updateItem(idx, 'price', parseInt(e.target.value) || 0)}
                    className="bg-secondary border-border w-32"
                  />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem} className="border-dashed border-border text-muted-foreground gap-1.5 w-full">
                <Plus className="w-3.5 h-3.5" /> Tambah Barang
              </Button>
            </div>
          </div>

          {/* Total */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Nilai PO:</span>
            <span className="text-lg font-bold text-primary">{formatRupiah(totalAmount)}</span>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Catatan (opsional)</Label>
            <Input
              placeholder="Termin 30 hari, free ongkir..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-secondary border-border"
            />
          </div>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={saving || !form.vendor_name.trim() || totalAmount <= 0}
            className="w-full bg-gradient-to-r from-primary to-neon-purple text-primary-foreground font-bold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
            Simpan Purchase Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
