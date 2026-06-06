import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, setAccessToken } from '@hostel/lib/api';
import type { AuthUser, LoginResponse } from '@hostel/types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function HostelAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const ok = await api.refresh();
      if (ok) {
        try {
          const { user: me } = await api.get<{ user: AuthUser }>('/api/auth/me');
          setUser(me);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginResponse>('/api/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useHostelAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useHostelAuth must be used within HostelAuthProvider');
  return ctx;
}
