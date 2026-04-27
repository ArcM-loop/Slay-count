/**
 * SlayCount — App Router
 * All routes managed here
 */
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/Dashboard';
import TransactionsPage from './pages/Transaksi';
import AccountsPage from './pages/Akun';
import ReportsPage from './pages/Laporan';
import ValidationPage from './pages/Validasi';
import TaxCenterPage from './pages/TaxCenter/TaxDashboard';
import PurchaseOrderPage from './pages/PurchaseOrder';
import AIAccuracyDashboard from './pages/AIAccuracyDashboard';
import SettingsPage from './pages/Pengaturan';
import LoginPage from './pages/Login/LoginPage';



// PrivateRoute component untuk memproteksi rute internal
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('slaycount_session_token');
  const location = useLocation();
  
  if (!token) {
    // Jika tidak ada token JWT, redirect ke login
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
      <Route element={
        <PrivateRoute>
          <AppLayout />
        </PrivateRoute>
      }>
        <Route path="/" element={<DashboardPage />} />
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
  );
}

export default App;
