'use client';
import { I, Logo, Ic } from './ui';

const BULLETS: [string, string][] = [['route', 'Courses and paths assigned to your role'], ['award', 'Credentials issued when criteria are met'], ['shieldcheck', 'Your progress is private to you and your role']];

export default function AuthSplit({ headline, children }: { headline: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="m-app app auth-wrap">
      <div className="auth-art" style={{ width: '46%', background: 'var(--navy)', position: 'relative', overflow: 'hidden', padding: '44px 52px', display: 'flex', flexDirection: 'column', gap: 22, color: '#fff' }}>
        <div style={{ position: 'absolute', right: 0, bottom: 0, width: '48%', maxWidth: 380, height: 'clamp(150px, 28vh, 240px)', opacity: 0.9, pointerEvents: 'none' }}>
          <svg width="100%" height="100%" viewBox="0 0 400 130" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
            <rect x="130" y="96" width="270" height="34" fill="#1b2d52" /><rect x="190" y="66" width="210" height="64" fill="#2a3f6e" /><rect x="250" y="36" width="150" height="94" fill="#C5A059" /><rect x="320" y="8" width="80" height="122" fill="#EFE8D8" />
            <path d="M130 96h60V66h60V36h70V8" fill="none" stroke="#E6C887" strokeWidth="3" />
          </svg>
        </div>
        <div className="m-row" style={{ gap: 12, font: '700 22px/1.15 var(--font-serif)', position: 'relative', zIndex: 1 }}><Logo /><span>Credstone Learning</span></div>
        <div style={{ flex: 1, maxHeight: 60 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 'min(380px, 52%)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 className="m-h1" style={{ color: '#fff', fontSize: 'clamp(28px, 2.6vw, 40px)', lineHeight: 1.15, margin: 0 }}>{headline}</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            {BULLETS.map(([ic, t]) => (
              <div key={t} className="m-row" style={{ gap: 12, color: 'var(--on-navy)', fontSize: 17, lineHeight: 1.35, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, marginTop: 2 }}><Ic n={ic} s={22} color="var(--gold-soft)" /></span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 40px', overflow: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
      </div>
    </div>
  );
}
export const PwRules = ({ pw }: { pw: string }) => {
  const COMMON = ['password1234', '123456789012', 'qwertyuiop12', 'welcome12345', 'passw0rd1234', 'letmein12345'];
  const rules: [string, boolean][] = [['12+ characters', pw.length >= 12], ['A number', /[0-9]/.test(pw)], ['Upper and lower case', /[a-z]/.test(pw) && /[A-Z]/.test(pw)], ['Not a common password', pw.length > 0 && !COMMON.includes(pw.toLowerCase())]];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
      {rules.map(([t, ok]) => <div key={t} className="m-row" style={{ gap: 8, fontSize: 15, color: ok ? 'var(--success-ink)' : 'var(--ink-muted)' }}><I n={ok ? 'checkc' : 'xc'} s={18} />{t}</div>)}
    </div>
  );
};
export const pwOk = (pw: string) => pw.length >= 12 && /[0-9]/.test(pw) && /[a-z]/.test(pw) && /[A-Z]/.test(pw);
