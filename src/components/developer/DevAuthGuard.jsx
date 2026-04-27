import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * Guard component that only allows 'admin' or 'developer' roles.
 */
export default function DevAuthGuard({ children }) {
  const { role, isLoadingAuth, authChecked, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f1117]">
        <Loader2 className="w-12 h-12 animate-spin text-[#00f3ff] mb-4" />
        <p className="text-[#8b8fa3] font-medium animate-pulse text-lg">Verifying Developer Access...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'admin' && role !== 'developer') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f1117] p-6 text-center">
        <div className="glass-card p-10 max-w-md animate-fade-in">
          <ShieldAlert className="w-20 h-20 text-[#ef4444] mx-auto mb-6 glow-red" />
          <h1 className="text-2xl font-bold mb-4 neon-text">Access Restricted</h1>
          <p className="text-[#8b8fa3] mb-8 leading-relaxed">
            This area is reserved for SlayCount Developers and Administrators. 
            Your current role does not have the required permissions.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="btn btn-primary w-full py-4 text-lg"
          >
            Return to Safety
          </button>
        </div>
      </div>
    );
  }

  return children;
}
