'use client';
import { useCallback, useEffect, useState } from 'react';

export class ApiError extends Error { status = 0; code?: string; }

export async function api<T = any>(path: string, opts: { method?: string; body?: any; form?: FormData } = {}): Promise<T> {
  const r = await fetch('/api' + path, {
    method: opts.method || (opts.body || opts.form ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.form || (opts.body ? JSON.stringify(opts.body) : undefined),
    credentials: 'same-origin',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new ApiError(j.error || 'Something went wrong. Try again.'); e.status = r.status; e.code = j.code; throw e; }
  return j;
}

/** Load data from the API. `reload()` refetches. Pass null to skip. */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!path);
  const load = useCallback(async () => {
    if (!path) return;
    try { setData(await api<T>(path)); setError(null); } catch (e: any) { setError(e); } finally { setLoading(false); }
  }, [path]);
  useEffect(() => { setLoading(!!path); load(); }, [load, path]);
  return { data, error, loading, reload: load, setData };
}

export const fmtDate = (d?: string | Date | null, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(d).toLocaleDateString('en-GB', o) : '');
export const ago = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24); return days === 1 ? 'yesterday' : `${days} days ago`;
};
export const initials = (n: string) => n.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();
