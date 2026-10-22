'use client';
import Link from 'next/link';
import { useId, useEffect, useState } from 'react';

const SH = '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>';
const ICONS: Record<string, string> = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  bell: '<path d="M6 17v-6a6 6 0 1112 0v6l2 2H4z"/><path d="M10 21h4"/>',
  back: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 010 6.6M18 14.8c2.2.6 3.5 2.3 3.5 5.2"/>',
  shield: SH,
  shieldcheck: SH + '<path d="M8.5 12l2.5 2.5 4.5-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  checkc: '<circle cx="12" cy="12" r="10"/><path d="M8 12.5l3 3 5-6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  upload: '<path d="M12 16V4M7 8l5-5 5 5M4 20h16"/>',
  spark: '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5h.01"/>',
  flag: '<path d="M5 21V4M5 5h13l-2 4 2 4H5"/>',
  arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  refresh: '<path d="M20 11a8 8 0 00-14-4L4 9M4 4v5h5M4 13a8 8 0 0014 4l2-2M20 20v-5h-5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0012 3z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  cloud: '<path d="M7 18a5 5 0 01-.5-10A6 6 0 0118 9.5 4.3 4.3 0 0117.5 18z"/>',
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5M4 20h16"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevr: '<path d="M9 5l7 7-7 7"/>',
  chevd: '<path d="M5 9l7 7 7-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6"/>',
  monitor: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2 19h20"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3 3 0 000-6H9a3 3 0 010-6h6.5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  captions: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 12h3M14 12h3M7 15.5h6"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  textsize: '<path d="M3 19L8 6l5 13M5 14h6M15 19l3.5-8 3.5 8M16.3 16.5h4.4"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1-1.5 2M12 17h.01"/>',
  xc: '<circle cx="12" cy="12" r="10"/><path d="M9 9l6 6M15 9l-6 6"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>',
  external: '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>',
};

export function I({ n, s = 20, c }: { n: string; s?: number; c?: string }) {
  return <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c || 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[n] || ICONS.book }} />;
}
export const Ic = ({ n, s = 20, color }: { n: string; s?: number; color?: string }) => <span style={{ display: 'flex', color }}><I n={n} s={s} /></span>;

export function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#1b2d52" /><path d="M43.5 22.4A15 15 0 1 0 43.5 41.6" fill="none" stroke="#C5A059" strokeWidth="7" /><rect x="37" y="29" width="9" height="6" rx="1.5" fill="#EFE8D8" />
    </svg>
  );
}

export const Pill = ({ k = '', children }: { k?: string; children: React.ReactNode }) => <span className={`m-pill ${k}`}>{children}</span>;

export function Btn({ kind = '', sm, href, onClick, disabled, type = 'button', children, style, title }: any) {
  const cls = `m-btn ${kind} ${sm ? 'sm' : ''} ${disabled ? 'off' : ''}`.replace(/\s+/g, ' ').trim();
  if (href && !disabled) return <Link href={href} className={cls} style={style}>{children}</Link>;
  return <button type={type} className={cls} onClick={onClick} disabled={disabled} style={style} title={title}>{children}</button>;
}

export const Disc = ({ n, size = 42, sand, style }: { n: string; size?: number; sand?: boolean; style?: React.CSSProperties }) => (
  <span className={`m-disc ${sand ? 'sand' : ''}`} style={{ width: size, height: size, ...style }}><I n={n} s={Math.round(size * 0.52)} /></span>
);
export const Av = ({ t, size = 44, bg, fg }: { t: string; size?: number; bg?: string; fg?: string }) => (
  <span className="m-av" style={{ width: size, height: size, background: bg, color: fg, fontSize: size < 44 ? 14 : 16 }}>{t}</span>
);
export const Bar = ({ pct, style }: { pct: number; style?: React.CSSProperties }) => (
  <div className="m-bar" style={style} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
);
export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} className={`m-tg ${on ? 'on' : ''}`} onClick={() => onChange(!on)} style={{ border: 0 }}><i /></button>
);
export const Check = ({ on, onChange, label }: { on: boolean; onChange?: () => void; label: string }) => (
  <button type="button" role="checkbox" aria-checked={on} aria-label={label} className={`m-chk ${on ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onChange?.(); }}>{on && <I n="check" s={16} />}</button>
);
export const Radio = ({ on, onChange, label }: { on: boolean; onChange?: () => void; label: string }) => (
  <button type="button" role="radio" aria-checked={on} aria-label={label} className={`m-rad ${on ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onChange?.(); }}>{on && <i />}</button>
);

export function Field({ label, hint, icon, error, right, ...inp }: any) {
  const id = useId();
  return (
    <div className="m-field" style={{ minWidth: 0, width: '100%' }}>
      <label htmlFor={id}>{label}</label>
      <div className="m-in" style={{ minWidth: 0, width: '100%', ...(error ? { borderColor: 'var(--required-ink)' } : undefined) }}>
        {icon && <Ic n={icon} color="var(--ink-muted)" />}
        <input id={id} aria-invalid={!!error} style={{ minWidth: 0 }} {...inp} />
        {right}
      </div>
      {hint && !error && <div className="m-hint">{hint}</div>}
      {error && <div className="m-hint" style={{ color: 'var(--required-ink)' }} role="alert">{error}</div>}
    </div>
  );
}
export function TextArea({ label, height = 120, ...p }: any) {
  const id = useId();
  return (
    <div className="m-field" style={{ minWidth: 0, width: '100%' }}>
      <label htmlFor={id}>{label}</label>
      <div className="m-in" style={{ height, alignItems: 'flex-start', minWidth: 0, width: '100%' }}><textarea id={id} style={{ minWidth: 0 }} {...p} /></div>
    </div>
  );
}
export function Select({ label, children, ...p }: any) {
  const id = useId();
  return (
    <div className="m-field" style={{ minWidth: 0, width: '100%' }}>
      <label htmlFor={id}>{label}</label>
      <div className="m-in" style={{ minWidth: 0, width: '100%' }}><select id={id} style={{ minWidth: 0 }} {...p}>{children}</select><Ic n="chevd" /></div>
    </div>
  );
}

export function Alert({ k = 'info', icon, children }: { k?: 'ok' | 'warn' | 'info'; icon?: string; children: React.ReactNode }) {
  return <div className={`m-alert ${k}`} role={k === 'warn' ? 'alert' : 'status'}><span style={{ display: 'flex', flex: 'none' }}><I n={icon || (k === 'ok' ? 'checkc' : k === 'warn' ? 'warn' : 'info')} s={22} /></span><div>{children}</div></div>;
}
export function Tabs({ items, value, onChange }: { items: [string, string, React.ReactNode?][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="m-tabs" role="tablist" style={{ flex: 'none' }}>
      {items.map(([k, label, extra]) => (
        <button key={k} role="tab" aria-selected={value === k} className={`m-tab ${value === k ? 'on' : ''}`} onClick={() => onChange(k)} style={{ background: 'none', borderTop: 0, borderLeft: 0, borderRight: 0, cursor: 'pointer', fontFamily: 'inherit' }}>{label}{extra}</button>
      ))}
    </div>
  );
}
export const Loading = ({ text = 'Loading...' }: { text?: string }) => <div className="m-sub" role="status" style={{ padding: 24 }}>{text}</div>;
export const ErrorBox = ({ error }: { error: any }) => <Alert k="warn">{error?.message || 'Something went wrong.'}</Alert>;
export function Empty({ icon = 'info', title, text, action }: { icon?: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="m-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 32 }}>
      <Disc n={icon} size={56} sand /><div className="m-h3">{title}</div>{text && <div className="m-sub" style={{ maxWidth: 440 }}>{text}</div>}{action}
    </div>
  );
}

// ── Toast popup notification ──────────────────────────────────────────────────
type ToastKind = 'ok' | 'warn' | 'info';
export interface ToastData { k: ToastKind; t: string; }

export function Toast({ toast, onDone }: { toast: ToastData | null; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), 3800);
    const done = setTimeout(() => { setVisible(false); onDone(); }, 4300);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, [toast]);

  if (!toast) return null;

  const bg = toast.k === 'ok' ? '#10b981' : toast.k === 'warn' ? '#f59e0b' : '#3b82f6';
  const iconN = toast.k === 'ok' ? 'checkc' : toast.k === 'warn' ? 'warn' : 'info';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        background: '#fff',
        border: `1.5px solid ${bg}`,
        borderRadius: 14,
        boxShadow: '0 8px 32px rgba(16,28,54,0.18)',
        padding: '16px 20px',
        maxWidth: 380,
        minWidth: 260,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-18px) scale(0.97)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(.34,1.56,.64,1), opacity 0.25s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Coloured icon circle */}
      <span style={{
        background: bg,
        borderRadius: '50%',
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#fff',
      }}>
        <I n={iconN} s={18} c="#fff" />
      </span>

      {/* Message */}
      <div style={{ flex: 1, paddingTop: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 2 }}>
          {toast.k === 'ok' ? 'Success' : toast.k === 'warn' ? 'Warning' : 'Notice'}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.45 }}>{toast.t}</div>
      </div>

      {/* Dismiss button */}
      <button
        aria-label="Dismiss notification"
        onClick={() => { setVisible(false); setTimeout(onDone, 250); }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink-muted)',
          padding: 2,
          marginTop: 2,
          display: 'flex',
          flexShrink: 0,
        }}
      >
        <I n="xc" s={18} />
      </button>

      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        borderRadius: '0 0 14px 14px',
        background: bg,
        width: '100%',
        transformOrigin: 'left',
        animation: visible ? 'toast-shrink 3.8s linear forwards' : 'none',
      }} />

      <style>{`
        @keyframes toast-shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
