'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Av, Btn, ErrorBox, I, Ic, Loading, Pill } from '@/components/ui';
import { api, fmtDate, initials, useApi } from '@/lib/api';

export default function Review({ params }: { params: { id: string } }) {
  const { data, error, loading, reload } = useApi(`/studio/courses/${params.id}/review`);
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState<any>(null);
  const act = async (fn: () => Promise<any>, then?: () => void) => { setMsg(null); try { await fn(); then ? then() : reload(); } catch (e: any) { setMsg({ k: 'warn', t: e.message }); } };
  return (
    <Shell allow={['training_owner']} back={{ href: '/approvals', label: 'Back to Approvals' }}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <Head eye="Review · Training owner" title={`${data.course.title}, version ${data.course.version}`} sub={`Submitted by ${data.author?.name ?? 'the editor'}${data.author ? ' · ' + fmtDate(data.author.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`}>
            <Pill k={data.course.status === 'in_review' ? 'warn' : 'go'}>{data.course.status === 'in_review' ? 'Awaiting approval' : 'Not in review'}</Pill></Head>
          {msg && <Alert k={msg.k}>{msg.t}</Alert>}
          <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1 }}>
            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              {/* Course Objective Card */}
              <div className="m-card" style={{ border: '1px solid var(--border)' }}>
                <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div className="m-row" style={{ gap: 8, alignItems: 'center' }}>
                    <Ic n="target" s={20} color="var(--navy)" />
                    <h2 className="m-h3" style={{ margin: 0 }}>Course Objective</h2>
                  </div>
                  {data.course.objective && data.course.objective.trim().length > 10 ? (
                    <Pill k="go">Verified Measurable</Pill>
                  ) : (
                    <Pill k="warn">Objective Not Measurable</Pill>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: 'var(--ink)',
                    background: 'var(--surface)',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                  }}
                >
                  {data.course.objective || 'No objective has been defined by the author.'}
                </div>
              </div>

              {/* Practical Task & Rubric (if configured) */}
              {data.course.requiresPractical && (
                <div className="m-card" style={{ border: '1px solid var(--border)' }}>
                  <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div className="m-row" style={{ gap: 8, alignItems: 'center' }}>
                      <Ic n="award" s={20} color="var(--navy)" />
                      <h2 className="m-h3" style={{ margin: 0 }}>Practical Task &amp; Evaluation Rubric</h2>
                    </div>
                    {data.rubricCriteria?.length > 0 ? (
                      <Pill k="go">{data.rubricCriteria.length} Criteria Defined</Pill>
                    ) : (
                      <Pill k="warn">Missing Rubric</Pill>
                    )}
                  </div>
                  <div className="m-sub" style={{ fontSize: 13, marginBottom: 8 }}>
                    Task Instructions for Learner:
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, marginBottom: 12 }}>
                    {data.course.taskPrompt || 'No prompt provided.'}
                  </div>
                  {data.rubricCriteria?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="m-sub" style={{ fontSize: 13, fontWeight: 600 }}>Rubric Criteria to be Assessed:</div>
                      {data.rubricCriteria.map((r: any, idx: number) => (
                        <div key={r.id || idx} style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 6, fontSize: 13 }}>
                          <b>#{idx + 1}. {r.title}</b>
                          <div className="m-sub" style={{ marginTop: 2 }}>{r.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="m-card"><h2 className="m-h3">Approval checklist</h2>
                <div style={{ marginTop: 6 }}>{data.checklist.map((c: any) => <div key={c.label} className="m-row" style={{ gap: 12, padding: '11px 0', borderTop: '1px solid var(--border)' }}><Ic n={c.done ? 'checkc' : 'warn'} s={24} color={c.done ? 'var(--success-ink)' : 'var(--warning-ink)'} /><span style={{ flex: 1 }}>{c.label}</span><Pill k={c.done ? 'go' : 'warn'}>{c.done ? 'Done' : 'Open'}</Pill></div>)}</div></div>
              <div className="m-card"><h2 className="m-h3">Comments</h2>
                {data.comments.map((c: any, i: number) => <div key={i} className="m-row" style={{ gap: 12, marginTop: 10, alignItems: 'flex-start' }}><Av t={initials(c.author)} size={40} bg="var(--sand)" fg="var(--navy)" /><div><b style={{ color: 'var(--navy)' }}>{c.author}</b><div>{c.body}</div></div></div>)}
                <div className="m-in" style={{ marginTop: 12 }}><input aria-label="Add a comment" placeholder="Add a comment for the editor..." value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) act(() => api(`/studio/courses/${params.id}/comments`, { body: { body: comment } }), () => { setComment(''); reload(); }); }} /></div></div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <div className="m-card"><h2 className="m-h3">Provenance recorded on publish</h2>
                {[['file', 'Sources', `${data.provenance.sources.n} documents, ${data.provenance.sources.ok === data.provenance.sources.n ? 'all approved' : 'some not approved'}`], ['spark', 'Model-assisted', data.provenance.ai ? `${data.provenance.ai} questions drafted by AI, accepted by a person` : 'No AI-drafted content'], ['checkc', 'Approvals', 'Your approval is recorded with the version']].map(([ic, t, s]) => <div key={t} className="m-row" style={{ gap: 12, padding: '9px 0', borderTop: '1px solid var(--border)' }}><Ic n={ic} color="var(--navy)" /><div style={{ flex: 1 }}><b style={{ color: 'var(--navy)' }}>{t}</b><div className="m-sub" style={{ fontSize: 14 }}>{s}</div></div></div>)}</div>
              <div className="m-card"><h2 className="m-h3">Decision</h2><div className="m-sub" style={{ fontSize: 15, margin: '4px 0 12px' }}>Approving snapshots and publishes this version. Returning sends your comments to the editor.</div>
                <div className="m-row" style={{ gap: 12 }}>
                  <Btn kind="sec" style={{ flex: 1 }} disabled={data.course.status !== 'in_review'} onClick={() => act(() => api(`/studio/courses/${params.id}/return`, { body: { comment: comment || data.comments[0]?.body || '' } }), () => router.push('/approvals'))}>Return with comments</Btn>
                  <Btn style={{ flex: 1 }} disabled={!data.canApprove || data.course.status !== 'in_review'} onClick={() => act(() => api(`/studio/courses/${params.id}/approve`, { body: {} }), () => router.push('/approvals'))}>Approve and publish</Btn></div>
                {!data.canApprove && <div className="m-hint" style={{ marginTop: 8 }}>Approve unlocks once every checklist item is done, including the AI check.</div>}</div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
