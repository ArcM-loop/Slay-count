import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { Loader2 } from 'lucide-react';

// Lazy load pages for better performance
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const TransactionsPage = lazy(() => import('./pages/Transaksi'));
const AccountsPage = lazy(() => import('./pages/Akun'));
const ReportsPage = lazy(() => import('./pages/Laporan'));
const ValidationPage = lazy(() => import('./pages/Validasi'));
const TaxCenterPage = lazy(() => import('./pages/TaxCenter/TaxDashboard'));
const PurchaseOrderPage = lazy(() => import('./pages/PurchaseOrder'));
const AIAccuracyDashboard = lazy(() => import('./pages/AIAccuracyDashboard'));
const SettingsPage = lazy(() => import('./pages/Pengaturan'));
const LoginPage = lazy(() => import('./pages/Login/LoginPage'));

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
    <p className="text-xs font-medium text-muted-foreground animate-pulse">Memuat halaman...</p>
  </div>
);

// PrivateRoute component untuk memproteksi rute internal
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('slaycount_session_token');
  const location = useLocation();
  
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Standard User Protected Routes */}
        <Route element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/validation" element={<ValidationPage />} />
          <Route path="/tax-center" element={<TaxCenterPage />} />
          <Route path="/purchase-order" element={<PurchaseOrderPage />} />
          <Route path="/ai-dashboard" element={<AIAccuracyDashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
