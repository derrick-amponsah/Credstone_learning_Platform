'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AuthSplit, { PwRules, pwOk } from '@/components/AuthSplit';
import { Alert, Btn, Check, Field, I } from '@/components/ui';
import { api } from '@/lib/api';

export default function SignUp() {
  const router = useRouter();
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', employeeId: '', password: '' });
  const [agree, setAgree] = useState(false);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!pwOk(f.password)) return setErr('Your password does not meet the rules below yet.');
    if (!agree) return setErr('Agree to the Learning Data and Privacy Notice to continue.');
    setBusy(true);
    try { await api('/auth/signup', { body: { ...f, agree: true } }); router.replace('/pending?name=' + encodeURIComponent(f.firstName)); }
    catch (x: any) { setErr(x.message); } finally { setBusy(false); }
  }
  return (
    <AuthSplit headline={<>Start building skills<br />that count at work.</>}>
      <div><div className="m-eye">Step 1 of 2</div><h2 className="m-h1" style={{ fontSize: 34 }}>Create your account</h2><div className="m-sub" style={{ marginTop: 4 }}>Use your work email so we can place you in the right team. An administrator will give you a role before you can sign in.</div></div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {err && <Alert k="warn">{err}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, width: '100%', minWidth: 0 }}>
          <div style={{ minWidth: 0 }}><Field label="First name" value={f.firstName} onChange={set('firstName')} autoComplete="given-name" required /></div>
          <div style={{ minWidth: 0 }}><Field label="Last name" value={f.lastName} onChange={set('lastName')} autoComplete="family-name" required /></div>
        </div>
        <Field label="Work email" icon="mail" type="email" value={f.email} onChange={set('email')} autoComplete="email" required />
        <Field label="Employee ID (optional)" value={f.employeeId} onChange={set('employeeId')} hint="Helps match you to your team and supervisor." />
        <Field label="Create password" icon="lock" type={show ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete="new-password" required
          right={<button type="button" className="m-link" style={{ fontSize: 15, display: 'flex', gap: 6, alignItems: 'center' }} onClick={() => setShow(!show)}><I n="eye" />{show ? 'Hide' : 'Show'}</button>} />
        <PwRules pw={f.password} />
        <div className="m-row" style={{ gap: 12 }}><Check on={agree} onChange={() => setAgree(!agree)} label="I agree to the Learning Data and Privacy Notice" /><span>I agree to the Learning Data and Privacy Notice</span></div>
        <Btn type="submit" disabled={busy} style={{ minHeight: 52, fontSize: 18 }}>{busy ? 'Creating account...' : 'Create account'}</Btn>
      </form>
      <div className="m-row" style={{ justifyContent: 'center', gap: 6 }}>Already have an account? <Link href="/signin" className="m-link">Sign in</Link></div>
    </AuthSplit>
  );
}
