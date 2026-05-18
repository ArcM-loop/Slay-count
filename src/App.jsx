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
const SiklusPage = lazy(() => import('./pages/SiklusAkuntansi'));
const TaxCenterPage = lazy(() => import('./pages/TaxCenter/TaxDashboard'));
const PurchaseOrderPage = lazy(() => import('./pages/PurchaseOrder'));
const AIAccuracyDashboard = lazy(() => import('./pages/AIAccuracyDashboard'));
const BankReconciliationPage = lazy(() => import('./pages/BankReconciliation'));
const SettingsPage = lazy(() => import('./pages/Pengaturan'));
const ManualJournalPage = lazy(() => import('./pages/ManualJournal'));
const FinancialHealthPage = lazy(() => import('./pages/FinancialHealth'));
import LoginPage from './pages/Login/LoginPage';
import { useState, useEffect } from 'react';
import { useAuth } from './lib/AuthContext';

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
    <p className="text-xs font-medium text-muted-foreground animate-pulse">Memuat halaman...</p>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium animate-pulse">Memverifikasi Sesi Aman...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Jika tidak terautentikasi di server, redirect ke login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Standard User Protected Routes */}
      <Route 
        path="/" 
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        } />
        
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        
        <Route path="transaksi" element={
          <Suspense fallback={<PageLoader />}>
            <TransactionsPage />
          </Suspense>
        } />
        
        <Route path="akun" element={
          <Suspense fallback={<PageLoader />}>
            <AccountsPage />
          </Suspense>
        } />
        
        <Route path="laporan" element={
          <Suspense fallback={<PageLoader />}>
            <ReportsPage />
          </Suspense>
        } />
        
        <Route path="validasi" element={
          <Suspense fallback={<PageLoader />}>
            <ValidationPage />
          </Suspense>
        } />
        
        <Route path="siklus" element={
          <Suspense fallback={<PageLoader />}>
            <SiklusPage />
          </Suspense>
        } />
        
        <Route path="purchase-order" element={
          <Suspense fallback={<PageLoader />}>
            <PurchaseOrderPage />
          </Suspense>
        } />
        
        <Route path="tax" element={
          <Suspense fallback={<PageLoader />}>
            <TaxCenterPage />
          </Suspense>
        } />
        
        <Route path="ai-dashboard" element={
          <Suspense fallback={<PageLoader />}>
            <AIAccuracyDashboard />
          </Suspense>
        } />
        
        <Route path="pengaturan" element={
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        } />
        
        <Route path="manual-journal" element={
          <Suspense fallback={<PageLoader />}>
            <ManualJournalPage />
          </Suspense>
        } />

        <Route path="health" element={
          <Suspense fallback={<PageLoader />}>
            <FinancialHealthPage />
          </Suspense>
        } />
      </Route>

      {/* Fallback untuk rute tidak dikenal */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
