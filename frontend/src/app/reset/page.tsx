'use client';
import Link from 'next/link';
import { useState } from 'react';
import AuthSplit, { PwRules, pwOk } from '@/components/AuthSplit';
import { Alert, Btn, Field, I } from '@/components/ui';
import { api } from '@/lib/api';

export default function Reset({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function request(e: React.FormEvent) { e.preventDefault(); setErr(''); try { await api('/auth/reset-request', { body: { email } }); setSent(true); } catch (x: any) { setErr(x.message); } }
  async function choose(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!pwOk(pw)) return setErr('Your password does not meet the rules below yet.');
    try { await api('/auth/reset', { body: { token, password: pw } }); setDone(true); } catch (x: any) { setErr(x.message); }
  }
  return (
    <AuthSplit headline={<>We will get you<br />back to learning.</>}>
      <Link href="/signin" className="m-row" style={{ gap: 8, color: 'var(--navy)', fontWeight: 600 }}><I n="back" /> Back to sign in</Link>
      {token ? (
        done ? <><Alert k="ok"><b>Password changed.</b> You can sign in with it now.</Alert><Btn href="/signin">Sign in</Btn></> : (
          <form onSubmit={choose} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><h2 className="m-h1" style={{ fontSize: 36 }}>Choose a new password</h2></div>
            {err && <Alert k="warn">{err}</Alert>}
            <Field label="New password" icon="lock" type="password" autoComplete="new-password" value={pw} onChange={(e: any) => setPw(e.target.value)} required />
            <PwRules pw={pw} />
            <Btn type="submit" style={{ minHeight: 52, fontSize: 18 }}>Save password</Btn>
          </form>
        )
      ) : (
        <form onSubmit={request} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><h2 className="m-h1" style={{ fontSize: 36 }}>Reset your password</h2><div className="m-sub" style={{ marginTop: 6 }}>Enter your work email. We&apos;ll send you a link to choose a new password.</div></div>
          {err && <Alert k="warn">{err}</Alert>}
          <Field label="Work email" icon="mail" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required />
          <Btn type="submit" style={{ minHeight: 52, fontSize: 18 }}>Send reset link</Btn>
          {sent && <Alert k="ok"><b>Check your email.</b> If this address matches an account, a link is on its way. It works for 30 minutes.</Alert>}
          <Alert><b>Good to know.</b> If you sign in with single sign-on, reset your password with your company IT service instead.</Alert>
          <div className="m-row" style={{ gap: 6 }}>Still stuck? <a className="m-link" href="mailto:support@credstone.com">Contact support</a></div>
        </form>
      )}
    </AuthSplit>
  );
}
