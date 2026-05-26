import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const AuthContext = createContext();

// Helper untuk mencegah loading menggantung jika Firestore diblokir adblocker/jaringan lambat
const promiseWithTimeout = (promise, ms, defaultValue = null) => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn(`[Auth] Pembacaan Firestore melampaui batas waktu ${ms}ms. Menggunakan fallback.`);
      resolve(defaultValue);
    }, ms);
    
    promise.then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        console.error("[Auth] Firestore error:", err);
        resolve(defaultValue);
      }
    );
  });
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState(null); // 'admin', 'developer', 'user'
  const [actualRole, setActualRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsAuthenticated(true);
        
        try {
          // [CVE-1 Fixed by Herta] — Role disimpan & ditarik dari Firestore, bukan localStorage
          const roleDocRef = doc(db, 'user_roles', firebaseUser.uid);
          
          // Batasi waktu tunggu maksimal 3.5 detik agar halaman tidak stuck jika diblokir AdBlocker/koneksi buruk
          const roleDoc = await promiseWithTimeout(getDoc(roleDocRef), 3500, null);
          
          let userRole = 'user';
          let realRole = 'user';

          if (roleDoc && roleDoc.exists()) {
            const data = roleDoc.data();
            realRole = data.actualRole || data.role || 'user';
            
            // Periksa apakah ada simulasi role yang valid (hanya untuk admin/dev)
            if ((realRole === 'admin' || realRole === 'developer')) {
              userRole = localStorage.getItem('slaycount_simulated_role') || realRole;
            } else {
              userRole = realRole;
              localStorage.removeItem('slaycount_simulated_role');
            }
          } else if (roleDoc) {
            // Auto-provisioning: Daftarkan sebagai user biasa di Firestore jika doc kosong
            await promiseWithTimeout(
              setDoc(roleDocRef, {
                role: 'user',
                actualRole: 'user',
                email: firebaseUser.email,
                updatedAt: new Date().toISOString()
              }),
              3000,
              null
            );
          }

          setActualRole(realRole);
          setRole(userRole);
        } catch (error) {
          console.error('[AuthContext] Gagal memuat role dari Firestore:', error);
          setRole('user');
          setActualRole('user');
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setRole(null);
        setActualRole(null);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    authChecked,
    role,
    actualRole,
    setSimulatedRole: async (newRole) => {
      // Hanya izinkan simulasi jika role asli adalah admin atau developer
      if (actualRole === 'admin' || actualRole === 'developer') {
        setRole(newRole);
        localStorage.setItem('slaycount_simulated_role', newRole);
      } else {
        console.warn('[Security Alert] Percobaan manipulasi role diblokir.');
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
