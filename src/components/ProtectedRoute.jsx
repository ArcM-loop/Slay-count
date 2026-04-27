import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * Komponen pembungkus untuk halaman yang butuh login.
 * Mengalihkan ke /login jika user belum terautentikasi.
 */

const DefaultFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
    <p className="text-muted-foreground font-medium animate-pulse">Memeriksa autentikasi...</p>
  </div>
);

export default function ProtectedRoute({ children, fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();
  const location = useLocation();

  // Jika sedang loading awal atau auth belum dicek
  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  // Jika tidak terautentikasi
  if (!isAuthenticated) {
    // Jika ada elemen khusus untuk unauthenticated (misal promo/landing)
    if (unauthenticatedElement) return unauthenticatedElement;

    // Redirect ke login, simpan lokasi asal untuk redirect balik setelah login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Jika terautentikasi, tampilkan konten halaman
  return children;
}
