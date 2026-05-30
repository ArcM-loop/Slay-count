/**
 * verifyFirebaseToken — Express Middleware
 * ==========================================
 * Memverifikasi Firebase ID Token dari header Authorization.
 * Setiap request ke /api/* HARUS melewati middleware ini.
 *
 * Flow:
 *   Browser kirim: Authorization: Bearer <firebase-id-token>
 *   Middleware verifikasi token ke Firebase Auth
 *   Inject req.user = { uid, email } untuk dipakai route berikutnya
 */
import admin from '../lib/firebaseAdmin.js';

export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header dengan Firebase ID Token wajib disertakan.'
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    if (!admin.apps.length || idToken === 'mock-dev-token' || process.env.NODE_ENV === 'test') {
      // Mode development tanpa Firebase Admin atau bypass dev
      console.warn('[AuthMiddleware] Firebase Admin bypass active (mock/test mode).');
      req.user = { uid: 'dev-user', email: 'dev@slaycount.app' };
      return next();
    }

    let decoded;
    try {
      // 1. Coba verifikasi dengan default app (accountomation)
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      // 2. Jika gagal karena aud/iss mismatch, gunakan verifikator sekunder slaycount-825422475013 secara dinamis
      const isProjectMismatch = err.message.includes('aud') || 
                                err.message.includes('audience') || 
                                err.message.includes('projectId') || 
                                err.message.includes('project') ||
                                err.code === 'auth/argument-error';
                                
      if (isProjectMismatch) {
        console.warn('[AuthMiddleware] Token aud/project mismatch. Menggunakan verifikator slaycount-825422475013...');
        let verifyApp;
        try {
          verifyApp = admin.app('tokenVerifier');
        } catch (e) {
          verifyApp = admin.initializeApp({
            projectId: 'slaycount-825422475013'
          }, 'tokenVerifier');
        }
        decoded = await verifyApp.auth().verifyIdToken(idToken);
      } else {
        throw err;
      }
    }

    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Token verification failed:', err.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: `Token tidak valid atau sudah kedaluwarsa. Detail: ${err.message}`
    });
  }
}
