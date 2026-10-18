'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Btn, Ic, Logo, Radio, Toggle, Av } from '@/components/ui';
import { api, initials } from '@/lib/api';
import { useSession } from '@/lib/session';

const LEVELS: [string, string, string, string][] = [
  ['Just starting', 'cap', 'I am new to the tools and terms. Show me the basics.', ''],
  ['Comfortable', 'monitor', 'I use them every day. Show me what to deepen.', ''],
  ['Advanced', 'bolt', 'I lead or teach others. Show me the specialist content.', ''],
];

export default function Welcome() {
  const { user, refresh, setLocal, local } = useSession();
  const router = useRouter();
  const [level, setLevel] = useState('Just starting');
  const [size, setSize] = useState(100);
  const [hc, setHc] = useState(false);
  useEffect(() => { if (user === null) router.replace('/signin'); }, [user, router]);
  if (!user) return null;

  async function save(skip = false) {
    await api('/auth/me', { method: 'PATCH', body: skip ? { prefs: { onboarded: true } } : { level, prefs: { onboarded: true, textSize: size, highContrast: hc } } });
    await refresh(); router.replace('/');
  }
  const sizes: [number, string, number][] = [[100, 'Normal', 14], [125, 'Larger', 18], [150, 'Largest', 22]];
  return (
    <div className="m-app app" style={{ flexDirection: 'column' }}>
      <header className="m-top">
        <div className="m-row" style={{ gap: 12, font: '700 20px var(--font-serif)', color: 'var(--navy)' }}><Logo /><span>Credstone Learning</span></div>
        <div className="m-grow" /><button className="m-link" onClick={() => save(true)}>Skip for now</button><Av t={initials(`${user.firstName} ${user.lastName}`)} />
      </header>
      <div className="m-body" style={{ padding: '26px 40px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="m-row" style={{ gap: 12 }}>
            <div className="m-row" style={{ gap: 10, flex: 1 }}><span className="m-step" style={{ background: 'var(--navy)', color: 'var(--gold-soft)', borderColor: 'var(--navy)' }}><Ic n="check" s={18} /></span><b style={{ color: 'var(--navy)' }}>Your profile</b><i style={{ flex: 1, height: 2, background: 'var(--border)' }} /></div>
            <div className="m-row" style={{ gap: 10, flex: 1 }}><span className="m-step on">2</span><b style={{ color: 'var(--navy)' }}>Your level</b><i style={{ flex: 1, height: 2, background: 'var(--border)' }} /></div>
            <div className="m-row" style={{ gap: 10, flex: 1 }}><span className="m-step">3</span><b style={{ color: 'var(--ink-muted)' }}>Your preferences</b></div>
          </div>
          <div><h1 className="m-h1">How familiar are you with the tools you use at work?</h1><div className="m-sub" style={{ marginTop: 4 }}>There is no wrong answer. We use this to suggest where to start, and you can change it later.</div></div>
          <div role="radiogroup" aria-label="Your level" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18 }}>
            {LEVELS.map(([name, ic, text]) => (
              <div key={name} className="m-card" onClick={() => setLevel(name)} style={{ border: `2px solid ${level === name ? 'var(--navy)' : 'var(--border)'}`, background: level === name ? 'var(--highlight)' : '#fff', display: 'flex', flexDirection: 'column', gap: 10, padding: 20, cursor: 'pointer' }}>
                <div className="m-row" style={{ justifyContent: 'space-between' }}><span className={`m-disc ${level === name ? '' : 'sand'}`} style={{ width: 52, height: 52 }}><Ic n={ic} s={28} /></span><Radio on={level === name} onChange={() => setLevel(name)} label={name} /></div>
                <div className="m-h3" style={{ fontSize: 21 }}>{name}</div><div className="m-sub">{text}</div>
              </div>
            ))}
          </div>
          <div className="m-card"><div className="m-h3" style={{ marginBottom: 6 }}>Make it comfortable</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '0 40px' }}>
              <div className="m-row" style={{ gap: 14, padding: '12px 0' }}><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>Text size</div><div className="m-sub" style={{ fontSize: 15 }}>Applies everywhere</div></div>
                <div className="m-row" style={{ gap: 8 }}>{sizes.map(([v, l, fs]) => <button key={v} aria-label={l} aria-pressed={size === v} className={`m-btn sm ${size === v ? '' : 'sec'}`} style={{ fontSize: fs }} onClick={() => { setSize(v); setLocal({ textSize: v }); }}>A</button>)}</div></div>
              <div className="m-row" style={{ gap: 14, padding: '12px 0' }}><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>High contrast</div><div className="m-sub" style={{ fontSize: 15 }}>Stronger colours and borders</div></div><Toggle on={hc} label="High contrast" onChange={(v) => { setHc(v); setLocal({ highContrast: v }); }} /></div>
            </div></div>
          <div className="m-row" style={{ justifyContent: 'space-between' }}><Btn kind="sec" onClick={() => router.back()}>Back</Btn><Btn onClick={() => save()} style={{ minWidth: 140 }}>Continue</Btn></div>
        </div>
      </div>
    </div>
  );
}
