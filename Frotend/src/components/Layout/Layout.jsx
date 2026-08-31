import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

export default function Layout({ role, onToggleRole, darkMode, onToggleDark }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const [counties, setCounties] = useState([]);
  const [countiesLoading, setCountiesLoading] = useState(true);
  const [selectedCounty, setSelectedCounty] = useState(user?.assigned_county || '');

  useEffect(() => {
    api.getOptions()
      .then(options => {
        const rawCounties = options.counties || [];
        const normalized = rawCounties.map(c => {
          if (typeof c === 'object' && c.code) {
            return { code: c.code, name: c.name || c.code };
          }
          return { code: c, name: c };
        });
        setCounties(normalized);
        if (!selectedCounty && normalized.length > 0) {
          setSelectedCounty(normalized[0].code);
        }
      })
      .catch(err => {
        console.error('Failed to load counties:', err);
      })
      .finally(() => {
        setCountiesLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleOverlayClick = useCallback((e) => {
    if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
      setSidebarOpen(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleOverlayClick}
      >
        <div className="absolute inset-0 bg-transparent" />
        <div
          ref={sidebarRef}
          className={`relative flex flex-col w-64 bg-white h-full shadow-2xl transform transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-lg font-semibold text-slate-900">AMR‑Nexus</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <Sidebar role={role} mobile onNavigate={() => setSidebarOpen(false)} />
        </div>
      </div>

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:items-center lg:justify-center lg:pointer-events-none">
        <div className="lg:relative lg:w-64 lg:mx-6 lg:my-8 lg:pointer-events-auto">
          <div className="flex flex-col bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="pt-6 pb-2 px-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-lg font-semibold text-slate-900">AMR‑Nexus</span>
              </div>
            </div>
            <Sidebar role={role} />
            <div className="p-4 text-xs text-center text-slate-400 border-t border-slate-200">
              v1.0 • Secure
            </div>
          </div>
        </div>
      </div>

      <div className="lg:pl-72 flex flex-col flex-1">
        <Header
          role={role}
          onToggleRole={onToggleRole}
          darkMode={darkMode}
          onToggleDark={onToggleDark}
          onMenuClick={() => setSidebarOpen(true)}
          counties={counties}
          countiesLoading={countiesLoading}
          selectedCounty={selectedCounty}
          onCountyChange={setSelectedCounty}
        />
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ selectedCounty, role, counties }} />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}