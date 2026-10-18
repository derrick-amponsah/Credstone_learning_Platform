'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AuthSplit from '@/components/AuthSplit';
import { Alert, Btn, Check, Field, I } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export default function SignIn() {
  const { refresh, local, setLocal } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState(true);
  const [err, setErr] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [sso, setSso] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await api('/auth/signin', { body: { email, password: pw } });
      await refresh();
      router.replace(r.mustChangePassword ? '/change-password' : '/');
    } catch (x: any) { setErr(x); } finally { setBusy(false); }
  }
  const sizes = [100, 125, 150];
  return (
    <AuthSplit headline={<>Learn what your work needs.<br />Prove you can do it.</>}>
      <div><h2 className="m-h1" style={{ fontSize: 36 }}>Sign in</h2><div className="m-sub" style={{ marginTop: 6 }}>Welcome back. Pick up where you left off.</div></div>
      <button type="button" className="m-btn sec" style={{ minHeight: 52, gap: 10, fontSize: 17 }} onClick={() => setSso(true)}><I n="key" s={22} /> Continue with Credstone single sign-on</button>
      {sso && <Alert>Single sign-on is not connected in this environment yet. Use your email and password for now.</Alert>}
      <div className="m-row" style={{ gap: 14, color: 'var(--ink-muted)', fontSize: 15 }}><i style={{ flex: 1, height: 1, background: 'var(--border)' }} />or sign in with email<i style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {err && <Alert k={err.code === 'PENDING' ? 'info' : 'warn'}>{err.message}</Alert>}
        <Field label="Work email" icon="mail" type="email" autoComplete="username" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
        <Field label="Password" icon="lock" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e: any) => setPw(e.target.value)} required
          right={<button type="button" className="m-link" style={{ fontSize: 15, display: 'flex', gap: 6, alignItems: 'center' }} onClick={() => setShow(!show)}><I n="eye" />{show ? 'Hide' : 'Show'}</button>} />
        <div className="m-row" style={{ justifyContent: 'space-between' }}>
          <div className="m-row" style={{ gap: 12 }}><Check on={keep} onChange={() => setKeep(!keep)} label="Keep me signed in on this device" /><span>Keep me signed in on this device</span></div>
          <Link href="/reset" className="m-link">Forgot password?</Link>
        </div>
        <Btn type="submit" disabled={busy} style={{ minHeight: 52, fontSize: 18 }}>{busy ? 'Signing in...' : 'Sign in'}</Btn>
      </form>
      <div className="m-row" style={{ justifyContent: 'center', gap: 6 }}>New to Credstone Learning? <Link href="/signup" className="m-link">Create an account</Link></div>
      <div className="m-row" style={{ justifyContent: 'center', gap: 22, borderTop: '1px solid var(--border)', color: 'var(--navy)', fontWeight: 600, fontSize: 15, marginTop: 6 }}>
        <button className="m-link m-row" style={{ gap: 6, paddingTop: 12 }} onClick={() => setLocal({ textSize: sizes[(sizes.indexOf(local.textSize) + 1) % 3] })}><I n="textsize" s={18} /> Text size ({local.textSize}%)</button>
        <button className="m-link m-row" style={{ gap: 6, paddingTop: 12 }} aria-pressed={local.highContrast} onClick={() => setLocal({ highContrast: !local.highContrast })}><I n="contrast" s={18} /> High contrast</button>
        <a className="m-link m-row" style={{ gap: 6, paddingTop: 12 }} href="mailto:support@credstone.com"><I n="help" s={18} /> Help</a>
      </div>
    </AuthSplit>
  );
}
