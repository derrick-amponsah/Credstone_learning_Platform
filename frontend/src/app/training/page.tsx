'use client';
import { useState } from 'react';
import Shell from '@/components/Shell';
import { Btn, ErrorBox, I, Loading, Pill } from '@/components/ui';
import { fmtDate, useApi } from '@/lib/api';

const COLORS = ['#111E38', '#C5A059', '#3B5FA8', '#4F7F5C', '#9AA3B2'];
export default function Training() {
  const [range, setRange] = useState('3m');
  const { data, error, loading } = useApi(`/training/overview?range=${range}`);
  const pts = (data?.series || []).map((s: any, i: number, a: any[]) => [95 + (i * 475) / Math.max(1, a.length - 1), 170 - (s.value / 100) * 150, s.label]);
  const C = 2 * Math.PI * 60;
  let off = 0;
  return (
    <Shell allow={['training_owner', 'admin']}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flex: 'none', gap: 16 }}>
            <div><h1 className="m-h1">Training overview</h1><div className="m-sub">See how learning is progressing and the impact it&apos;s making across your team.</div></div>
            <div className="m-row" style={{ gap: 10 }}>
              <div className="m-in" style={{ height: 46, padding: '0 8px 0 16px', fontWeight: 600, color: 'var(--navy)' }}>
                <select aria-label="Period" value={range} onChange={(e) => setRange(e.target.value)}>
                  <option value="1m">Last month</option>
                  <option value="3m">Last 3 months</option>
                  <option value="12m">Last 12 months</option>
                </select>
                <I n="chevd" />
              </div>
              <Btn kind="sec" onClick={() => window.open('/api/training/export/csv', '_blank')}>
                <I n="download" s={18} />&nbsp; Export CSV
              </Btn>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, flex: 'none' }}>
            {data.kpis.map((k: any) => <div key={k.label} className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><div className="m-sub" style={{ fontSize: 15 }}>{k.label}</div><div className="m-kpi">{k.value}</div>
              {k.delta !== null && <div className="m-up" style={k.delta < 0 ? { color: 'var(--required-ink)' } : undefined}><I n="trend" s={18} /> {k.delta > 0 ? '+' : ''}{k.delta}% <span style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>vs last month</span></div>}</div>)}
          </div>
          <div className="m-row" style={{ gap: 16, alignItems: 'stretch', flex: 'none', flexWrap: 'wrap' }}>
            <div className="m-card" style={{ flex: 1.15, minWidth: 380, display: 'flex', flexDirection: 'column' }}><h2 className="m-h3">Learning completion rate</h2>
              <svg viewBox="0 0 620 205" width="100%" role="img" aria-label="Learning completion rate by month">
                {[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1="56" x2="600" y1={170 - v * 1.5} y2={170 - v * 1.5} stroke="#E7E1D6" /><text x="48" y={175 - v * 1.5} textAnchor="end" fontSize="14" fill="#4B5563">{v}%</text></g>)}
                {pts.length > 1 && <><path d={`M${pts.map((p: any) => `${p[0]} ${p[1]}`).join(' L')} L${pts[pts.length - 1][0]} 170 L${pts[0][0]} 170Z`} fill="#EFE8D8" /><path d={`M${pts.map((p: any) => `${p[0]} ${p[1]}`).join(' L')}`} fill="none" stroke="#111E38" strokeWidth="3.5" /></>}
                {pts.map((p: any) => <g key={p[2]}><circle cx={p[0]} cy={p[1]} r="5" fill="#C5A059" stroke="#111E38" strokeWidth="2" /><text x={p[0]} y="198" textAnchor="middle" fontSize="14" fill="#4B5563">{p[2]}</text></g>)}
              </svg></div>
            <div className="m-card" style={{ flex: 1, minWidth: 380, display: 'flex', flexDirection: 'column' }}><h2 className="m-h3">Learning by category</h2>
              <div className="m-row" style={{ gap: 26, flex: 1, justifyContent: 'center' }}>
                <svg viewBox="0 0 160 160" width="150" height="150" style={{ flex: 'none' }} aria-hidden="true">
                  {data.categories.map((c: any, i: number) => { const len = (c.pct / 100) * C; const el = <circle key={c.name} r="60" cx="80" cy="80" fill="none" stroke={COLORS[i % 5]} strokeWidth="22" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} transform="rotate(-90 80 80)" />; off += len; return el; })}
                  <text x="80" y="76" textAnchor="middle" fontSize="12" fill="#4B5563">Total</text><text x="80" y="98" textAnchor="middle" fontFamily="Source Serif 4,Georgia,serif" fontSize="28" fontWeight="600" fill="#111E38">{data.learners}</text><text x="80" y="114" textAnchor="middle" fontSize="12" fill="#4B5563">learners</text></svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 200 }}>{data.categories.map((c: any, i: number) => <div key={c.name} className="m-row" style={{ gap: 10, fontSize: 15 }}><i style={{ width: 14, height: 14, borderRadius: 3, background: COLORS[i % 5], flex: 'none' }} /><span style={{ flex: 1 }}>{c.name}</span><b>{c.pct}%</b></div>)}</div>
              </div></div>
          </div>
          <div className="m-row" style={{ gap: 16, alignItems: 'stretch', flex: 1, flexWrap: 'wrap' }}>
            <div className="m-card" style={{ flex: 1.5, minWidth: 380, padding: '14px 16px', overflowX: 'auto' }}><div className="m-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><h2 className="m-h3">Recent learning activity</h2></div>
              <table className="m-tbl"><thead><tr><th>Learner</th><th>Course</th><th>Status</th><th>Updated</th></tr></thead><tbody>
                {data.recent.map((r: any, i: number) => <tr key={i}><td><b>{r.learner}</b></td><td>{r.course}</td><td><Pill k={r.status === 'completed' ? 'go' : ''}>{r.status === 'completed' ? 'Completed' : 'In progress'}</Pill></td><td>{fmtDate(r.at, { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>)}</tbody></table></div>
            <div className="m-card" style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}><div><h2 className="m-h3">Impact</h2><div className="m-sub" style={{ fontSize: 15 }}>Training is changing how people work</div></div>
              {data.impact.map((m: any) => <div key={m.label} className="m-row" style={{ gap: 14 }}><div className="m-kpi" style={{ fontSize: 28, minWidth: 92 }}>+{m.valuePct}%</div><div style={{ lineHeight: 1.25 }}><b style={{ color: 'var(--navy)' }}>{m.label}</b><div className="m-sub" style={{ fontSize: 15 }}>({m.basis})</div></div></div>)}</div>
          </div>
        </>
      )}
    </Shell>
  );
}
