'use client';
import { useEffect, useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import AdminTabs from '@/components/AdminTabs';
import { Alert, Btn, Check, ErrorBox, Field, I, Ic, Loading, Pill, Select } from '@/components/ui';
import { api, fmtDate, useApi } from '@/lib/api';
import { useSession } from '@/lib/session';

const FILTERS: [string, string][] = [
  ['', 'Everyone'],
  ['active', 'Active'],
  ['pending', 'Waiting for a role'],
  ['suspended', 'Suspended'],
  ['rejected', 'Declined'],
];

function RolePicker({ roles, value, onChange }: { roles: any[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div role="group" aria-label="Roles" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {roles.map((r) => (
        <div key={r.key} className="m-row" style={{ gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)', alignItems: 'flex-start' }}>
          <Check on={value.includes(r.key)} onChange={() => toggle(r.key)} label={r.name} />
          <div><b style={{ color: 'var(--navy)' }}>{r.name}</b><div className="m-sub" style={{ fontSize: 14 }}>{r.description}</div></div>
        </div>
      ))}
    </div>
  );
}
const statusPill = (s: string) => <Pill k={s === 'active' ? 'go' : s === 'pending' ? 'warn' : s === 'rejected' ? 'req' : ''}>{{ pending: 'Waiting for a role', active: 'Active', rejected: 'Declined', suspended: 'Suspended' }[s]}</Pill>;

export default function AdminUsers({ searchParams }: { searchParams: { status?: string } }) {
  const { user } = useSession();
  const [status, setStatus] = useState(searchParams.status ?? '');
  const [term, setTerm] = useState('');
  const list = useApi(`/admin/users?status=${status}&q=${encodeURIComponent(term)}`);
  const roles = useApi<any[]>('/admin/roles');
  const groups = useApi('/admin/groups');
  const [sel, setSel] = useState<any>(null);
  const [selRoles, setSelRoles] = useState<string[]>([]);
  const [selGroup, setSelGroup] = useState('');
  const [msg, setMsg] = useState<any>(null);
  const [issued, setIssued] = useState<any>(null);
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', employeeId: '', groupId: '' });
  const [fRoles, setFRoles] = useState<string[]>(['learner']);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setSel(null); }, [status]);
  const pick = (u: any) => { setSel(u); setSelRoles(u.status === 'pending' ? ['learner'] : u.roles); setSelGroup(''); setMsg(null); };
  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ k: 'ok', t: ok }); setSel(null); await list.reload(); } catch (e: any) { setMsg({ k: 'warn', t: e.message }); } finally { setBusy(false); }
  };
  const approve = () => run(() => api(`/admin/users/${sel.id}/approve`, { body: { roles: selRoles, groupId: selGroup || null } }), `${sel.firstName} can now sign in.`);
  const reject = () => run(() => api(`/admin/users/${sel.id}/reject`, { body: {} }), 'Sign-up declined.');
  const saveRoles = () => run(() => api(`/admin/users/${sel.id}/roles`, { method: 'PUT', body: { roles: selRoles } }), 'Roles updated.');
  const toggleStatus = () => run(() => api(`/admin/users/${sel.id}/${sel.status === 'active' ? 'suspend' : 'reactivate'}`, { body: {} }), sel.status === 'active' ? 'Account suspended.' : 'Account reactivated.');

  async function issue(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setIssued(null); setMsg(null);
    try { setIssued(await api('/admin/users/issue', { body: { ...f, roles: fRoles, groupId: f.groupId || null } })); setF({ firstName: '', lastName: '', email: '', employeeId: '', groupId: '' }); await list.reload(); }
    catch (x: any) { setMsg({ k: 'warn', t: x.message }); } finally { setBusy(false); }
  }
  const copy = async () => { await navigator.clipboard.writeText(`Sign in at ${issued.signIn.url}\nEmail: ${issued.signIn.email}\nTemporary password: ${issued.signIn.temporaryPassword}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const counts = list.data?.counts || {};
  const gl = groups.data?.groups || [];

  return (
    <Shell allow={['admin']}>
      <Head eye="Administrator" title="Users and access" sub="Give a role to people who signed up, or create an account and issue sign-in credentials straight away." />
      <AdminTabs />
      <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1, minHeight: 0 }}>
        <div className="m-card" style={{ flex: 1.5, padding: '16px 0 6px', minWidth: 0 }}>
          <div className="m-row" style={{ gap: 8, padding: '0 18px 12px', flexWrap: 'wrap' }}>
            {FILTERS.map(([k, l]) => (
              <button key={k} aria-pressed={status === k} onClick={() => setStatus(k)} className={`m-btn sm ${status === k ? '' : 'sec'}`}>{l}{counts[k] !== undefined ? ` (${counts[k]})` : ''}</button>
            ))}
            <div className="m-in" style={{ height: 40, marginLeft: 'auto', width: 240, fontSize: 15 }}><I n="search" s={18} /><input aria-label="Search users" placeholder="Search name or email" value={term} onChange={(e) => setTerm(e.target.value)} /></div>
          </div>
          {list.loading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="m-tbl">
                <thead><tr><th>Person</th><th>How they joined</th><th>Roles</th><th>Status</th><th><span className="sr-only" style={{ position: 'absolute', left: -999 }}>Action</span></th></tr></thead>
                <tbody>
                  {list.data.users.map((u: any) => (
                    <tr key={u.id} className={sel?.id === u.id ? 'sel' : ''}>
                      <td><b style={{ color: 'var(--navy)' }}>{u.firstName} {u.lastName}</b><div className="m-sub" style={{ fontSize: 14 }}>{u.email}</div></td>
                      <td>{u.source === 'admin_issued' ? 'Issued by admin' : u.source === 'signup' ? <>Signed up<div className="m-sub" style={{ fontSize: 14 }}>{fmtDate(u.createdAt, { day: 'numeric', month: 'short' })}</div></> : 'Imported'}</td>
                      <td>{u.roles.length ? u.roles.map((r: string) => r.replace('_', ' ')).join(', ') : <span className="m-sub">None yet</span>}</td>
                      <td>{statusPill(u.status)}</td>
                      <td>{u.status !== 'rejected' && <button className={`m-btn sm ${u.status === 'pending' ? '' : 'sec'}`} onClick={() => pick(u)} aria-label={`${u.status === 'pending' ? 'Review' : 'Manage'} ${u.firstName} ${u.lastName}`}>{u.status === 'pending' ? 'Assign role' : 'Manage'}</button>}</td>
                    </tr>
                  ))}
                  {!list.data.users.length && <tr><td colSpan={5} className="m-sub" style={{ padding: 24 }}>{status === 'pending' ? 'No one is waiting for a role. New sign-ups will appear here and in your notifications.' : 'No one matches this view.'}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 320 }}>
          {msg && <Alert k={msg.k}>{msg.t}</Alert>}
          {sel ? (
            <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="m-h3">{sel.status === 'pending' ? 'Assign a role' : 'Change roles'}: {sel.firstName} {sel.lastName}</div>
              <div className="m-sub" style={{ fontSize: 15 }}>{sel.email}{sel.employeeId ? ` · ${sel.employeeId}` : ''}</div>
              <RolePicker roles={roles.data || []} value={selRoles} onChange={setSelRoles} />
              {sel.status === 'pending' && (
                <Select label="Team (optional)" value={selGroup} onChange={(e: any) => setSelGroup(e.target.value)}><option value="">No team yet</option>{gl.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
              )}
              {sel.status === 'pending' ? (
                <div className="m-row" style={{ gap: 12 }}><Btn kind="sec" style={{ flex: 1 }} disabled={busy} onClick={reject}>Decline</Btn><Btn style={{ flex: 1 }} disabled={busy || !selRoles.length} onClick={approve}>Approve and give access</Btn></div>
              ) : (
                <div className="m-row" style={{ gap: 12 }}>
                  {sel.id !== user?.id && <Btn kind="sec" style={{ flex: 1 }} disabled={busy} onClick={toggleStatus}>{sel.status === 'active' ? 'Suspend' : 'Reactivate'}</Btn>}
                  <Btn style={{ flex: 1 }} disabled={busy || !selRoles.length} onClick={saveRoles}>Save roles</Btn>
                </div>
              )}
            </div>
          ) : status === 'pending' && counts.pending ? <Alert icon="users">Choose <b>Assign role</b> on a sign-up to let that person in.</Alert> : null}

          <form className="m-card" onSubmit={issue} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="m-row" style={{ gap: 10 }}><Ic n="key" s={22} color="var(--navy)" /><div className="m-h3">Issue sign-in credentials</div></div>
            <div className="m-sub" style={{ fontSize: 15 }}>Create an account with a role now. The person can sign in straight away with a temporary password and chooses their own at first sign-in.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, width: '100%', minWidth: 0 }}>
              <div style={{ minWidth: 0 }}><Field label="First name" value={f.firstName} onChange={(e: any) => setF({ ...f, firstName: e.target.value })} required /></div>
              <div style={{ minWidth: 0 }}><Field label="Last name" value={f.lastName} onChange={(e: any) => setF({ ...f, lastName: e.target.value })} required /></div>
            </div>
            <Field label="Work email" icon="mail" type="email" value={f.email} onChange={(e: any) => setF({ ...f, email: e.target.value })} required />
            <Field label="Employee ID (optional)" value={f.employeeId} onChange={(e: any) => setF({ ...f, employeeId: e.target.value })} />
            <div className="m-sec">Role</div>
            <RolePicker roles={roles.data || []} value={fRoles} onChange={setFRoles} />
            <Select label="Team (optional)" value={f.groupId} onChange={(e: any) => setF({ ...f, groupId: e.target.value })}><option value="">No team yet</option>{gl.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}</Select>
            <Btn type="submit" disabled={busy || !fRoles.length}>Create account and issue credentials</Btn>
          </form>

          {issued && (
            <div className="m-card" style={{ background: 'var(--highlight)', borderColor: '#e6d9b8', display: 'flex', flexDirection: 'column', gap: 10 }} role="status">
              <div className="m-h3">Credentials for {issued.user.firstName} {issued.user.lastName}</div>
              <div className="m-in" style={{ height: 'auto', padding: 12, flexDirection: 'column', alignItems: 'flex-start', gap: 4, fontSize: 16 }}>
                <span>Sign in: {issued.signIn.url}</span><span>Email: <b>{issued.signIn.email}</b></span><span>Temporary password: <b style={{ fontFamily: 'var(--font-mono)' }}>{issued.signIn.temporaryPassword}</b></span>
              </div>
              <Alert k="warn">This password is shown once. Share it securely. It must be changed at first sign-in.</Alert>
              <Btn kind="sec" onClick={copy}><I n="link" s={18} />&nbsp; {copied ? 'Copied' : 'Copy sign-in details'}</Btn>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
