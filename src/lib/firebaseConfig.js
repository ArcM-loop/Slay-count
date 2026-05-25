/**
 * FIREBASE CONFIG - BRIDGE MODULE
 * =================================
 * Single source of truth untuk Firebase ada di GoogleGenerativeAI.js
 * File ini hanya me-re-export agar import lama (dari lib/firebaseConfig) tetap bekerja.
 *
 * [BUGFIX] Menggunakan getApps() guard agar tidak ada duplikasi initializeApp.
 * [AUTH FIX] Menggunakan signInWithPopup (Cara The Herta)
 *   - Memanfaatkan header backend COOP: same-origin-allow-popups
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config — client config ini memang harus ada di browser (bukan secret)
// "accountomation" adalah nama Firebase Project yang benar untuk SlayCount
const firebaseConfig = {
  apiKey: "AIzaSyBjVZRY_nwKlPghsDkCdfgHuL1B37jnh1g", 
  authDomain: "slaycount-825422475013.firebaseapp.com",
  projectId: "slaycount-825422475013",
  storageBucket: "slaycount-825422475013.appspot.com",
  messagingSenderId: "825422475013",
  appId: "1:825422475013:web:8cf09b6a53aac97838516c",
  measurementId: "G-6GR6FE8W90",
};

// ✅ Guard: Hanya inisialisasi jika belum ada Firebase app yang berjalan
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Tambahkan scope tambahan untuk mendapatkan info user yang lengkap
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Paksa re-select account agar tidak auto-login ke akun yang salah
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Login dengan Google — Menggunakan Popup (Cara The Herta)
 * Memanfaatkan header backend Cross-Origin-Opener-Policy: same-origin-allow-popups
 * untuk menghubungkan popup login Google dengan aman.
 */
export const loginWithGoogle = async () => {
  // Pastikan sesi tersimpan di localStorage (bukan session) agar persist
  await setPersistence(auth, browserLocalPersistence);

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { authenticated: true, user: result.user };
  } catch (error) {
    console.error('[Auth] Error login popup:', error);
    return { authenticated: false, user: null, error: error.message };
  }
};

export const checkAuthStatus = () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve({ authenticated: !!user, user });
    });
  });
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Logout error", e);
  }
};
