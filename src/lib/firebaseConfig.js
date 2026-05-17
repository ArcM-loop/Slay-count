import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBjVZRY_nwKlPghsDkCdfgHuL1B37jnh1g",
  authDomain: "accountomation.firebaseapp.com",
  projectId: "accountomation",
  storageBucket: "accountomation.firebasestorage.app",
  messagingSenderId: "825422475013",
  appId: "1:825422475013:web:8cf09b6a53aac97838516c",
  measurementId: "G-6GR6FE8W90"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    
    // Security Patch #1 & #2: Gunakan credentials: 'include'
    const response = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'include' // WAJIB untuk mengirim/menerima cookie
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
