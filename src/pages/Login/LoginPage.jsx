import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from '@/API/GoogleGenerativeAI';
import { useAuth } from '@/lib/AuthContext';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  
  // State untuk Email & Password Fallback
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // ✅ Handle hasil redirect jika popup sebelumnya diblokir browser
  useEffect(() => {
    const checkRedirect = async () => {
      setStatusMsg('Memeriksa sesi login...');
      try {
        const { data, error: redirectError } = await GoogleGenerativeAI.auth.handleRedirectResult();
        if (data) {
          setStatusMsg('Login berhasil! Mengalihkan...');
        } else if (redirectError) {
          setError(redirectError.message || 'Terjadi kesalahan saat login.');
        }
      } catch (err) {
        // Tidak ada pending redirect, ini normal
      } finally {
        setStatusMsg(null);
      }
    };
    checkRedirect();
  }, []);

  // ✅ Navigasi otomatis saat Firebase konfirmasi login berhasil
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleGoogleLogin = async () => {
    if (loading) return; 
    
    setLoading(true);
    setError(null);
    setStatusMsg('Membuka jendela login Google...');

    try {
      const { data, error: loginError, redirecting } = await GoogleGenerativeAI.auth.loginWithGoogle();

      if (redirecting) {
        setStatusMsg('Mengalihkan ke Google...');
        return; 
      }

      if (loginError) {
        setError(loginError.message || 'Terjadi kesalahan saat login.');
        setLoading(false);
        setStatusMsg(null);
        return;
      }

      if (data) {
        setStatusMsg('Login berhasil! Mengalihkan...');
      } else {
        setLoading(false);
        setStatusMsg(null);
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
      setLoading(false);
      setStatusMsg(null);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    if (!email || !password) {
      setError('Email dan password harus diisi.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMsg('Mencoba masuk...');

    try {
      await GoogleGenerativeAI.auth.login(email, password);
      setStatusMsg('Login berhasil! Mengalihkan...');
      // onAuthStateChanged akan menangani navigasi setelah ini
    } catch (err) {
      console.error("Email login error:", err);
      // Format error Firebase agar lebih ramah
      let errorMsg = 'Terjadi kesalahan saat login.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = 'Email atau kata sandi salah.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Format email tidak valid.';
      } else {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setLoading(false);
      setStatusMsg(null);
    }
  };

  // Tampilkan loading spinner saat auth sedang dicek
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Memeriksa sesi login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-800 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Slay<span className="text-indigo-500">Count</span>
          </h1>
          <p className="text-gray-400">Masuk untuk mengelola keuangan Anda secara profesional</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {statusMsg && !error && (
          <div className="bg-indigo-500/10 border border-indigo-500 text-indigo-400 p-3 rounded-lg mb-6 text-sm text-center flex items-center justify-center gap-2">
            <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            {statusMsg}
          </div>
        )}

        {/* Form Login Email & Password (Bypass Cloud Run Proxy issues) */}
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-4 mb-6">
          <div>
            <label className="block text-gray-400 text-sm mb-1" htmlFor="email">Email Juri / Pengguna</label>
            <input 
              id="email"
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juri@slaycount.com"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1" htmlFor="password">Kata Sandi</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 outline-none focus:border-indigo-500 transition-colors"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:text-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 mt-2"
          >
            {loading && email ? 'Memproses...' : 'Masuk dengan Email'}
          </button>
        </form>

        <div className="relative flex items-center py-2 mb-6">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">Atau lanjutkan dengan</span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        <button
          type="button"
          id="btn-login-google"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
        >
          {loading && !email ? (
            <span className="text-gray-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Memproses...
            </span>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </>
          )}
        </button>

        <p className="text-gray-600 text-xs text-center mt-6">
          Gunakan Email untuk akses yang dijamin lancar (Bypass sistem proxy Google Cloud)
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
