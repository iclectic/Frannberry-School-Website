'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch, getStoredToken, setStoredTokens, clearStoredTokens, getStoredUser, setStoredUser, clearStoredUser } from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'STAFF' | 'HEAD';
  mfaEnabled?: boolean;
  mfaSetupRequired?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getStoredToken();
    const savedUser = getStoredUser();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, mfaCode?: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, mfaCode }),
    });

    if (data.requiresMfa) {
      return data;
    }

    setToken(data.accessToken);
    setUser(data.user);
    setStoredTokens(data.accessToken, data.refreshToken);
    setStoredUser(data.user);
    return data;
  };

  const logout = () => {
    if (token) {
      apiFetch('/auth/logout', { method: 'POST', token }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    clearStoredTokens();
    clearStoredUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
