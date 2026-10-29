import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('gm_token'));

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      return data;
    } catch {
      localStorage.removeItem('gm_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (localStorage.getItem('gm_token')) refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('gm_token', data.token);
    await refresh();
    return data.user;
  };
  const logout = () => { localStorage.removeItem('gm_token'); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, logout, refresh, setUser }}>{children}</Ctx.Provider>;
}
