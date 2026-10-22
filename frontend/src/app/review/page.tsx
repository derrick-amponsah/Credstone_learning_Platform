'use client';
import { useEffect, useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Av, Btn, ErrorBox, I, Loading, Pill, Radio, TextArea } from '@/components/ui';
import { api, ago, useApi } from '@/lib/api';

const OPTS: [string, string][] = [['not_yet', 'Not yet'], ['partly', 'Partly'], ['meets', 'Meets']];

export default function ReviewQueue() {
  const queue = useApi<any[]>('/assess/queue');
  const [sel, setSel] = useState<string | null>(null);
  const detail = useApi(sel ? `/assess/submissions/${sel}` : null);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [fb, setFb] = useState('');
  const [msg, setMsg] = useState<any>(null);
  useEffect(() => { if (!sel && queue.data?.length) setSel(queue.data[0].id); }, [queue.data, sel]);
  useEffect(() => { setRatings({}); setFb(''); setMsg(null); }, [sel]);
  const d = detail.data;
  async function send(outcome: 'met' | 'resubmit') {
    setMsg(null);
    try { await api(`/assess/submissions/${sel}/review`, { body: { ratings, feedback: fb, outcome } }); setSel(null); await queue.reload(); setMsg({ k: 'ok', t: outcome === 'met' ? 'Feedback returned. The learner has been notified.' : 'Resubmission requested.' }); }
    catch (e: any) { setMsg({ k: 'warn', t: e.message }); }
  }
  return (
    <Shell allow={['assessor']}>
      <Head eye="Assessor" title="Review submissions" sub="Grade practical work against the rubric and give actions the learner can use." />
      {msg && <Alert k={msg.k}>{msg.t}</Alert>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start', flex: 1, width: '100%', minWidth: 0 }}>
        <div className="m-card" style={{ width: 320, flex: '0 0 320px', maxWidth: '100%', paddingBottom: 0, overflow: 'hidden' }}><h2 className="m-h3" style={{ marginBottom: 6 }}>Waiting for review</h2>
          {queue.loading ? <Loading /> : queue.error ? <ErrorBox error={queue.error} /> : !queue.data?.length ? <div className="m-sub" style={{ padding: '8px 0 18px' }}>Nothing is waiting. New submissions will appear here.</div> : <div style={{ margin: '0 -18px' }}>
            {queue.data.map((s: any, i: number) => <button key={s.id} onClick={() => setSel(s.id)} className="m-row row-link" style={{ gap: 12, padding: '12px 14px', borderTop: i ? '1px solid var(--border)' : 0, width: '100%', border: 0, borderLeft: sel === s.id ? '4px solid var(--navy)' : '4px solid transparent', background: sel === s.id ? 'var(--highlight)' : 'none', textAlign: 'left', font: 'inherit' }}>
              <Av t={s.label.slice(-1)} size={40} bg="var(--sand)" fg="var(--navy)" /><div style={{ flex: 1, minWidth: 0 }}><b style={{ color: 'var(--navy)' }}>{s.label}</b><div className="m-sub" style={{ fontSize: 14 }}>{s.course} · {ago(s.submittedAt)}</div></div><Pill k={s.isNew ? 'info' : 'warn'}>{s.isNew ? 'New' : 'Due soon'}</Pill></button>)}</div>}
        </div>
        {sel && (detail.loading ? <Loading /> : detail.error ? <ErrorBox error={detail.error} /> : d && (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: '1 1 480px', minWidth: 0, maxWidth: '100%' }}>
            <div className="m-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 240px', minWidth: 0 }}>
                  <Av t={(queue.data?.find((x: any) => x.id === sel)?.label || 'L').slice(-1)} size={48} bg="var(--sand)" fg="var(--navy)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 className="m-h3" style={{ margin: 0 }}>{queue.data?.find((x: any) => x.id === sel)?.label}</h2>
                    <div className="m-sub" style={{ fontSize: 15 }}>Practical task · {d.submission.course}</div>
                  </div>
                </div>
                {d.submission.fileName && (
                  <a className="m-btn sec sm" href={`/api/assess/submissions/${sel}/file`} style={{ flexShrink: 0, marginLeft: 'auto' }}>
                    <I n="download" s={16} />&nbsp; {d.submission.fileName}
                  </a>
                )}
              </div>
              <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', lineHeight: 1.5 }}>{d.submission.excerpt ? `“${d.submission.excerpt}”` : d.submission.link ? <a className="m-link" href={d.submission.link} target="_blank" rel="noreferrer">{d.submission.link}</a> : 'Open the attached file to review the work.'}{d.submission.notes && <div className="m-sub" style={{ marginTop: 8 }}>Learner note: {d.submission.notes}</div>}</div></div>
            <div className="m-card" style={{ paddingBottom: 6 }}>
              <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h2 className="m-h3" style={{ margin: 0 }}>Evaluation Rubric</h2>
                <span className="m-sub" style={{ fontSize: 13, fontWeight: 600 }}>
                  {Object.keys(ratings).length} of {d.rubric.length} rated
                </span>
              </div>
              {d.rubric.map((r: any, idx: number) => <div key={r.id} style={{ padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ color: 'var(--navy)', fontSize: 15 }}>{r.title ? r.title : `Criterion #${idx + 1}`}</b>
                  {ratings[r.id] && (
                    <Pill k={ratings[r.id] === 'meets' ? 'go' : ratings[r.id] === 'partly' ? 'warn' : 'req'}>
                      {ratings[r.id] === 'meets' ? 'Meets Standard' : ratings[r.id] === 'partly' ? 'Partly Met' : 'Not Yet'}
                    </Pill>
                  )}
                </div>
                {r.text && <div className="m-sub" style={{ fontSize: 13, margin: '2px 0 8px' }}>{r.text}</div>}
                <div className="m-row" style={{ gap: 10, marginTop: 4, flexWrap: 'wrap' }} role="radiogroup" aria-label={r.title || r.text}>{OPTS.map(([k, l]) => { const on = ratings[r.id] === k; return (
                  <div key={k} onClick={() => setRatings({ ...ratings, [r.id]: k })} style={{ flex: '1 1 120px', minWidth: 0, padding: '10px 12px', border: `2px solid ${on ? 'var(--navy)' : 'var(--border)'}`, borderRadius: 8, background: on ? 'var(--highlight)' : '#fff', fontSize: 15, fontWeight: on ? 700 : 400, color: on ? 'var(--navy)' : undefined, cursor: 'pointer' }}><div className="m-row" style={{ gap: 8 }}><Radio on={on} label={l} onChange={() => setRatings({ ...ratings, [r.id]: k })} />{l}</div></div>); })}</div></div>)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: '1 1 300px', minWidth: 0, maxWidth: '100%' }}>
            <TextArea label="Written feedback" height={150} value={fb} onChange={(e: any) => setFb(e.target.value)} placeholder="Say what worked and one action the learner can take." />
            <Btn onClick={() => send('met')}>Return feedback: met with notes</Btn><Btn kind="sec" onClick={() => send('resubmit')}>Request resubmission</Btn>
            <div className="m-card" style={{ background: 'var(--info-bg)', borderColor: '#cfe0f6' }}><div className="m-row" style={{ gap: 10, fontSize: 15 }}><I n="info" /><span>Resubmissions are free. Reassessment follows your reassessment rule.</span></div></div>
          </div></>))}
      </div>
    </Shell>
  );
}
