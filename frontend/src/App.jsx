import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTheme } from './design-system';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ForcePasswordChange from './components/auth/ForcePasswordChange';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import NationalDashboard from './pages/NationalDashboard';
import CountyDashboard from './pages/CountyDashboard';
import Predict from './pages/Predict';
import Analytics from './pages/Analytics';
import History from './pages/History';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Compare from './pages/Compare';
import PathogenExplorer from './pages/PathogenExplorer';
import BulkImport from './pages/BulkImport';
import CompareAnalytics from './pages/CompareAnalytics';
import DataQuality from './pages/DataQuality';
import ModelCard from './pages/ModelCard';
import Privacy from './pages/Privacy';
import AuditLog from './pages/AuditLog';

const wrap = (el) => <ErrorBoundary>{el}</ErrorBoundary>;

function AppRoutes() {
  const { user, mustChangePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [role, setRole] = useState('national');

  useEffect(() => {
    if (user?.role) setRole(user.role);
  }, [user]);

  const toggleRole = () =>
    setRole((prev) => (prev === 'national' ? 'county' : 'national'));

  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout
              role={role}
              onToggleRole={toggleRole}
              darkMode={theme === 'dark'}
              onToggleDark={toggleTheme}
            />
          </ProtectedRoute>
        }
      >
        <Route index element={wrap(role === 'national' ? <NationalDashboard /> : <CountyDashboard />)} />
        <Route path="dashboard" element={wrap(role === 'national' ? <NationalDashboard /> : <CountyDashboard />)} />
        <Route path="predict" element={wrap(<Predict />)} />
        <Route path="analytics" element={wrap(<Analytics />)} />
        <Route path="history" element={wrap(<History />)} />
        <Route path="alerts" element={wrap(<Alerts />)} />
        <Route path="reports" element={wrap(<Reports />)} />
        <Route path="settings" element={wrap(<Settings />)} />
        <Route path="compare" element={wrap(<Compare />)} />
        <Route path="pathogen-explorer" element={wrap(<PathogenExplorer />)} />
        <Route path="bulk-import" element={wrap(<BulkImport />)} />
        <Route path="compare-analytics" element={wrap(<CompareAnalytics />)} />
        <Route path="data-quality" element={wrap(<DataQuality />)} />
        <Route path="model-card" element={wrap(<ModelCard />)} />
        <Route path="privacy" element={wrap(<Privacy />)} />
        <Route path="admin/audit" element={wrap(<AuditLog />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
