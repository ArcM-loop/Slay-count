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
    const idToken = await result.user.getIdToken();

    const response = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'include'
    });

    if (!response.ok) throw new Error("Autentikasi gagal di server");
    return await response.json();
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const checkAuthStatus = async () => {
  try {
    const response = await fetch('http://localhost:5000/auth/verify', {
      method: 'GET',
      credentials: 'include'
    });
    if (!response.ok) return { authenticated: false };
    return await response.json();
  } catch (e) {
    return { authenticated: false };
  }
};

export const logout = async () => {
  try {
    await fetch('http://localhost:5000/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    await signOut(auth);
  } catch (e) {
    console.error("Logout error", e);
  }
};
