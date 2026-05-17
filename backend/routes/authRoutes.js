const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { z } = require('zod');
const jwt = require('jsonwebtoken');

if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (e) {
    console.error('Firebase Admin init failed:', e.message);
  }
}

const loginSchema = z.object({
  idToken: z.string().min(10).trim(),
});

// Endpoint untuk login dan menyimpan token di HttpOnly Cookie
router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

    const { idToken } = parsed.data;
    if (!admin.apps.length) return res.status(500).json({ error: 'Firebase Admin not configured' });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    const sessionToken = jwt.sign({ uid, email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Security Patch #1: Simpan di HttpOnly Cookie
    res.cookie('slaycount_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000 // 1 jam
    });

    res.json({ message: 'Login sukses', user: { uid, email } });
  } catch (error) {
    res.status(401).json({ error: 'Autentikasi gagal' });
  }
});

// Security Patch: Endpoint untuk verifikasi status login (karena JS tidak bisa baca cookie)
router.get('/verify', (req, res) => {
  const token = req.cookies.slaycount_token;
  if (!token) return res.status(401).json({ authenticated: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, user: decoded });
  } catch (e) {
    res.status(401).json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('slaycount_token');
  res.json({ message: 'Logged out' });
});

module.exports = router;
