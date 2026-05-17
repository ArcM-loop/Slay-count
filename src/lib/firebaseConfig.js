/**
 * FIREBASE CONFIG - BRIDGE MODULE
 * =================================
 * Single source of truth untuk Firebase ada di GoogleGenerativeAI.js
 * File ini hanya me-re-export agar import lama tetap bekerja tanpa duplikasi.
 * 
 * [BUGFIX] Menghapus initializeApp() duplikat yang menyebabkan crash blank screen.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// ✅ Guard: Hanya inisialisasi jika belum ada app yang berjalan
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
