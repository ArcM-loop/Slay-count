import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Konfigurasi Firebase (Harus diisi dengan kredensial SlayCount dari Firebase Console)
// Kredensial public ini aman terekspos di client-side, yang penting private key pindah ke server
const firebaseConfig = {
 apiKey: "AIzaSyBjVZRY_nwKlPghsDkCdfgHuL1B37jnh1g",
  authDomain: "accountomation.firebaseapp.com",
  projectId: "accountomation",
  storageBucket: "accountomation.firebasestorage.app",
  messagingSenderId: "825422475013",
  appId: "1:825422475013:web:8cf09b6a53aac97838516c",
  measurementId: "G-6GR6FE8W90"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Mendapatkan ID token Firebase
    const idToken = await result.user.getIdToken();
    
    // Mengirim token ke backend kita untuk di verifikasi dan ditukar dengan Session JWT
    const response = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken })
    });

    if (!response.ok) {
      throw new Error("Autentikasi gagal di server");
    }

    const data = await response.json();
    // Simpan JWT aman yang digenerate dari server (contoh ke localStorage, lebih aman di httpOnly cookie)
    localStorage.setItem("slaycount_session_token", data.token);
    
    return data;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
  localStorage.removeItem("slaycount_session_token");
};
