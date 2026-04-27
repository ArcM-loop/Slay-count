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

// Developer Dashboard Imports
import DevAuthGuard from './components/developer/DevAuthGuard';
import DeveloperLayout from './components/developer/DeveloperLayout';
import DevOverviewPage from './pages/Developer/Overview/OverviewPage';
import DevUsersPage from './pages/Developer/Users/UsersPage';
import DevMonitoringPage from './pages/Developer/Monitoring/MonitoringPage';
import DevAnalyticsPage from './pages/Developer/Analytics/AnalyticsPage';
import DevDomainsPage from './pages/Developer/Domains/DomainsPage';
import DevIntegrationsPage from './pages/Developer/Integrations/IntegrationsPage';
import DevSecurityPage from './pages/Developer/Security/SecurityPage';
import DevAIPage from './pages/Developer/AI/AIPage';
import DevLogsPage from './pages/Developer/Logs/LogsPage';
import DevAPIUsagePage from './pages/Developer/APIUsage/APIUsagePage';
import DevSettingsPage from './pages/Developer/Settings/SettingsPage';

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

      {/* Developer Dashboard Routes — Protected by Role */}
      <Route 
        path="/developer" 
        element={
          <DevAuthGuard>
            <DeveloperLayout />
          </DevAuthGuard>
        }
      >
        <Route index element={<Navigate to="/developer/overview" replace />} />
        <Route path="overview" element={<DevOverviewPage />} />
        <Route path="users" element={<DevUsersPage />} />
        <Route path="monitoring" element={<DevMonitoringPage />} />
        <Route path="analytics" element={<DevAnalyticsPage />} />
        <Route path="domains" element={<DevDomainsPage />} />
        <Route path="integrations" element={<DevIntegrationsPage />} />
        <Route path="security" element={<DevSecurityPage />} />
        <Route path="ai" element={<DevAIPage />} />
        <Route path="logs" element={<DevLogsPage />} />
        <Route path="api-usage" element={<DevAPIUsagePage />} />
        <Route path="settings" element={<DevSettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
