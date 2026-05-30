import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  const localKeyPath = path.join(__dirname, '../service-account.json');
  
  if (fs.existsSync(localKeyPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[FirebaseAdmin] ✅ Initialized using local service-account.json for project:', serviceAccount.project_id);
    } catch (e) {
      console.error('[FirebaseAdmin] Failed to initialize with local JSON key:', e.message);
    }
  } else if (process.env.FIREBASE_PROJECT_ID) {
    try {
      // Strip tanda kutip yang mungkin ikut terbawa dari file .env saat deploy via --set-env-vars
      // Contoh: FIREBASE_PRIVATE_KEY="-----BEGIN..." → ikut menyimpan karakter " di Cloud Run
      const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
      const privateKey = rawKey
        .replace(/^["']|["']$/g, '')   // Strip leading/trailing quotes
        .replace(/\\n/g, '\n');         // Konversi literal \n ke newline asli

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      });
      console.log('[FirebaseAdmin] ✅ Initialized using environment variables for project:', process.env.FIREBASE_PROJECT_ID);
    } catch (e) {
      console.error('[FirebaseAdmin] Init failed with env variables:', e.message);
    }
  } else {
    console.warn('[FirebaseAdmin] ⚠️ No local service-account.json or environment variables found. Admin SDK is inactive.');
  }
}

export default admin;

