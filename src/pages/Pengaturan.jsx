import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
// 1. Import base44 diganti jadi GoogleGenerativeAI
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, CheckCircle, Building2, Trash2 } from 'lucide-react';

export default function Pengaturan() {
  const { businesses, activeBusiness, setActiveBusiness, refreshBusinesses } = useBusiness();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', industry: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    // 2. base44 diganti jadi GoogleGenerativeAI
    const biz = await GoogleGenerativeAI.entities.Business.create({ ...form, currency: 'IDR' });
    refreshBusinesses();
    setActiveBusiness(biz);
    setShowAdd(false);
    setForm({ name: '', description: '', industry: '' });
    setSaving(false);
  };

  const handleDelete = async (id) => {
    // 3. base44 diganti jadi GoogleGenerativeAI
    await GoogleGenerativeAI.entities.Business.delete(id);
    refreshBusinesses();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Pengaturan ⚙️</h1>
        <p className="text-sm text-muted-foreground">Kelola bisnis dan preferensi kamu</p>
      </motion.div>

      {/* Bisnis section */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bento-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Bisnis Saya
          </h2>
          <Button onClick={() => setShowAdd(true)} size="sm" className="bg-gradient-to-r from-primary to-neon-purple text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Tambah Bisnis
          </Button>
        </div>

        {businesses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🏢</p>
            <p className="text-muted-foreground text-sm">Belum ada bisnis. Yuk buat yang pertama!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map(biz => (
              <div
                key={biz.id}
                onClick={() => setActiveBusiness(biz)}
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all
                  ${biz.id === activeBusiness?.id
                    ? 'border-primary/40 bg-primary/5 glow-blue'
                    : 'border-border hover:border-border/80 hover:bg-secondary/50'}`}
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-neon-purple/20 flex items-center justify-center text-xl">
                  🏢
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{biz.name}</p>
                  <p className="text-xs text-muted-foreground">{biz.industry || 'Industri belum diset'} · {biz.currency}</p>
                  {biz.description && <p className="text-xs text-muted-foreground mt-0.5">{biz.description}</p>}
                </div>
                {biz.id === activeBusiness?.id && (
                  <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                    <CheckCircle className="w-4 h-4" /> Aktif
                  </div>
                )}
                {biz.id !== activeBusiness?.id && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(biz.id); }}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* About section */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bento-card">
        <h2 className="font-bold mb-3">✨ Tentang Slay Count</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>🤖 Powered by AI — scan nota, import CSV, auto-kategorisasi</p>
          <p>📊 Laporan Laba/Rugi & Neraca otomatis</p>
          <p>🏆 Dibuat khusus untuk pejuang bisnis Gen Z Indonesia</p>
          <p className="text-primary font-medium mt-3">Version 1.0.0 · Slay Count</p>
        </div>
      </motion.div>

      {/* Add business modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Tambah Bisnis Baru 🏢</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Nama Bisnis *</Label>
              <Input placeholder="Nama keren bisnis kamu..." value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Industri</Label>
              <Input placeholder="F&B, Jasa, Retail, dll..." value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Deskripsi</Label>
              <Input placeholder="Deskripsi singkat..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="bg-secondary border-border" />
            </div>
            <Button onClick={handleCreate} disabled={saving || !form.name} className="w-full bg-gradient-to-r from-primary to-neon-purple text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Buat Bisnis 🚀
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}