import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
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

function AppRoutes() {
  const { user } = useAuth();
  const [role, setRole] = useState(user?.role || 'national');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (user?.role) setRole(user.role);
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleRole = () =>
    setRole(prev => (prev === 'national' ? 'county' : 'national'));

  return (
    <Routes>
      <Route
        element={
          <Layout
            role={role}
            onToggleRole={toggleRole}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode(prev => !prev)}
          />
        }
      >
        <Route index element={role === 'national' ? <NationalDashboard /> : <CountyDashboard />} />
        <Route path="dashboard" element={role === 'national' ? <NationalDashboard /> : <CountyDashboard />} />

        {/* Shared pages */}
        <Route path="predict" element={<Predict />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="history" element={<History />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="compare" element={<Compare />} />
        <Route path="pathogen-explorer" element={<PathogenExplorer />} />
        <Route path="bulk-import" element={<BulkImport />} />
        <Route path="compare-analytics" element={<CompareAnalytics />} />
        <Route path="data-quality" element={<DataQuality />} />
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