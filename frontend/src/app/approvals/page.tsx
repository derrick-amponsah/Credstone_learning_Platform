'use client';
import { useState } from 'react';
import Link from 'next/link';
import Shell, { Head } from '@/components/Shell';
import { Alert, Btn, Disc, ErrorBox, I, Ic, Loading, Pill, Empty } from '@/components/ui';
import { ago, fmtDate, useApi, api } from '@/lib/api';

export default function ApprovalsPage() {
  const { data, error, loading, reload } = useApi<{ awaiting: any[]; published: any[]; stats: any }>('/approvals');
  const [tab, setTab] = useState<'awaiting' | 'published'>('awaiting');
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [snapshotModalData, setSnapshotModalData] = useState<any | null>(null);

  const viewSnapshot = async (id: string) => {
    setLoadingSnapshot(true);
    try {
      const res = await api<any>(`/approvals/versions/${id}`);
      setSnapshotModalData(res);
      setSelectedSnapshot(id);
    } catch (e: any) {
      alert(e.message || 'Failed to load version snapshot');
    } finally {
      setLoadingSnapshot(false);
    }
  };

  return (
    <Shell allow={['training_owner']}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : (
        <>
          <Head
            eye="Approving Authority"
            title="Course Approvals &amp; Version Audit"
            sub="Review submitted course packages, verify measurable learning objectives, and publish immutable versions."
          >
            <Btn kind="sec" href="/training">
              <I n="chart" s={16} />&nbsp; Analytics Dashboard
            </Btn>
          </Head>

          {/* Metric Summary Cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 4, width: '100%' }}>
            <div
              className="m-card"
              style={{
                flex: 1,
                minWidth: 200,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                borderLeft: '4px solid var(--gold)',
              }}
            >
              <Disc n="clock" size={44} sand />
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>
                  {data?.stats?.awaitingCount ?? 0}
                </div>
                <div className="m-sub" style={{ fontSize: 14 }}>Awaiting Your Approval</div>
              </div>
            </div>

            <div
              className="m-card"
              style={{
                flex: 1,
                minWidth: 200,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                borderLeft: '4px solid var(--navy)',
              }}
            >
              <Disc n="layers" size={44} sand />
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)' }}>
                  {data?.stats?.publishedCount ?? 0}
                </div>
                <div className="m-sub" style={{ fontSize: 14 }}>Published Version Snapshots</div>
              </div>
            </div>

            <div
              className="m-card"
              style={{
                flex: 1,
                minWidth: 200,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                borderLeft: '4px solid var(--success-ink)',
              }}
            >
              <Disc n="checkc" size={44} sand />
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--success-ink)' }}>
                  100%
                </div>
                <div className="m-sub" style={{ fontSize: 14 }}>Measurable Quality Standard</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="m-row" style={{ gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
            <button
              type="button"
              onClick={() => setTab('awaiting')}
              className="m-link"
              style={{
                fontSize: 15,
                fontWeight: tab === 'awaiting' ? 700 : 500,
                color: tab === 'awaiting' ? 'var(--navy)' : 'var(--ink-muted)',
                borderBottom: tab === 'awaiting' ? '2px solid var(--navy)' : '2px solid transparent',
                paddingBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Courses Awaiting Approval</span>
              {!!data?.awaiting?.length && (
                <span
                  style={{
                    background: 'var(--gold)',
                    color: '#fff',
                    borderRadius: 12,
                    padding: '2px 8px',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {data.awaiting.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('published')}
              className="m-link"
              style={{
                fontSize: 15,
                fontWeight: tab === 'published' ? 700 : 500,
                color: tab === 'published' ? 'var(--navy)' : 'var(--ink-muted)',
                borderBottom: tab === 'published' ? '2px solid var(--navy)' : '2px solid transparent',
                paddingBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Published Version Snapshots &amp; Audit Log</span>
              <span
                style={{
                  background: 'var(--surface)',
                  color: 'var(--navy)',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {data?.published?.length ?? 0}
              </span>
            </button>
          </div>

          {/* TAB 1: Courses Awaiting Approval */}
          {tab === 'awaiting' && (
            <div>
              {!data?.awaiting?.length ? (
                <Empty
                  icon="checkc"
                  title="All caught up! No courses waiting for approval"
                  text="When instructors finish authoring and submit their drafts for review, they will appear here for your verification and one-click publishing."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {data.awaiting.map((c: any) => {
                    const hasMeasurableObj = c.objective && c.objective.trim().length > 10;
                    return (
                      <div
                        key={c.id}
                        className="m-card"
                        style={{
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                        }}
                      >
                        <div className="m-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                            <Disc n="file" sand size={44} />
                            <div>
                              <div className="m-row" style={{ gap: 8, alignItems: 'center' }}>
                                <h2 className="m-h3" style={{ margin: 0 }}>{c.title}</h2>
                                <Pill k="warn">v{c.version} (Draft)</Pill>
                                {c.requiresPractical && <Pill k="info">Practical Submission</Pill>}
                              </div>
                              <div className="m-sub" style={{ fontSize: 14, marginTop: 2 }}>
                                Authored by <b>{c.author || 'Instructor'}</b> · Submitted {ago(c.submittedAt)}
                              </div>
                            </div>
                          </div>
                          <Btn href={`/studio/${c.id}/review`}>
                            Review &amp; Approve
                          </Btn>
                        </div>

                        {/* Measurable Objective Preview */}
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 8,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            fontSize: 14,
                            lineHeight: 1.5,
                          }}
                        >
                          <div className="m-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Ic n="target" s={16} color="var(--navy)" /> Measurable Learning Objective:
                            </span>
                            {hasMeasurableObj ? (
                              <span style={{ color: 'var(--success-ink)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Ic n="checkc" s={14} color="var(--success-ink)" /> Measurable Standard Met
                              </span>
                            ) : (
                              <span style={{ color: 'var(--warning-ink)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Ic n="warn" s={14} color="var(--warning-ink)" /> Needs Measurable Objective
                              </span>
                            )}
                          </div>
                          <div style={{ color: c.objective ? 'var(--ink)' : 'var(--ink-muted)', fontStyle: c.objective ? 'normal' : 'italic' }}>
                            {c.objective || 'No objective set by instructor. Approval cannot be granted until an objective is defined.'}
                          </div>
                        </div>

                        {/* Contents summary tags */}
                        <div className="m-row" style={{ gap: 16, fontSize: 13, color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
                          <span><I n="book" s={14} />&nbsp; {c.lessonsCount} lessons configured</span>
                          <span><I n="award" s={14} />&nbsp; {c.questionsCount} knowledge questions</span>
                          {c.requiresPractical ? (
                            <span style={{ color: 'var(--navy)', fontWeight: 600 }}>
                              <I n="checkc" s={14} />&nbsp; {c.rubricCount} rubric evaluation criteria
                            </span>
                          ) : (
                            <span>Quiz-only evaluation</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Published Version Snapshots & Audit Log */}
          {tab === 'published' && (
            <div>
              {!data?.published?.length ? (
                <Empty
                  icon="layers"
                  title="No published course versions yet"
                  text="When you approve submitted courses, an immutable snapshot of their lessons, quiz questions, and rubric will be saved into the version archive."
                />
              ) : (
                <div className="m-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', color: 'var(--navy)', fontWeight: 600 }}>Course Title</th>
                        <th style={{ padding: '12px 16px', color: 'var(--navy)', fontWeight: 600 }}>Version</th>
                        <th style={{ padding: '12px 16px', color: 'var(--navy)', fontWeight: 600 }}>Approved By</th>
                        <th style={{ padding: '12px 16px', color: 'var(--navy)', fontWeight: 600 }}>Published Date</th>
                        <th style={{ padding: '12px 16px', color: 'var(--navy)', fontWeight: 600 }}>Archived Contents</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--navy)', fontWeight: 600 }}>Snapshot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.published.map((v: any, i: number) => (
                        <tr key={v.id} style={{ borderTop: i ? '1px solid var(--border)' : 0 }}>
                          <td style={{ padding: '12px 16px' }}>
                            <b style={{ color: 'var(--navy)' }}>{v.title}</b>
                            {v.objective && (
                              <div className="m-sub" style={{ fontSize: 12, marginTop: 2, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {v.objective}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Pill k="go">v{v.version}</Pill>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--navy)' }}>
                            {v.approvedBy || 'Training Owner'}
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--ink-muted)' }}>
                            {fmtDate(v.approvedAt, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div className="m-sub" style={{ fontSize: 13, display: 'flex', gap: 10 }}>
                              <span>{v.lessonsCount ?? 0} lessons</span>
                              <span>·</span>
                              <span>{v.questionsCount ?? 0} questions</span>
                              <span>·</span>
                              <span>{v.rubricCount ?? 0} rubric</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <Btn kind="sec sm" onClick={() => viewSnapshot(v.id)}>
                              Inspect Snapshot
                            </Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Snapshot Inspector Modal */}
          {snapshotModalData && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(16, 28, 54, 0.65)',
                zIndex: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
              }}
              onClick={() => setSnapshotModalData(null)}
            >
              <div
                className="m-card"
                style={{
                  width: '100%',
                  maxWidth: 720,
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: '#fff',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="m-row"
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 10,
                  }}
                >
                  <div>
                    <h2 className="m-h3" style={{ margin: 0 }}>
                      Immutable Snapshot · v{snapshotModalData.version}
                    </h2>
                    <div className="m-sub" style={{ fontSize: 13 }}>
                      Approved by {snapshotModalData.approvedByName || 'Training Owner'} on {fmtDate(snapshotModalData.approvedAt)}
                    </div>
                  </div>
                  <button type="button" className="m-link" onClick={() => setSnapshotModalData(null)} style={{ fontSize: 22 }}>
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <b style={{ color: 'var(--navy)', fontSize: 14 }}>Course Title &amp; Objective:</b>
                    <div style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, marginTop: 4, fontSize: 14 }}>
                      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{snapshotModalData.title}</div>
                      <div className="m-sub" style={{ marginTop: 2 }}>{snapshotModalData.objective || 'No objective specified.'}</div>
                    </div>
                  </div>

                  {snapshotModalData.snapshot?.lessons && (
                    <div>
                      <b style={{ color: 'var(--navy)', fontSize: 14 }}>
                        Archived Lessons ({snapshotModalData.snapshot.lessons.length}):
                      </b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                        {snapshotModalData.snapshot.lessons.map((l: any) => (
                          <div key={l.id} className="m-row" style={{ justifyContent: 'space-between', padding: '6px 10px', background: 'var(--surface)', borderRadius: 6, fontSize: 13 }}>
                            <span>Lesson {l.position}: <b>{l.title}</b> ({l.minutes || 5}m)</span>
                            <span className="m-sub">{l.videoUrl ? 'Video included' : 'Text-only'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {snapshotModalData.snapshot?.questions && (
                    <div>
                      <b style={{ color: 'var(--navy)', fontSize: 14 }}>
                        Archived Questions ({snapshotModalData.snapshot.questions.length}):
                      </b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                        {snapshotModalData.snapshot.questions.map((q: any, i: number) => (
                          <div key={q.id || i} style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 6, fontSize: 13 }}>
                            <b>Q{i + 1}: {q.prompt}</b>
                            <div className="m-sub" style={{ marginTop: 2 }}>
                              Options: {q.options?.map((o: any) => `${o.label}: ${o.text}${o.isCorrect ? ' (✓)' : ''}`).join(' | ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {snapshotModalData.snapshot?.rubric && snapshotModalData.snapshot.rubric.length > 0 && (
                    <div>
                      <b style={{ color: 'var(--navy)', fontSize: 14 }}>
                        Archived Practical Rubric ({snapshotModalData.snapshot.rubric.length} criteria):
                      </b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                        {snapshotModalData.snapshot.rubric.map((r: any, i: number) => (
                          <div key={r.id || i} style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 6, fontSize: 13 }}>
                            <b>Criterion #{i + 1}: {r.title}</b>
                            <div className="m-sub" style={{ marginTop: 2 }}>{r.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="m-row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                  <Btn kind="sec" onClick={() => setSnapshotModalData(null)}>
                    Close Snapshot
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
