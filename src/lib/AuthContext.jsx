import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState(null); // 'admin', 'developer', 'user'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsAuthenticated(true);
        
        // In a real app, you'd fetch the role from your backend or custom claims
        // For this demo/task, we'll simulate fetching the role
        // Let's assume some users are admins/developers for testing
        const simulatedRole = localStorage.getItem('slaycount_simulated_role') || 'user';
        setRole(simulatedRole);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setRole(null);
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
    setSimulatedRole: (newRole) => {
      setRole(newRole);
      localStorage.setItem('slaycount_simulated_role', newRole);
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
