'use client';
import { useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { PwRules, pwOk } from '@/components/AuthSplit';
import { Alert, Btn, Field, I, Toggle } from '@/components/ui';
import { api, initials } from '@/lib/api';
import { ROLE_NAMES, useSession } from '@/lib/session';

const SECTIONS: [string, string, string][] = [['profile', 'user', 'Profile'], ['learning', 'target', 'Learning preferences'], ['access', 'eye', 'Accessibility'], ['security', 'lock', 'Security']];

export default function Settings() {
  const { user, refresh, setLocal } = useSession();
  const [sec, setSec] = useState('access');
  const [msg, setMsg] = useState<any>(null);
  const [name, setName] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '' });
  const [pw, setPw] = useState({ cur: '', next: '' });
  const prefs = { textSize: 100, captions: true, transcripts: true, ...(user?.prefs || {}) };
  const patch = async (body: any, ok = 'Saved.') => { setMsg(null); try { await api('/auth/me', { method: 'PATCH', body }); await refresh(); setMsg({ k: 'ok', t: ok }); } catch (e: any) { setMsg({ k: 'warn', t: e.message }); } };
  const setPref = (k: string, v: any) => { if (k === 'textSize' || k === 'highContrast') setLocal({ [k]: v }); patch({ prefs: { [k]: v } }); };
  const rows: [string, string, string, boolean][] = [['highContrast', 'High contrast', 'Stronger colours, borders and focus outlines', !!prefs.highContrast], ['captions', 'Captions on by default', 'Show captions on every video', !!prefs.captions], ['reduceMotion', 'Reduce motion', 'Turn off animations and auto-play', !!prefs.reduceMotion], ['transcripts', 'Show transcripts', 'Open the transcript beside each video', !!prefs.transcripts]];
  return (
    <Shell>
      <Head title="Settings" sub="Make Credstone Learning work the way you do." />
      {msg && <Alert k={msg.k}>{msg.t}</Alert>}
      <div className="m-row" style={{ gap: 22, alignItems: 'flex-start', flex: 1 }}>
        <nav className="m-card" aria-label="Settings sections" style={{ width: 260, flex: 'none', padding: 10 }}>
          {SECTIONS.map(([k, ic, l]) => <button key={k} className="m-nav" onClick={() => setSec(k)} style={{ color: 'var(--navy)', width: '100%', border: 0, borderLeft: sec === k ? '4px solid var(--navy)' : '4px solid transparent', background: sec === k ? 'var(--highlight)' : 'none', fontWeight: sec === k ? 700 : 500, font: 'inherit', cursor: 'pointer', textAlign: 'left' }}><I n={ic} s={22} /><span>{l}</span></button>)}
          <a className="m-nav" href="/notifications" style={{ color: 'var(--navy)', borderLeft: '4px solid transparent' }}><I n="bell" s={22} /><span>Notifications</span></a>
        </nav>
        <div className="m-card" style={{ flex: 1.3, minWidth: 0 }}>
          {sec === 'access' && (<>
            <h2 className="m-h2">Accessibility</h2><div className="m-sub" style={{ marginBottom: 10 }}>These settings follow you on every device.</div>
            <div className="m-row" style={{ gap: 14, padding: '12px 0', borderTop: '1px solid var(--border)' }}><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>Text size</div><div className="m-sub" style={{ fontSize: 15 }}>Currently {prefs.textSize}%</div></div>
              <div className="m-row" style={{ gap: 8 }}>{[[100, 16, 'Normal'], [125, 18, 'Larger'], [150, 22, 'Largest']].map(([v, fs, l]: any) => <button key={v} aria-label={`${l} text`} aria-pressed={prefs.textSize === v} className={`m-btn sm ${prefs.textSize === v ? '' : 'sec'}`} style={{ fontSize: fs }} onClick={() => setPref('textSize', v)}>A</button>)}</div></div>
            {rows.map(([k, t, s, on]) => <div key={k} className="m-row" style={{ gap: 14, padding: '12px 0', borderTop: '1px solid var(--border)' }}><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{t}</div><div className="m-sub" style={{ fontSize: 15 }}>{s}</div></div><Toggle on={on} label={t} onChange={(v) => setPref(k, v)} /></div>)}
          </>)}
          {sec === 'profile' && (<form onSubmit={(e) => { e.preventDefault(); patch(name, 'Profile updated.'); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}><h2 className="m-h2">Profile</h2>
            <Field label="First name" value={name.firstName} onChange={(e: any) => setName({ ...name, firstName: e.target.value })} required /><Field label="Last name" value={name.lastName} onChange={(e: any) => setName({ ...name, lastName: e.target.value })} required /><Btn type="submit">Save profile</Btn></form>)}
          {sec === 'learning' && (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><h2 className="m-h2">Learning preferences</h2><div className="m-sub">How familiar are you with the tools you use at work? We use this to suggest where to start.</div>
            {['Just starting', 'Comfortable', 'Advanced'].map((l) => <Btn key={l} kind={user?.level === l ? '' : 'sec'} onClick={() => patch({ level: l }, 'Level updated.')}>{l}</Btn>)}</div>)}
          {sec === 'security' && (<form onSubmit={async (e) => { e.preventDefault(); if (!pwOk(pw.next)) return setMsg({ k: 'warn', t: 'Your new password does not meet the rules yet.' }); try { await api('/auth/change-password', { body: { current: pw.cur, password: pw.next } }); setPw({ cur: '', next: '' }); setMsg({ k: 'ok', t: 'Password changed.' }); } catch (x: any) { setMsg({ k: 'warn', t: x.message }); } }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 className="m-h2">Security</h2><Field label="Current password" type="password" autoComplete="current-password" value={pw.cur} onChange={(e: any) => setPw({ ...pw, cur: e.target.value })} required /><Field label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={(e: any) => setPw({ ...pw, next: e.target.value })} required /><PwRules pw={pw.next} /><Btn type="submit">Change password</Btn></form>)}
        </div>
        <div className="m-card" style={{ flex: 1, minWidth: 0 }}>
          <div className="m-row" style={{ gap: 16 }}><span className="m-av" style={{ width: 64, height: 64, background: 'var(--sand)', color: 'var(--navy)' }}>{initials(`${user?.firstName} ${user?.lastName}`)}</span><div><h2 className="m-h3">{user?.firstName} {user?.lastName}</h2><div className="m-sub" style={{ fontSize: 15 }}>{user?.email}</div></div></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {[['Team', user?.team || 'Not assigned yet'], ['Supervisor', user?.supervisor || 'Not assigned yet'], ['Roles', (user?.roles || []).map((r: string) => ROLE_NAMES[r]).join(', ')], ['Level', user?.level || 'Not set']].map(([k, v]) => <div key={k} className="m-row" style={{ justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)', gap: 12 }}><span className="m-sub">{k}</span><b style={{ color: 'var(--navy)', textAlign: 'right' }}>{v}</b></div>)}
          </div>
          <Btn kind="sec" style={{ marginTop: 14, width: '100%' }} onClick={() => setSec('profile')}>Edit profile</Btn>
        </div>
      </div>
    </Shell>
  );
}
