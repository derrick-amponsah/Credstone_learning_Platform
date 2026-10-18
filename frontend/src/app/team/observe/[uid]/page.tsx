'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Av, Btn, ErrorBox, Field, I, Loading, TextArea } from '@/components/ui';
import { api, fmtDate, useApi } from '@/lib/api';

const OPTS: [string, string][] = [['not_seen', 'Not seen'], ['partly', 'Partly'], ['observed', 'Observed']];

export default function Observe({ params, searchParams }: { params: { uid: string }; searchParams: { courseId?: string } }) {
  const { data, error, loading } = useApi(`/team/observe/${params.uid}${searchParams.courseId ? `?courseId=${searchParams.courseId}` : ''}`);
  const router = useRouter();
  const [r, setR] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [err, setErr] = useState('');
  const items: string[] = data?.course.observationItems || [];
  async function save() {
    setErr('');
    if (items.some((_, i) => !r[i])) return setErr('Rate every item first.');
    try { await api(`/team/observe/${params.uid}`, { body: { courseId: data.course.id, ratings: items.map((_, i) => r[i]), notes, followUpOn: date || null } }); router.push('/team'); } catch (e: any) { setErr(e.message); }
  }
  return (
    <Shell back={{ href: '/team', label: 'Back to team' }} allow={['supervisor']}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <Head eye="Supervisor" title="Record an observation" sub="Observations are shared with the learner and the training owner." />
          {err && <Alert k="warn">{err}</Alert>}
          <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1 }}>
            <div className="m-card" style={{ flex: 1.4, minWidth: 0 }}>
              <div className="m-row" style={{ gap: 14 }}><Av t={data.learner.name.slice(-1)} size={52} bg="var(--info-bg)" fg="var(--info-ink)" /><div><h2 className="m-h3">{data.learner.name}</h2><div className="m-sub" style={{ fontSize: 15 }}>{data.course.title}{data.pendingSince ? ` · Observation pending since ${fmtDate(data.pendingSince, { day: 'numeric', month: 'short' })}` : ''}</div></div></div>
              <div style={{ margin: '16px 0 4px' }} className="m-sec">What did you observe at work?</div>
              {items.map((t, i) => <div key={i} className="m-row" style={{ gap: 14, padding: '12px 0', borderTop: i ? '1px solid var(--border)' : 0, flexWrap: 'wrap' }}><span style={{ flex: 1, color: 'var(--navy)', fontWeight: 600, minWidth: 200 }}>{t}</span>
                <div className="m-row" style={{ gap: 8 }} role="radiogroup" aria-label={t}>{OPTS.map(([k, l]) => { const on = r[i] === k; return <button key={k} role="radio" aria-checked={on} onClick={() => setR({ ...r, [i]: k })} className="m-pill" style={{ padding: '7px 14px', fontSize: 15, background: on ? 'var(--navy)' : '#fff', color: on ? 'var(--gold-soft)' : 'var(--ink)', border: `2px solid ${on ? 'var(--navy)' : 'var(--field-border)'}`, cursor: 'pointer', font: 'inherit', fontWeight: 700 }}>{l}</button>; })}</div></div>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
              <div className="m-card"><TextArea label="Notes" height={120} value={notes} onChange={(e: any) => setNotes(e.target.value)} /><div style={{ marginTop: 14 }}><Field label="Follow-up conversation" icon="calendar" type="date" value={date} onChange={(e: any) => setDate(e.target.value)} /></div></div>
              <div className="m-card" style={{ background: 'var(--info-bg)', borderColor: '#cfe0f6' }}><div className="m-row" style={{ gap: 10, fontSize: 15, alignItems: 'flex-start' }}><I n="info" /><span>This is one signal that {data.learner.name} can apply the training. It is not a judgement of their performance.</span></div></div>
              <Btn style={{ minHeight: 50 }} onClick={save}>Record observation</Btn><Btn kind="sec" href="/team">Cancel</Btn>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
