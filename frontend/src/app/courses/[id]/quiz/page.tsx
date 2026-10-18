'use client';
import Link from 'next/link';
import { useState } from 'react';
import Shell from '@/components/Shell';
import { Alert, Bar, Btn, Disc, ErrorBox, Loading, Pill, Radio } from '@/components/ui';
import { api, useApi } from '@/lib/api';

export default function Quiz({ params }: { params: { id: string } }) {
  const { data, error, loading } = useApi(`/courses/${params.id}/quiz`);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const qs = data?.questions || [];
  const q = qs[i];
  async function finish() { try { setRes(await api(`/courses/${params.id}/quiz`, { body: { answers: ans } })); } catch (e: any) { setErr(e.message); } }
  return (
    <Shell back={{ href: `/courses/${params.id}`, label: 'Back to course' }}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <div className="m-row" style={{ gap: 18, flex: 'none' }}><Disc n="user" size={68} sand />
            <div><div className="m-row" style={{ gap: 10 }}><span className="m-sub" style={{ fontSize: 15 }}>Knowledge check · Recall quiz</span><Pill k="nv">Graded · {data.course.passMark}% to pass</Pill></div>
              <h1 className="m-h1" style={{ fontSize: 28 }}>{data.course.title}</h1><div className="m-sub">{data.course.objective}</div></div></div>
          <div className="m-tabs" style={{ flex: 'none' }}><Link className="m-tab" href={`/courses/${params.id}`}>Lesson</Link><Link className="m-tab" href={`/courses/${params.id}/practice`}>Practice</Link><span className="m-tab on">Assessment</span></div>
          <div className="m-row" style={{ gap: 18, alignItems: 'flex-start', flex: 1 }}>
            <div className="m-card" style={{ flex: 1, padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
              {res ? (
                <>
                  <Alert k={res.passed ? 'ok' : 'warn'}><b>{res.passed ? 'You passed.' : 'Not passed yet.'}</b> You scored {res.score}%. The pass mark is {res.passMark}%.{res.passed ? ' Your progress toward the credential is updated.' : ' Review the lessons and try again.'}</Alert>
                  {qs.map((x: any, n: number) => { const r = res.results.find((y: any) => y.questionId === x.id); return (
                    <div key={x.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}><div className="m-row" style={{ gap: 10 }}><Pill k={r?.correct ? 'go' : 'req'}>{r?.correct ? 'Correct' : 'Not quite'}</Pill><b style={{ color: 'var(--navy)' }}>{n + 1}. {x.prompt}</b></div>
                      {r?.explanation && <div className="m-sub" style={{ marginTop: 4 }}>{r.explanation}</div>}</div>); })}
                  <div className="m-row" style={{ justifyContent: 'space-between' }}><Btn kind="sec" href={`/courses/${params.id}`}>Back to course</Btn>{!res.passed && <Btn onClick={() => { setRes(null); setAns({}); setI(0); }}>Try again</Btn>}</div>
                </>
              ) : !q ? <Alert>This knowledge check has no questions yet.</Alert> : (
                <>
                  <div><div className="m-row" style={{ justifyContent: 'space-between', fontWeight: 600, color: 'var(--navy)', marginBottom: 8 }}><span>Question {i + 1} of {qs.length}</span><span>{i + 1}/{qs.length}</span></div><Bar pct={Math.round((100 * (i + 1)) / qs.length)} /></div>
                  <h2 className="m-h2" style={{ fontSize: 24, lineHeight: 1.3, marginTop: 6 }}>{q.prompt}</h2>
                  {err && <Alert k="warn">{err}</Alert>}
                  <div role="radiogroup" aria-label="Answers" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {q.options.map((o: any) => { const on = ans[q.id] === o.id; return (
                      <div key={o.id} className="m-row" onClick={() => setAns({ ...ans, [q.id]: o.id })} style={{ gap: 14, minHeight: 62, padding: '0 18px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${on ? 'var(--navy)' : 'var(--border)'}`, background: on ? 'var(--highlight)' : '#fff', fontWeight: on ? 700 : 400 }}>
                        <Radio on={on} onChange={() => setAns({ ...ans, [q.id]: o.id })} label={o.text} /><span style={{ fontWeight: 700, color: 'var(--navy)' }}>{o.label}</span><span>{o.text}</span></div>); })}
                  </div>
                  <div style={{ flex: 1 }} />
                  <div className="m-row" style={{ justifyContent: 'space-between' }}><Btn kind="sec" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Btn>
                    {i < qs.length - 1 ? <Btn style={{ minWidth: 110 }} disabled={!ans[q.id]} onClick={() => setI(i + 1)}>Next</Btn> : <Btn style={{ minWidth: 110 }} disabled={qs.some((x: any) => !ans[x.id])} onClick={finish}>Submit answers</Btn>}</div>
                </>
              )}
            </div>
            <div style={{ width: 260, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}><h2 className="m-h3">Assessment type</h2><div className="m-row" style={{ gap: 12 }}><Disc n="list" sand /><b style={{ color: 'var(--navy)', lineHeight: 1.2 }}>Multiple choice quiz</b></div><div className="m-sub" style={{ fontSize: 15 }}>Select the best answer from the options provided.</div></div>
              <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><h2 className="m-h3">Need help?</h2><div className="m-sub" style={{ fontSize: 15 }}>Review the lesson content or contact your instructor.</div><a className="m-link" href="mailto:support@credstone.com">Get help</a></div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
