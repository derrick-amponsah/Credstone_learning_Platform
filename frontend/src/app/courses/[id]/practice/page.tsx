'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Bar, Btn, Disc, ErrorBox, I, Ic, Loading, Pill, Radio } from '@/components/ui';
import { api, useApi } from '@/lib/api';

export default function Practice({ params, searchParams }: { params: { id: string }; searchParams: { s?: string } }) {
  const list = useApi<any[]>(`/courses/${params.id}/scenarios`);
  const sid = searchParams.s || list.data?.[0]?.id;
  const sc = useApi(sid ? `/scenarios/${sid}` : null);
  const router = useRouter();
  const [choice, setChoice] = useState('');
  const [res, setRes] = useState<any>(null);
  const [hint, setHint] = useState(false);
  const s = sc.data;
  async function submit() { setRes(await api(`/scenarios/${sid}/decide`, { body: { choice } })); }
  const again = () => { setRes(null); setChoice(''); setHint(false); if (s.nextId) router.push(`/courses/${params.id}/practice?s=${s.nextId}`); else router.push(`/courses/${params.id}/practice?s=${list.data![0].id}`); };
  return (
    <Shell back={{ href: `/courses/${params.id}`, label: 'Back to course' }}>
      {list.loading || sc.loading ? <Loading /> : list.error || sc.error ? <ErrorBox error={list.error || sc.error} /> : !s ? <ErrorBox error={{ message: 'This course has no practice scenarios yet.' }} /> : res ? (
        <>
          <div className="m-row" style={{ justifyContent: 'space-between', flex: 'none' }}><div><div className="m-eye">Scenario {s.position} of {s.total} · Feedback</div><h1 className="m-h1">{s.title}</h1></div><Pill k="info">Practice, not graded</Pill></div>
          <div className="m-card m-row" style={{ gap: 16, flex: 'none' }}><span className="m-disc" style={{ width: 48, height: 48, background: 'var(--navy)', color: 'var(--gold-soft)' }}><I n="check" s={26} /></span>
            <div style={{ flex: 1 }}><div className="m-sub" style={{ fontSize: 14 }}>Your decision</div><b style={{ color: 'var(--navy)', fontSize: 18 }}>{res.chosen.key}. {res.chosen.text}</b></div>{res.strong && <Pill k="go">Strong choice</Pill>}</div>
          <div className="m-row" style={{ gap: 18, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div className="m-card" style={{ flex: 1, minWidth: 260, borderTop: '6px solid var(--success-ink)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="m-row" style={{ gap: 10, color: 'var(--success-ink)' }}><I n="checkc" s={26} /><h2 className="m-h3" style={{ color: 'var(--success-ink)' }}>What you did well</h2></div>
              {res.well.map((t: string) => <div key={t} className="m-row" style={{ gap: 10, alignItems: 'flex-start' }}><Ic n="check" s={18} color="var(--success-ink)" /><span>{t}</span></div>)}</div>
            <div className="m-card" style={{ flex: 1, minWidth: 260, borderTop: '6px solid var(--gold)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="m-row" style={{ gap: 10, color: 'var(--warning-ink)' }}><I n="flag" s={26} /><h2 className="m-h3" style={{ color: 'var(--warning-ink)' }}>What needs work</h2></div>
              {res.work.map((t: string) => <div key={t} className="m-row" style={{ gap: 10, alignItems: 'flex-start' }}><Ic n="arrow" s={18} color="var(--warning-ink)" /><span>{t}</span></div>)}</div>
            <div className="m-card" style={{ width: 380, maxWidth: '100%', flex: 'none', background: 'var(--highlight)', borderColor: '#e6d9b8', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="m-h3">What next?</h2><div className="m-sub">Try a different version of this scenario, or go to the formal assessment when you feel ready.</div><div style={{ flex: 1 }} />
              <Btn onClick={again}><I n="refresh" s={18} />&nbsp; Try a variation</Btn><Btn kind="sec" href={`/courses/${params.id}/quiz`} style={{ background: '#fff' }}>Go to formal assessment</Btn>
              <div className="m-hint" style={{ color: 'var(--highlight-ink)' }}>Practice results are never shown to your supervisor.</div></div>
          </div>
        </>
      ) : (
        <>
          <div className="m-row" style={{ justifyContent: 'space-between', flex: 'none' }}><div className="m-row" style={{ gap: 16 }}><b style={{ color: 'var(--navy)', fontSize: 18 }}>Scenario {s.position} of {s.total}</b><Bar pct={Math.round((100 * s.position) / s.total)} style={{ width: 220 }} /></div><Pill k="info">Practice, not graded</Pill></div>
          <div style={{ maxWidth: 1000, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="m-card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="m-row" style={{ gap: 14 }}><Disc n="user" size={56} sand /><div><div className="m-eye">Scenario</div><h2 className="m-h2">{s.title}</h2></div></div>
              <div style={{ fontSize: 19, lineHeight: 1.5 }}>{s.body}</div>
              <div role="radiogroup" aria-label="Your decision" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s.options.map((o: any) => (
                  <div key={o.key} className="m-row" onClick={() => setChoice(o.key)} style={{ gap: 14, minHeight: 70, padding: '0 20px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${choice === o.key ? 'var(--navy)' : 'var(--border)'}`, background: choice === o.key ? 'var(--highlight)' : '#fff' }}>
                    <Radio on={choice === o.key} onChange={() => setChoice(o.key)} label={`${o.key}. ${o.text}`} /><b style={{ color: 'var(--navy)' }}>{o.key}</b><span>{o.text}</span></div>))}
              </div>
              {hint && <div className="m-alert info"><I n="bulb" s={22} /><div>Think about what you can see, the effect it has on others, and what would help.</div></div>}
            </div>
            <div className="m-row" style={{ justifyContent: 'space-between' }}>
              <div className="m-row" style={{ gap: 8, color: 'var(--ink-muted)' }}><I n="info" />{choice ? 'Ready to submit.' : 'Choose an option to continue.'}</div>
              <div className="m-row" style={{ gap: 12 }}><Btn kind="sec" onClick={() => setHint(true)}><I n="bulb" s={18} />&nbsp; Show a hint</Btn><Btn disabled={!choice} onClick={submit}>Submit decision</Btn></div></div>
          </div>
        </>
      )}
    </Shell>
  );
}
