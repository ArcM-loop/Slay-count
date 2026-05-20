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
          const roleDoc = await getDoc(roleDocRef);
          
          let userRole = 'user';
          let realRole = 'user';

          if (roleDoc.exists()) {
            const data = roleDoc.data();
            realRole = data.actualRole || data.role || 'user';
            
            // Periksa apakah ada simulasi role yang valid (hanya untuk admin/dev)
            if ((realRole === 'admin' || realRole === 'developer')) {
              userRole = localStorage.getItem('slaycount_simulated_role') || realRole;
            } else {
              userRole = realRole;
              localStorage.removeItem('slaycount_simulated_role');
            }
          } else {
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
