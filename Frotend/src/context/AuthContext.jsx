import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState({ role: localStorage.getItem('role') || 'lab_tech' });
  const setRole = (role) => {
    localStorage.setItem('role', role);
    setUser({ role });
  };
  return <AuthContext.Provider value={{ user, setRole }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
