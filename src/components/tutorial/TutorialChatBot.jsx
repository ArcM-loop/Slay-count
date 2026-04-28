import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Sparkles, X, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================
// KNOWLEDGE BASE — Simple feature explanations only.
// No system internals, no architecture, no implementation details.
// ============================================================
const KNOWLEDGE_BASE = [
  {
    keywords: ['dashboard', 'beranda', 'home', 'halaman utama'],
    answer: 'Dashboard itu kayak home base kamu bestie! 🏠 Di situ ada ringkasan keuangan bisnis kamu — total pemasukan, pengeluaran, sama grafik biar kamu tau kondisi bisnis sekilas. Tinggal buka aja, udah keliatan semua~ ✨'
  },
  {
    keywords: ['transaksi', 'transaction', 'catat', 'input', 'tambah transaksi'],
    answer: 'Mau catat transaksi? Gampang banget! Klik tombol + (yang gede warna biru di kanan bawah), terus isi detailnya — jumlah, tanggal, kategori. Bisa juga scan nota pake kamera lho! Auto di-isi sama AI~ 📸💅'
  },
  {
    keywords: ['scan', 'nota', 'struk', 'foto', 'kamera', 'upload'],
    answer: 'Fitur Scan Nota tuh literally game changer! 🔥 Tinggal foto nota/struk kamu, nanti AI Biyo bakal baca otomatis — merchant, jumlah, tanggal, semua ke-extract. Kalo e-Faktur, bisa scan QR code-nya juga buat akurasi 100%! No cap~ 💯'
  },
  {
    keywords: ['coa', 'akun', 'chart of account', 'kategori', 'buku besar'],
    answer: 'COA (Chart of Accounts) itu kayak folder-folder buat nge-group transaksi kamu bestie~ 📚 Ada Aset, Liabilitas, Ekuitas, Pendapatan, Beban. Kamu bisa bikin akun baru atau pake yang udah ada. Biar rapi aja gitu pembukuannya! ✨'
  },
  {
    keywords: ['laporan', 'report', 'laba rugi', 'neraca', 'profit loss', 'balance sheet'],
    answer: 'Di menu Laporan, kamu bisa liat Laporan Laba Rugi sama Neraca otomatis! 📊 Tinggal pilih periode-nya, semua ke-generate sendiri. Bisa di-export ke Excel juga lho buat keperluan pajak atau investor~ Slayy! 💪'
  },
  {
    keywords: ['validasi', 'validation', 'inbox', 'review'],
    answer: 'Validasi itu tempat kamu ngecek transaksi yang masuk dari scan nota atau import~ ✅ AI udah kasih saran kategori-nya, kamu tinggal approve atau edit. Kayak quality check gitu biar data kamu bener semua! Super gampang bestie~ 💅'
  },
  {
    keywords: ['pajak', 'tax', 'ppn', 'faktur', 'efaktur', 'e-faktur', 'npwp'],
    answer: 'Tax Center itu fitur buat urusan perpajakan! 🏛️ Kamu bisa liat summary PPN, manage e-Faktur, dan generate laporan pajak. Kalo scan QR e-Faktur, data NPWP sama DPP/PPN langsung ke-isi otomatis. Bye bye ribet~ ✌️'
  },
  {
    keywords: ['siklus', 'akuntansi', 'jurnal', 'journal', 'posting'],
    answer: 'Siklus Akuntansi itu flow lengkap dari transaksi sampe laporan keuangan! ♻️ Mulai dari input → jurnal → buku besar → laporan. Di Slay Count semua otomatis, kamu ga perlu ngerti double entry secara manual. Chill aja~ 😎'
  },
  {
    keywords: ['purchase order', 'po', 'pesanan', 'order'],
    answer: 'Purchase Order buat bikin pesanan pembelian ke supplier! 📦 Isi detail barang, qty, harga — nanti bisa di-convert jadi transaksi pas barangnya udah dateng. Organized banget kan~ ✨'
  },
  {
    keywords: ['biyo', 'ai', 'artificial intelligence', 'kecerdasan buatan'],
    answer: 'Biyo itu AI assistant kita yang bantu baca nota, kategorisasi transaksi, sama kasih saran akuntansi! 🤖✨ Dia belajar dari data kamu biar makin akurat. Basically kayak asisten akuntan pribadi kamu gitu~ Slay banget kan! 💅'
  },
  {
    keywords: ['bisnis', 'business', 'perusahaan', 'usaha', 'tambah bisnis'],
    answer: 'Kamu bisa kelola multiple bisnis di Slay Count! 🏢 Tinggal ke Pengaturan, klik Tambah Bisnis, isi nama & industri. Terus switch antar bisnis pake dropdown di sidebar. Gampang banget manage semua bisnis kamu~ 💪'
  },
  {
    keywords: ['export', 'excel', 'csv', 'download', 'unduh'],
    answer: 'Mau export data? Bisa banget! 📥 Di halaman Laporan, ada tombol export ke Excel/CSV. Tinggal klik, file langsung ke-download. Cocok buat laporan ke investor atau keperluan audit pajak~ Easy peasy! ✨'
  },
  {
    keywords: ['pengaturan', 'settings', 'setting', 'atur'],
    answer: 'Di Pengaturan kamu bisa manage bisnis — tambah, hapus, atau switch bisnis aktif! ⚙️ Plus ada info tentang Slay Count dan (hehe) chatbot tutorial ini~ Basically semua preferensi kamu ada di sini bestie! 💅'
  },
  {
    keywords: ['autopilot', 'otomatis', 'auto'],
    answer: 'Autopilot mode itu fitur dimana transaksi dengan confidence tinggi (95%+) langsung di-proses otomatis tanpa perlu kamu validasi manual! ⚡ Bisa di-aktifin buat hemat waktu. Tapi tetep bisa di-review kapan aja kok~ No worries! 😌'
  },
  {
    keywords: ['halo', 'hai', 'hey', 'hi', 'hello', 'helo', 'p', 'woi', 'bang', 'kak', 'sis', 'bro'],
    answer: 'Haiii bestie! 👋✨ Aku Slay Bot, asisten tutorial kamu di Slay Count~ Mau tau cara pake fitur apa nih? Tanya aja, aku bantuin! 💅🔥'
  },
  {
    keywords: ['terima kasih', 'makasih', 'thanks', 'thank', 'thx', 'tq'],
    answer: 'Sama-sama bestie! 🥰✨ Seneng bisa bantuin kamu~ Kalo ada yang masih bingung, tanya aja lagi ya! Slay Count always got your back! 💪💅'
  },
  {
    keywords: ['fitur', 'feature', 'apa aja', 'bisa apa', 'fungsi'],
    answer: 'Slay Count punya banyak fitur keren nih bestie! ✨\n\n🏠 Dashboard — ringkasan keuangan\n💳 Transaksi — catat pemasukan/pengeluaran\n📸 Scan Nota — AI baca struk otomatis\n📚 COA — kelola akun keuangan\n📊 Laporan — Laba Rugi & Neraca\n✅ Validasi — review transaksi AI\n🏛️ Tax Center — urusan pajak\n📦 Purchase Order — pesanan pembelian\n🤖 Biyo AI — asisten pintar\n\nTanya yang mana aja, aku jelasin! 💅'
  },
];

// ============================================================
// BLOCKED PATTERNS — Questions that probe system internals
// ============================================================
const BLOCKED_PATTERNS = [
  // Technical/Architecture probing
  /(?:cara\s*kerja|mekanisme|arsitektur|architecture|sistem|system|infrastruktur|backend|server|database|schema|struktur\s*data)/i,
  /(?:tech\s*stack|stack|framework|library|dependencies|pakai\s*apa|pake\s*apa|built\s*with)/i,
  /(?:source\s*code|kode|code|repository|repo|github|open\s*source)/i,
  /(?:api|endpoint|rest|graphql|webhook|request|response|payload)/i,
  /(?:algorithm|algoritma|logic|logika|formula|perhitungan\s*(?:detail|lengkap|internal))/i,
  // Security probing
  /(?:hack|exploit|bypass|celah|vulnerability|keamanan|security|inject|xss|sql|token|session|auth(?:entication)?|password|credential)/i,
  /(?:reverse\s*engineer|decompile|inspect|debug\s*mode|console|devtools)/i,
  // Audit / deep system access
  /(?:audit\s*(?:sistem|system|internal|code|kode)|penetration|pentest)/i,
  // Competitor intelligence
  /(?:competitor|kompetitor|saingan|recreate|bikin\s*ulang|clone|cloning|replika|tiruan)/i,
  // Data extraction / scraping
  /(?:scrape|scraping|crawl|extract\s*(?:all|semua|data)|dump|backup\s*(?:database|semua|all))/i,
  // Pricing / business model probing
  /(?:pricing\s*model|revenue|monetize|business\s*model|model\s*bisnis)/i,
  // Prompt injection attempts
  /(?:ignore\s*(?:previous|sebelumnya)|forget\s*(?:instruction|rules)|override|system\s*prompt|jailbreak)/i,
];

const DEFLECTION_RESPONSES = [
  'Hmm aku kurang paham pertanyaan itu bestie~ 🤔 Aku cuma bisa bantuin soal cara pake fitur-fitur Slay Count aja! Coba tanya yang lain yuk~ 💅',
  'Waduh, itu di luar jangkauan aku nih 😅 Aku spesialisasinya jelasin fitur-fitur Slay Count biar kamu makin jago pake-nya! Mau tau fitur apa? ✨',
  'Sorry bestie, aku ga ngerti yang itu~ 🙈 Tapi kalo mau tau cara pake Dashboard, Scan Nota, atau fitur lainnya, aku siap bantuin! 💪',
  'Ehh itu aku ga bisa jawab sih hehe~ 😬 Aku fokusnya bantuin kamu navigate fitur-fitur Slay Count aja! Ada yang mau ditanyain soal fitur? 🔥',
  'That\'s a bit out of my lane bestie~ 🛤️ Aku tuh kayak tour guide-nya Slay Count, jadi tanya aja soal fitur-fitur yang ada! 💅✨',
];

const FALLBACK_RESPONSES = [
  'Hmm aku belum ada info soal itu nih bestie~ 🤔 Coba tanya tentang fitur spesifik kayak Dashboard, Transaksi, Scan Nota, Laporan, atau Tax Center! ✨',
  'Aku ga nemu jawaban yang pas nih~ 😅 Tapi coba tanya soal cara pake salah satu fitur Slay Count, pasti aku bisa bantuin! 💅',
  'Belum ketemu nih jawabannya~ 🙈 Kalo mau, aku bisa jelasin fitur-fitur utama Slay Count! Ketik "fitur" buat liat daftar lengkapnya~ ✨',
];

/**
 * Finds the best matching answer from the knowledge base.
 * Returns null if no match found.
 */
function findAnswer(query) {
  const q = query.toLowerCase().trim();

  // 1. Check blocked patterns first
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(q)) {
      return DEFLECTION_RESPONSES[Math.floor(Math.random() * DEFLECTION_RESPONSES.length)];
    }
  }

  // 2. Score each knowledge base entry
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) {
        // Longer keyword matches get higher scores
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestScore >= 2) {
    return bestMatch.answer;
  }

  // 3. Fallback
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// ============================================================
// COMPONENT
// ============================================================
export default function TutorialChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Heyy bestie! 👋✨ Aku Slay Bot, asisten tutorial kamu~\n\nMau tau cara pake fitur apa nih? Tanya aja! Aku jelasin dengan bahasa yang gampang dipahami 💅🔥',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = (override) => {
    const trimmed = (override || input).trim();
    if (!trimmed) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setIsTyping(true);

    // Simulate small "thinking" delay for realism
    const delay = 400 + Math.random() * 800;
    setTimeout(() => {
      const answer = findAnswer(trimmed);
      setMessages(prev => [...prev, { role: 'bot', text: answer }]);
      setIsTyping(false);
    }, delay);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick suggestion chips
  const SUGGESTIONS = ['Fitur apa aja?', 'Cara scan nota', 'Gimana buat laporan?', 'Apa itu Biyo AI?'];

  return (
    <>
      {/* Toggle Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple to-primary flex items-center justify-center text-primary-foreground"
            style={{ boxShadow: '0 0 24px hsla(270, 80%, 65%, 0.5), 0 4px 20px rgba(0,0,0,0.4)' }}
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] flex flex-col rounded-2xl border border-border overflow-hidden"
            style={{
              height: '520px',
              background: 'hsla(222, 22%, 11%, 0.95)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 40px hsla(270, 80%, 65%, 0.2), 0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-gradient-to-r from-neon-purple/10 to-primary/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple to-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Slay Bot 💅</p>
                <p className="text-xs text-muted-foreground">Tutorial Assistant</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'bot' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-purple/30 to-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-neon-purple" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-primary/20 text-foreground rounded-br-md'
                          : 'bg-secondary/70 text-foreground rounded-bl-md border border-border/50'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2 items-center"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-purple/30 to-primary/30 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-neon-purple" />
                    </div>
                    <div className="bg-secondary/70 border border-border/50 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5">
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-2 h-2 rounded-full bg-neon-purple" />
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-primary" />
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-neon-purple" />
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Suggestion chips - show only when few messages */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-neon-purple/30 bg-neon-purple/5 text-neon-purple hover:bg-neon-purple/15 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanya soal fitur..."
                  className="flex-1 bg-secondary/70 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-neon-purple/50 focus:border-neon-purple/50 transition-all"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  size="icon"
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-primary text-primary-foreground hover:opacity-90 disabled:opacity-30"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2 opacity-60">
                Slay Bot hanya membantu tutorial fitur · Bukan AI umum
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
