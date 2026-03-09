import { createContext, useContext, useMemo, useState } from 'react';
import { loginRequest, logoutRequest } from '../api/client';

const AuthContext = createContext(null);

const TEMP_ADMIN_PASSCODE = process.env.REACT_APP_TEMP_ADMIN_PASSCODE || '';
const TEMP_ADMIN_ENABLED =
  (process.env.REACT_APP_TEMP_ADMIN_ENABLED || 'false').toLowerCase() === 'true';
const TEMP_AUTH_ALLOWED = process.env.NODE_ENV !== 'production' && TEMP_ADMIN_ENABLED;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_access_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('admin_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    if (TEMP_AUTH_ALLOWED && TEMP_ADMIN_PASSCODE && password === TEMP_ADMIN_PASSCODE) {
      const tempToken = 'temp-local-token';
      const tempUser = {
        email: email || 'temp-admin@local',
        role: 'admin',
        auth: 'temporary-passcode',
      };

      localStorage.setItem('admin_access_token', tempToken);
      localStorage.setItem('admin_user', JSON.stringify(tempUser));
      setToken(tempToken);
      setUser(tempUser);
      return;
    }

    const data = await loginRequest(email, password);
    if (!data?.accessToken) {
      throw new Error('Invalid login response: accessToken missing');
    }

    localStorage.setItem('admin_access_token', data.accessToken);
    localStorage.setItem('admin_user', JSON.stringify(data.user || null));
    setToken(data.accessToken);
    setUser(data.user || null);
  };

  const logout = async () => {
    await logoutRequest();
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      logout,
      tempAuthEnabled: TEMP_AUTH_ALLOWED,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
