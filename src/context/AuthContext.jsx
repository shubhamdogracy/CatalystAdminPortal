// ============================================================
// AUTH CONTEXT — Global authentication state
// Handles login, logout, and current user session
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from sessionStorage on page refresh.
  // sessionStorage is tab-scoped, so each browser tab keeps its
  // own independent session — prevents cross-portal bleed-over.
  useEffect(() => {
    const savedUser = sessionStorage.getItem('catalyst_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Login — calls real backend API
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      // Save token and user to sessionStorage (tab-scoped)
      sessionStorage.setItem('catalyst_token', data.token);
      sessionStorage.setItem('catalyst_user', JSON.stringify(data.data));
      setUser(data.data);

      return { success: true, role: data.data.role };

    } catch (_error) {
      return { success: false, error: 'Server unreachable. Is the backend running?' };
    }
  };

  // Register — calls real backend API
  const register = async (name, email, password, role) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Registration failed' };
      }

      // Auto login after register
      sessionStorage.setItem('catalyst_token', data.token);
      sessionStorage.setItem('catalyst_user', JSON.stringify(data.data));
      setUser(data.data);

      return { success: true, role: data.data.role };

    } catch (_error) {
      return { success: false, error: 'Server unreachable. Is the backend running?' };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('catalyst_user');
    sessionStorage.removeItem('catalyst_token');
  };

  return (
      <AuthContext.Provider value={{ user, login, logout, register, loading }}>
        {children}
      </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
