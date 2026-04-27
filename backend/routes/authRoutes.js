const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { z } = require('zod');
const jwt = require('jsonwebtoken');

// Inisialisasi Firebase Admin jika environment valid
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle newline characters properly
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (e) {
    console.error('Firebase Admin init failed. Please check your credentials.', e.message);
  }
}

// (4) Input Sanitization menggunakan Zod
const loginSchema = z.object({
  idToken: z.string().min(10, "Token tidak valid").trim(),
});

// Endpoint untuk verifikasi token dari client dan generate session JWT
router.post('/login', async (req, res) => {
  try {
    // Sanitasi dan validasi input
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.format() });
    }

    const { idToken } = parsed.data;

    // Untuk environment test/development di mana Firebase tidak di set-up:
    if (!admin.apps.length) {
      return res.status(500).json({ error: 'Firebase Admin belum dikonfigurasi di server.' });
    }

    // Verifikasi token dari Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // (5) JWT Management dengan masa berlaku aman
    // Generate JWT server kita sendiri untuk session management
    const sessionToken = jwt.sign(
      { uid, email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' } // Masa berlaku 1 jam yang aman
    );

    res.json({
      message: 'Login berhasil',
      token: sessionToken,
      user: { uid, email }
    });

  } catch (error) {
    console.error('Error during authentication:', error);
    res.status(401).json({ error: 'Autentikasi gagal atau token tidak valid' });
  }
});

module.exports = router;
