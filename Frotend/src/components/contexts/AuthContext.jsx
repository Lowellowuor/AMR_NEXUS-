
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserFromBackend(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserFromBackend = async (token) => {
    try {
      const response = await fetch('http://localhost:8000/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      setUser({
        role: data.role || '',
        county: data.assigned_county || '',
        name: data.name || '',
        email: data.email || '',
      });
    } catch (err) {
      console.error('Auth fetch error:', err);
      setError(err.message);
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error('Login failed');
      const data = await response.json();
      const { token, user: userData } = data;
      localStorage.setItem('token', token);
      setUser({
        role: userData.role || '',
        county: userData.assigned_county || '',
        name: userData.name || '',
        email: userData.email || '',
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  const setRoleAndCounty = (role, county) => {
    setUser(prev => ({ ...prev, role, county }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        setRoleAndCounty,
        isAuthenticated: !!user,
        isNational: user?.role === 'national',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
