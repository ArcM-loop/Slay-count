import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI, auth } from '@/API/GoogleGenerativeAI';
import { useBusiness } from '@/lib/BusinessContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Loader2, 
  Plus, 
  CheckCircle, 
  Building2, 
  Trash2, 
  MessageCircle, 
  LogOut, 
  Shield, 
  User, 
  Bell, 
  Briefcase, 
  Key,
  Camera,
  AlertCircle
} from 'lucide-react';
import TutorialChatBot from '@/components/tutorial/TutorialChatBot';

const CATEGORIES = [
  { id: 'profile', label: 'Profil Akun', icon: User },
  { id: 'business', label: 'Detail Bisnis', icon: Briefcase },
  { id: 'notifications', label: 'Notifikasi', icon: Bell },
  { id: 'security', label: 'Keamanan', icon: Shield },
];

export default function Pengaturan() {
  const { businesses, activeBusiness, setActiveBusiness, refreshBusinesses } = useBusiness();
  const [activeTab, setActiveTab] = useState('profile');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', industry: '', klu: '' });
  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');

  const handleUpdateBusiness = async (updates) => {
    if (!activeBusiness) return;
    setSaving(true);
    try {
      await GoogleGenerativeAI.entities.Business.update(activeBusiness.id, updates);
      refreshBusinesses();
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const biz = await GoogleGenerativeAI.entities.Business.create({ 
        ...form, 
        currency: 'IDR',
        user_id: auth.currentUser?.uid 
      });
      refreshBusinesses();
      setActiveBusiness(biz);
      setShowAdd(false);
      setForm({ name: '', description: '', industry: '', klu: '' });
    } catch (error) {
      console.error("Create failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBusiness = async (id) => {
    if (window.confirm("Yakin mau hapus bisnis ini? Semua data transaksi di dalamnya bakal hilang selamanya loh! 😱")) {
      await GoogleGenerativeAI.entities.Business.delete(id);
      refreshBusinesses();
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all whitespace-nowrap lg:whitespace-normal
                ${activeTab === cat.id 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                  : 'hover:bg-secondary text-muted-foreground'}`}
            >
              <cat.icon className="w-5 h-5 shrink-0" />
              <span className="font-semibold text-sm">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="bento-card">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" /> Profil Akun Google
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-3xl bg-secondary/30 border border-border/50">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-neon-purple p-1">
                          <img 
                            src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName || 'User'}&background=random`} 
                            alt="Profile" 
                            className="w-full h-full rounded-full object-cover border-4 border-background"
                          />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <p className="text-2xl font-black tracking-tight">{auth.currentUser?.displayName || 'Slay User'}</p>
                        <p className="text-muted-foreground">{auth.currentUser?.email}</p>
                        <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/20 font-bold uppercase tracking-wider">PRO ACCOUNT</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wider">GOOGLE VERIFIED</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bento-card">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" /> Informasi Tambahan
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">User ID</p>
                        <p className="text-xs font-mono truncate">{auth.currentUser?.uid}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Login Terakhir</p>
                        <p className="text-xs font-medium">{new Date(auth.currentUser?.metadata?.lastSignInTime).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'business' && (
                <div className="space-y-6">
                  {activeBusiness ? (
                    <div className="bento-card space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          <Briefcase className="w-5 h-5 text-primary" /> Identitas Bisnis Aktif
                        </h2>
                        {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center border-2 border-dashed border-border group hover:border-primary/50 cursor-pointer transition-all">
                              {activeBusiness.logo ? (
                                <img src={activeBusiness.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                              ) : (
                                <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold">Logo Bisnis</p>
                              <p className="text-xs text-muted-foreground">Format: PNG, JPG (Opsional)</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Nama Bisnis</Label>
                            <Input 
                              value={activeBusiness.name} 
                              onChange={e => handleUpdateBusiness({ name: e.target.value })}
                              className="bg-secondary/50 rounded-xl"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">NPWP (Opsional)</Label>
                            <Input 
                              placeholder="00.000.000.0-000.000"
                              value={activeBusiness.npwp || ''} 
                              onChange={e => handleUpdateBusiness({ npwp: e.target.value })}
                              className="bg-secondary/50 rounded-xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">KLU (Klasifikasi Usaha)</Label>
                            <Input 
                              placeholder="Contoh: 56101 - Restoran"
                              value={activeBusiness.klu || ''} 
                              onChange={e => handleUpdateBusiness({ klu: e.target.value })}
                              className="bg-secondary/50 rounded-xl"
                            />
                            <p className="text-[10px] text-muted-foreground italic">* Membantu otomatisasi perhitungan pajak badan.</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Alamat Kantor</Label>
                            <textarea 
                              className="w-full min-h-[100px] bg-secondary/50 border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              value={activeBusiness.address || ''} 
                              onChange={e => handleUpdateBusiness({ address: e.target.value })}
                              placeholder="Jl. Slay No. 1..."
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-border/50">
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-destructive/20 bg-destructive/5">
                          <div>
                            <p className="text-sm font-bold text-destructive">Hapus Usaha Ini</p>
                            <p className="text-xs text-muted-foreground">Aksi ini tidak bisa dibatalkan.</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            onClick={() => handleDeleteBusiness(activeBusiness.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            Hapus Permanen
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bento-card text-center py-12">
                      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                      <p className="text-muted-foreground font-medium">Pilih bisnis dulu untuk melihat detailnya~</p>
                    </div>
                  )}

                  <div className="bento-card">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" /> Daftar Bisnis Saya
                      </h2>
                      <Button onClick={() => setShowAdd(true)} size="sm" className="bg-gradient-to-r from-primary to-neon-purple text-primary-foreground gap-2 rounded-xl">
                        <Plus className="w-4 h-4" /> Tambah Baru
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {businesses.map(biz => (
                        <div
                          key={biz.id}
                          onClick={() => setActiveBusiness(biz)}
                          className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all
                            ${biz.id === activeBusiness?.id
                              ? 'border-primary/40 bg-primary/5 glow-blue'
                              : 'border-border hover:border-border/80 hover:bg-secondary/50'}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-neon-purple/20 flex items-center justify-center text-xl">
                            🏢
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm">{biz.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                              {biz.klu || biz.industry || 'Umum'}
                            </p>
                          </div>
                          {biz.id === activeBusiness?.id && <CheckCircle className="w-4 h-4 text-primary" />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="bento-card">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" /> Pengingat Pajak
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/40">
                        <div>
                          <p className="font-bold">Deadline SPT Masa</p>
                          <p className="text-xs text-muted-foreground">Ingatkan setiap tanggal 10 & 20 setiap bulan.</p>
                        </div>
                        <div className="w-12 h-6 rounded-full bg-primary/20 border border-primary/30 relative cursor-pointer p-1">
                          <div className="w-4 h-4 rounded-full bg-primary absolute right-1 shadow-glow" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/40">
                        <div>
                          <p className="font-bold">Reminder Lapor PPN</p>
                          <p className="text-xs text-muted-foreground">Ingatkan di akhir bulan untuk lapor PPN.</p>
                        </div>
                        <div className="w-12 h-6 rounded-full bg-secondary border border-border relative cursor-pointer p-1">
                          <div className="w-4 h-4 rounded-full bg-muted-foreground absolute left-1" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/40">
                        <div>
                          <p className="font-bold">Berita Pajak Terbaru</p>
                          <p className="text-xs text-muted-foreground">Update peraturan pajak dari DJP via Slay Bot.</p>
                        </div>
                        <div className="w-12 h-6 rounded-full bg-primary/20 border border-primary/30 relative cursor-pointer p-1">
                          <div className="w-4 h-4 rounded-full bg-primary absolute right-1 shadow-glow" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="bento-card">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Key className="w-5 h-5 text-primary" /> Manajemen Sesi
                    </h2>
                    <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyber-lime/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-cyber-lime" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Perangkat Saat Ini</p>
                          <p className="text-xs text-muted-foreground">IP: 182.253.xx.xxx · Jakarta, Indonesia</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => auth.signOut()}
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 gap-2 mt-2 rounded-xl"
                      >
                        <LogOut className="w-4 h-4" /> Keluar dari Sesi Ini
                      </Button>
                    </div>
                  </div>

                  <div className="bento-card border-destructive/20">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-5 h-5" /> Danger Zone
                    </h2>
                    <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 space-y-4">
                      <p className="text-xs text-muted-foreground">
                        Hati-hati! Menghapus semua data akan menghilangkan seluruh riwayat transaksi, bisnis, dan laporan kamu selamanya. Tidak ada tombol undo.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-destructive">Ketik \"HAPUS PERMANEN\" untuk konfirmasi</Label>
                        <Input 
                          placeholder="HAPUS PERMANEN" 
                          value={resetConfirm}
                          onChange={e => setResetConfirm(e.target.value)}
                          className="bg-background border-destructive/20 focus:ring-destructive"
                        />
                      </div>
                      <Button 
                        disabled={resetConfirm !== 'HAPUS PERMANEN'}
                        variant="destructive" 
                        className="w-full shadow-lg shadow-destructive/20 rounded-xl"
                      >
                        RESET SEMUA DATA SAYA
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Add business modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Tambah Bisnis Baru 🏢</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Nama Bisnis *</Label>
              <Input 
                placeholder="Nama keren bisnis kamu..." 
                value={form.name} 
                onChange={e => setForm(f => ({...f, name: e.target.value}))} 
                className="bg-secondary border-border rounded-xl" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Industri / KLU</Label>
              <Input 
                placeholder="F&B, Jasa Kreatif, 56101..." 
                value={form.klu} 
                onChange={e => setForm(f => ({...f, klu: e.target.value}))} 
                className="bg-secondary border-border rounded-xl" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Deskripsi Singkat</Label>
              <Input 
                placeholder="Bisnis kopi hits Jakarta..." 
                value={form.description} 
                onChange={e => setForm(f => ({...f, description: e.target.value}))} 
                className="bg-secondary border-border rounded-xl" 
              />
            </div>
            <Button 
              onClick={handleCreate} 
              disabled={saving || !form.name} 
              className="w-full bg-gradient-to-r from-primary to-neon-purple text-primary-foreground h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 mt-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              Buat Bisnis 🚀
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Tutorial ChatBot */}
      <TutorialChatBot />
    </div>
  );
}