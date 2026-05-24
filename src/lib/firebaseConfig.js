/**
 * FIREBASE CONFIG - BRIDGE MODULE
 * =================================
 * Single source of truth untuk Firebase ada di GoogleGenerativeAI.js
 * File ini hanya me-re-export agar import lama (dari lib/firebaseConfig) tetap bekerja.
 * 
 * [BUGFIX] Menggunakan getApps() guard agar tidak ada duplikasi initializeApp.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config — client config ini memang harus ada di browser (bukan secret)
const firebaseConfig = {
  apiKey: "AIzaSyBjVZRY_nwKlPghsDkCdfgHuL1B37jnh1g",
  authDomain: "accountomation.firebaseapp.com",
  projectId: "accountomation",
  storageBucket: "accountomation.firebasestorage.app",
  messagingSenderId: "825422475013",
  appId: "1:825422475013:web:8cf09b6a53aac97838516c",
  measurementId: "G-6GR6FE8W90"
};

// ✅ Guard: Hanya inisialisasi jika belum ada Firebase app yang berjalan
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { authenticated: true, user: result.user };
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.warn('Login dibatalkan oleh pengguna.');
      return { authenticated: false, user: null, error: 'Login dibatalkan oleh pengguna.' };
    }
    console.error("Login failed:", error);
    throw error;
  }
};

// Handle redirect result on page load
export const handleRedirectResult = async () => {
  return null;
};

export const checkAuthStatus = () => {
  return new Promise((resolve) => {
    // Listen for the auth state just once to resolve the initial check
    const unsubscribe = auth.onAuthStateChanged(user => {
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
