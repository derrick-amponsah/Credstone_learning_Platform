'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const PRIORITY = ['admin', 'training_owner', 'instructor', 'assessor', 'supervisor', 'learner'];
export const ROLE_NAMES: Record<string, string> = { admin: 'Administrator', training_owner: 'Training owner', instructor: 'Content instructor', assessor: 'Assessor', supervisor: 'Supervisor', learner: 'Learner' };
type Ctx = { user: any; active: string; setActive: (r: string) => void; refresh: () => Promise<any>; signOut: () => Promise<void>; local: any; setLocal: (p: any) => void };
const C = createContext<Ctx>(null as any);
export const useSession = () => useContext(C);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(undefined);
  const [active, setActiveState] = useState('learner');
  const [local, setLocalState] = useState<any>({ textSize: 100, highContrast: false });

  const refresh = useCallback(async () => {
    try {
      const u = await api('/auth/me');
      setUser(u);
      const saved = localStorage.getItem('cs_role') || '';
      setActiveState(u.roles.includes(saved) ? saved : PRIORITY.find((r) => u.roles.includes(r)) || 'learner');
      return u;
    } catch { setUser(null); return null; }
  }, []);
  useEffect(() => { try { setLocalState({ textSize: 100, highContrast: false, ...JSON.parse(localStorage.getItem('cs_pre') || '{}') }); } catch {} refresh(); }, [refresh]);

  const prefs = { ...local, ...(user?.prefs || {}) };
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = prefs.highContrast ? 'high-contrast' : 'light';
    el.style.setProperty('--z', String((prefs.textSize || 100) / 100));
    el.dataset.reduceMotion = String(!!prefs.reduceMotion);
  }, [prefs.highContrast, prefs.textSize, prefs.reduceMotion]);

  const setActive = (r: string) => { localStorage.setItem('cs_role', r); setActiveState(r); };
  const setLocal = (p: any) => { const n = { ...local, ...p }; localStorage.setItem('cs_pre', JSON.stringify(n)); setLocalState(n); };
  const signOut = async () => { await api('/auth/signout', { method: 'POST', body: {} }); setUser(null); window.location.href = '/signin'; };
  return <C.Provider value={{ user, active, setActive, refresh, signOut, local, setLocal }}>{children}</C.Provider>;
}
