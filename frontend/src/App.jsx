import { useState } from 'react';
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
import AdminUsers from './pages/AdminUsers';
import AmuDashboard from './pages/AmuDashboard';
import SamplingSites from './pages/SamplingSites';
import Actions from './pages/Actions';
import RoleRouting from './pages/RoleRouting';
import Landing from './pages/Landing';
import ActivityLog from './pages/ActivityLog';
import OneHealth from './pages/OneHealth';
import EwsForecast from './pages/EwsForecast';
import Guidance from './pages/Guidance';
import Hotspots from './pages/Hotspots';
import RootCauses from './pages/RootCauses';
import ModellingApproach from './pages/ModellingApproach';

const wrap = (el) => <ErrorBoundary>{el}</ErrorBoundary>;

function AppRoutes() {
  const { user, mustChangePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // Local override for the national/county toggle. If null, we fall back to
  // the signed-in user's role. Avoids a setState-in-effect sync.
  const [roleOverride, setRoleOverride] = useState(null);
  const role = roleOverride ?? user?.role ?? 'national';

  const toggleRole = () =>
    setRoleOverride(role === 'national' ? 'county' : 'national');

  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return (
    <Routes>
      <Route path="/welcome" element={<Landing />} />
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
            <Route path="activity" element={wrap(<ActivityLog />)} />
        <Route path="compare" element={wrap(<Compare />)} />
        <Route path="pathogen-explorer" element={wrap(<PathogenExplorer />)} />
            <Route path="one-health" element={wrap(<OneHealth />)} />
            <Route path="ews-forecast" element={wrap(<EwsForecast />)} />
            <Route path="guidance" element={wrap(<Guidance />)} />
            <Route path="hotspots" element={wrap(<Hotspots />)} />
            <Route path="root-causes" element={wrap(<RootCauses />)} />
            <Route path="modelling" element={wrap(<ModellingApproach />)} />
        <Route path="bulk-import" element={wrap(<BulkImport />)} />
        <Route path="compare-analytics" element={wrap(<CompareAnalytics />)} />
        <Route path="data-quality" element={wrap(<DataQuality />)} />
        <Route path="model-card" element={wrap(<ModelCard />)} />
        <Route path="privacy" element={wrap(<Privacy />)} />
        <Route path="admin/audit" element={wrap(<AuditLog />)} />
            <Route path="admin/users" element={wrap(<AdminUsers />)} />
            <Route path="amu" element={wrap(<AmuDashboard />)} />
            <Route path="sampling-sites" element={wrap(<SamplingSites />)} />
            <Route path="actions" element={wrap(<Actions />)} />
            <Route path="role-routing" element={wrap(<RoleRouting />)} />
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
