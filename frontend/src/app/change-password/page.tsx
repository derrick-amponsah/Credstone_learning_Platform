'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AuthSplit, { PwRules, pwOk } from '@/components/AuthSplit';
import { Alert, Btn, Field } from '@/components/ui';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

// Accounts issued by an administrator start with a temporary password and must set their own here.
export default function ChangePassword() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const [cur, setCur] = useState(''); const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { if (user === null) router.replace('/signin'); }, [user, router]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!pwOk(pw)) return setErr('Your new password does not meet the rules below yet.');
    if (pw !== pw2) return setErr('The two new passwords do not match.');
    try { await api('/auth/change-password', { body: { current: cur, password: pw } }); await refresh(); router.replace('/'); } catch (x: any) { setErr(x.message); }
  }
  return (
    <AuthSplit headline={<>Choose your own<br />password to begin.</>}>
      <div><h2 className="m-h1" style={{ fontSize: 34 }}>Set your password</h2><div className="m-sub" style={{ marginTop: 6 }}>Your administrator gave you a temporary password. Replace it with one only you know.</div></div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {err && <Alert k="warn">{err}</Alert>}
        <Field label="Temporary password" icon="key" type="password" autoComplete="current-password" value={cur} onChange={(e: any) => setCur(e.target.value)} required />
        <Field label="New password" icon="lock" type="password" autoComplete="new-password" value={pw} onChange={(e: any) => setPw(e.target.value)} required />
        <PwRules pw={pw} />
        <Field label="Repeat new password" icon="lock" type="password" autoComplete="new-password" value={pw2} onChange={(e: any) => setPw2(e.target.value)} required />
        <Btn type="submit" style={{ minHeight: 52, fontSize: 18 }}>Save and continue</Btn>
      </form>
    </AuthSplit>
  );
}
