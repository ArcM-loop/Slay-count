import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true); // Baru: untuk memantau boot awal Firebase
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState(null); // 'admin', 'developer', 'user'
  const [actualRole, setActualRole] = useState(null);

  useEffect(() => {
    console.log('[AuthContext] Memulai pengawasan status autentikasi...');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Set loading true saat proses sedang berjalan
      setIsLoadingAuth(true);
      console.log('[AuthContext] onAuthStateChanged terpicu:', firebaseUser ? `User terdeteksi (${firebaseUser.email})` : 'Tidak ada user', `Initializing=${isInitializing}`);

      if (firebaseUser) {
        // Optimisasi: Jangan fetch ulang jika user UID-nya masih sama (menghindari loop internal)
        if (user?.uid === firebaseUser.uid && role) {
          console.log('[AuthContext] User sama, melewati fetch role.');
          setIsLoadingAuth(false);
          setAuthChecked(true);
          return;
        }

        setUser(firebaseUser);
        setIsAuthenticated(true);
        console.log('[AuthContext] User UID:', firebaseUser.uid);
        
        try {
          console.log('[AuthContext] Mengambil role dari Firestore...');
          // [CVE-1 Fixed by Herta] — Role disimpan & ditarik dari Firestore, bukan localStorage
          const roleDocRef = doc(db, 'user_roles', firebaseUser.uid);

          // Gunakan timeout agar tidak stuck jika Firestore lambat/bermasalah
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firestore timeout')), 5000)
          );

          const roleDoc = await Promise.race([
            getDoc(roleDocRef),
            timeoutPromise
          ]);
          
          let userRole = 'user';
          let realRole = 'user';

          if (roleDoc.exists()) {
            const data = roleDoc.data();
            realRole = data.actualRole || data.role || 'user';
            console.log('[AuthContext] Role ditemukan:', realRole);
            
            // Periksa apakah ada simulasi role yang valid (hanya untuk admin/dev)
            if ((realRole === 'admin' || realRole === 'developer')) {
              userRole = localStorage.getItem('slaycount_simulated_role') || realRole;
              console.log('[AuthContext] Role simulasi (jika ada):', userRole);
            } else {
              userRole = realRole;
              localStorage.removeItem('slaycount_simulated_role');
            }
          } else {
            console.log('[AuthContext] Role tidak ditemukan, melakukan auto-provisioning...');
            // Auto-provisioning: Daftarkan sebagai user biasa di Firestore
            await setDoc(roleDocRef, {
              role: 'user',
              actualRole: 'user',
              email: firebaseUser.email,
              updatedAt: new Date().toISOString()
            });
          }

          setActualRole(realRole);
          setRole(userRole);
        } catch (error) {
          console.error('[AuthContext] Gagal memuat role dari Firestore:', error);
          // Fallback aman agar user tidak stuck jika Firestore bermasalah
          setRole('user');
          setActualRole('user');
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setRole(null);
        setActualRole(null);
        console.log('[AuthContext] Sesi dibersihkan.');
      }

      console.log('[AuthContext] Loading selesai, menandai authChecked = true');
      setIsLoadingAuth(false);
      setIsInitializing(false);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    isInitializing,
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
