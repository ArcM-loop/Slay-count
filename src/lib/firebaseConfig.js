/**
 * FIREBASE CONFIG - BRIDGE MODULE
 * =================================
 * Single source of truth untuk Firebase ada di GoogleGenerativeAI.js
 * File ini hanya me-re-export agar import lama (dari lib/firebaseConfig) tetap bekerja.
 *
 * [BUGFIX] Menggunakan getApps() guard agar tidak ada duplikasi initializeApp.
 * [AUTH FIX] Sistem login cerdas: popup-first → redirect fallback
 *   - Bekerja dari Firebase Hosting (accountomation.firebaseapp.com)
 *   - Bekerja dari Cloud Run (*.run.app atau domain kustom)
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config — client config ini memang harus ada di browser (bukan secret)
// "accountomation" adalah nama Firebase Project yang benar untuk SlayCount
const firebaseConfig = {
  apiKey: "AIzaSyBjVZRY_nwKlPghsDkCdfgHuL1B37jnh1g",
  authDomain: "accountomation.firebaseapp.com",
  projectId: "accountomation",
  storageBucket: "accountomation.firebasestorage.app",
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
 * Login dengan Google — Strategi Cerdas:
 * 1. Coba popup dulu (lebih cepat, tidak reload halaman)
 * 2. Jika popup diblokir browser → fallback ke redirect
 * 3. Jika domain tidak diizinkan → beri pesan error jelas
 *
 * Kompatibel dari: Firebase Hosting, Cloud Run, localhost
 */
export const loginWithGoogle = async () => {
  // Pastikan sesi tersimpan di localStorage (bukan session) agar persist
  await setPersistence(auth, browserLocalPersistence);

  try {
    // === STRATEGI 1: Popup (ideal untuk semua platform) ===
    const result = await signInWithPopup(auth, googleProvider);
    return { authenticated: true, user: result.user };
  } catch (popupError) {
    const code = popupError.code;

    // Jika popup diblokir browser → fallback ke redirect
    if (code === 'auth/popup-blocked') {
      console.warn('[Auth] Popup diblokir, beralih ke redirect...');
      try {
        await signInWithRedirect(auth, googleProvider);
        // Halaman akan redirect, hasil ditangani oleh handleRedirectResult()
        return { authenticated: false, user: null, redirecting: true };
      } catch (redirectError) {
        return { authenticated: false, user: null, error: redirectError.message };
      }
    }

    // Jika user menutup popup sendiri
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      console.warn('[Auth] Login dibatalkan oleh pengguna.');
      return { authenticated: false, user: null, error: 'Login dibatalkan. Silakan coba lagi.' };
    }

    // Jika domain Cloud Run belum ditambahkan ke Firebase authorized domains
    if (code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      console.error(`[Auth] Domain tidak diizinkan: ${currentDomain}`);
      return {
        authenticated: false,
        user: null,
        error: `Domain "${currentDomain}" belum didaftarkan di Firebase Console. Tambahkan di: Authentication → Settings → Authorized domains.`,
      };
    }

    // Error lainnya
    console.error('[Auth] Error login:', popupError);
    return { authenticated: false, user: null, error: popupError.message };
  }
};

/**
 * Tangani hasil redirect jika popup sebelumnya diblokir browser
 * Dipanggil saat halaman pertama kali dimuat
 */
export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      return { authenticated: true, user: result.user };
    }
    return null;
  } catch (error) {
    if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      console.error(`[Auth] Domain tidak diizinkan setelah redirect: ${currentDomain}`);
    }
    console.error('[Auth] Redirect result error:', error);
    return null;
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
