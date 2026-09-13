import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const TOKEN_KEY = 'amr-nexus-token';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {}
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      let msg = 'Login failed';
      try {
        const data = await res.json();
        msg = data.detail || msg;
      } catch {}
      throw new Error(msg);
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/me');
        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mustChangePassword = !!(user && (user.must_change_password || user.mustChangePassword));

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      mustChangePassword,
      login,
      logout,
      refreshUser,
      token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
    }),
    [user, loading, mustChangePassword, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export const AUTH_TOKEN_KEY = TOKEN_KEY;
