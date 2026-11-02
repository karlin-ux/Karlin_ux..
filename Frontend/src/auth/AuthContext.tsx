import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ensureCsrf } from '../api/client';

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  is_superadmin: boolean;
  workspaces?: any[];
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      await ensureCsrf();
      const r = await api.get('/auth/me/');
      setUser(r.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function login(email: string, password: string) {
    await ensureCsrf();
    const r = await api.post('/auth/login/', { email, password });
    setUser(r.data);
  }

  async function register(email: string, password: string) {
    await ensureCsrf();
    const r = await api.post('/auth/register/', { email, password, password_confirm: password });
    setUser(r.data);
  }

  async function logout() {
    await api.post('/auth/logout/');
    setUser(null);
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('no auth');
  return c;
}