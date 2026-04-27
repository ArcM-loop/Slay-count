import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// 1. Import diubah ke GoogleGenerativeAI
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { DEFAULT_COA_INDONESIA } from '@/lib/defaultAccounts';
import { getAccountTypeColor, ACCOUNT_TYPE_EMOJI } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';

const TYPES = ['Aset', 'Kewajiban', 'Ekuitas', 'Pendapatan', 'Beban'];

export default function Akun() {
  const { activeBusiness } = useBusiness();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('Semua');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'Beban', sub_type: '', description: '' });
  const [generatingCOA, setGeneratingCOA] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', activeBusiness?.id],
    // 2. base44 diubah jadi GoogleGenerativeAI
    queryFn: () => GoogleGenerativeAI.entities.Account.filter({ business_id: activeBusiness.id }, 'code'),
    enabled: !!activeBusiness,
  });

  const filtered = filterType === 'Semua' ? accounts : accounts.filter(a => a.type === filterType);

  const grouped = TYPES.reduce((acc, type) => {
    acc[type] = filtered.filter(a => a.type === type);
    return acc;
  }, {});

  const handleAdd = async () => {
    // 3. base44 diubah jadi GoogleGenerativeAI
    await GoogleGenerativeAI.entities.Account.create({ ...form, business_id: activeBusiness.id });
    queryClient.invalidateQueries({ queryKey: ['accounts', activeBusiness?.id] });
    setShowAdd(false);
    setForm({ code: '', name: '', type: 'Beban', sub_type: '', description: '' });
  };

  const handleDelete = async (id) => {
    // 4. base44 diubah jadi GoogleGenerativeAI
    await GoogleGenerativeAI.entities.Account.delete(id);
    queryClient.invalidateQueries({ queryKey: ['accounts', activeBusiness?.id] });
  };

  const handleGenerateCOA = async () => {
    setGeneratingCOA(true);
    const existing = accounts.map(a => a.code);
    const toCreate = DEFAULT_COA_INDONESIA
      .filter(a => !existing.includes(a.code))
      .map(a => ({ ...a, business_id: activeBusiness.id }));
    if (toCreate.length > 0) {
      // 5. base44 diubah jadi GoogleGenerativeAI
      await GoogleGenerativeAI.entities.Account.bulkCreate(toCreate);
      queryClient.invalidateQueries({ queryKey: ['accounts', activeBusiness?.id] });
    }
    setGeneratingCOA(false);
  };

  if (!activeBusiness) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Pilih bisnis dulu 🏢</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bagan Akun (COA) 📚</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{accounts.length} akun terdaftar</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateCOA} disabled={generatingCOA} variant="outline" className="border-primary/30 text-primary gap-2">
            {generatingCOA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate COA
          </Button>
          <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-primary to-neon-purple text-primary-foreground gap-2">
            <Plus className="w-4 h-4" /> Tambah Akun
          </Button>
        </div>
      </motion.div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['Semua', ...TYPES].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${filterType === t ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>
            {ACCOUNT_TYPE_EMOJI[t] || '📋'} {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bento-card">
          <p className="text-5xl mb-4">📚</p>
          <h3 className="font-bold text-lg mb-2">Belum ada akun nih!</h3>
          <p className="text-muted-foreground text-sm mb-4">Klik "Generate COA Indonesia" buat auto-generate akun standar, atau tambah manual.</p>
          <Button onClick={handleGenerateCOA} disabled={generatingCOA} className="bg-gradient-to-r from-primary to-neon-purple text-primary-foreground">
            {generatingCOA ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Generate Sekarang ✨
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {TYPES.map(type => {
            const list = grouped[type];
            if (list.length === 0) return null;
            return (
              <motion.div key={type} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bento-card">
                <h3 className={`font-bold mb-3 flex items-center gap-2 ${getAccountTypeColor(type)}`}>
                  <span className="text-lg">{ACCOUNT_TYPE_EMOJI[type]}</span> {type}
                  <span className="text-xs text-muted-foreground font-normal ml-auto">{list.length} akun</span>
                </h3>
                <div className="space-y-1.5">
                  {list.map(a => (
                    <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary/50 transition-colors group">
                      <code className="text-xs text-muted-foreground font-mono w-16 flex-shrink-0">{a.code}</code>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.sub_type}</p>
                      </div>
                      {a.is_system && <span className="text-xs text-muted-foreground">sistem</span>}
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Tambah Akun Baru ✨</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Kode Akun</Label>
                <Input placeholder="1-1001" value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))} className="bg-secondary border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Tipe</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({...f, type: v}))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {TYPES.map(t => <SelectItem key={t} value={t}>{ACCOUNT_TYPE_EMOJI[t]} {t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Nama Akun</Label>
              <Input placeholder="Nama akun..." value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Sub-tipe (opsional)</Label>
              <Input placeholder="Misal: Aset Lancar" value={form.sub_type} onChange={e => setForm(f => ({...f, sub_type: e.target.value}))} className="bg-secondary border-border" />
            </div>
            <Button onClick={handleAdd} className="w-full bg-gradient-to-r from-primary to-neon-purple text-primary-foreground">
              Simpan Akun
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}