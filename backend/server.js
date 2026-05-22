import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import journalRoutes from './routes/journalRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// Konfigurasi Trust Proxy (Penting untuk deployment di Render/Vercel)
app.set('trust proxy', 1);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve file statis frontend (React/Vite)
app.use(express.static(path.join(__dirname, 'dist')));

// [CVE-7 Fixed by Herta] — HTTP Security Headers
// Helmet secara otomatis memasang 11 header keamanan sekaligus
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// [CVE-2 Fixed] Restricted CORS — hanya izinkan frontend SlayCount
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '1mb' })); // Batasi ukuran body request
app.use(cookieParser());

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan, silakan coba lagi nanti.' }
});
app.use(globalLimiter);

// Stricter limiter untuk /auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Terlalu banyak percobaan autentikasi.' }
});

app.use('/auth', authLimiter, authRoutes);
app.use('/api/ai', aiRoutes); // [CVE-2] Semua panggilan AI lewat proxy aman ini
app.use('/api/journal', journalRoutes);
app.use('/api/audit', auditRoutes);

// [CVE-8] Global Error Handler — cegah stack trace bocor ke client
app.use((err, req, res, next) => {
  console.error('[Server Error]', err); // Log hanya di server, bukan ke client
  res.status(err.status || 500).json({
    error: 'Terjadi kesalahan internal. Silakan coba lagi.'
  });
});

app.get('/api', (req, res) => {
  res.send('SlayCount API — Secured by Madam Herta 🛡️ | Firebase Admin SDK: ACTIVE');
});

// Catch-all route untuk React (harus diletakkan di bagian paling bawah setelah semua route API)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🛡️  Security headers: Helmet ACTIVE`);
  console.log(`🔐  CORS origin: ${process.env.ALLOWED_ORIGIN || 'http://localhost:5173'}`);
});
