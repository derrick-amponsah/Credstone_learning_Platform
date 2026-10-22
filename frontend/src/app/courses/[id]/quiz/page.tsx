'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import Shell from '@/components/Shell';
import { Alert, Bar, Btn, Disc, ErrorBox, Ic, Loading, Pill, Radio } from '@/components/ui';
import { api, useApi } from '@/lib/api';

export default function Quiz({ params }: { params: { id: string } }) {
  const { data, error, loading } = useApi(`/courses/${params.id}/quiz`);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);

  // Quiz Timing Setup
  const timeLimitMinutes = data?.course?.quizTimeLimitMinutes ?? 10;
  const initialSeconds = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : 0;
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize time when course data arrives
  useEffect(() => {
    if (data?.course?.quizTimeLimitMinutes !== undefined) {
      const secs = data.course.quizTimeLimitMinutes > 0 ? data.course.quizTimeLimitMinutes * 60 : 0;
      setTimeLeft(secs);
    }
  }, [data?.course?.quizTimeLimitMinutes]);

  // Countdown Interval
  useEffect(() => {
    if (res || initialSeconds === 0 || loading || !data) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeExpired(true);
          autoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [res, initialSeconds, loading, data]);

  const qs = data?.questions || [];
  const q = qs[i];

  async function submitQuiz(answersToSubmit = ans) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr('');
    try {
      const result = await api(`/courses/${params.id}/quiz`, { body: { answers: answersToSubmit } });
      setRes(result);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (e: any) {
      setErr(e.message || 'Failed to submit quiz.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function autoSubmit() {
    submitQuiz();
  }

  function handleRetry() {
    setRes(null);
    setAns({});
    setI(0);
    setErr('');
    setTimeExpired(false);
    const secs = timeLimitMinutes > 0 ? timeLimitMinutes * 60 : 0;
    setTimeLeft(secs);
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isLowTime = timeLimitMinutes > 0 && timeLeft <= 60 && !res;

  return (
    <Shell back={{ href: `/courses/${params.id}`, label: 'Back to course' }}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : (
        <>
          <div className="m-row" style={{ gap: 18, flex: 'none' }}>
            <Disc n="user" size={68} sand />
            <div>
              <div className="m-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <span className="m-sub" style={{ fontSize: 15 }}>Knowledge check · Graded assessment</span>
                <Pill k="nv">Pass mark: {data.course.passMark}%</Pill>
                {timeLimitMinutes > 0 && (
                  <Pill k={isLowTime ? 'req' : 'go'}>
                    ⏳ {timeLimitMinutes} min time limit
                  </Pill>
                )}
              </div>
              <h1 className="m-h1" style={{ fontSize: 28, marginTop: 4 }}>{data.course.title}</h1>
              <div className="m-sub">{data.course.objective}</div>
            </div>
          </div>

          <div className="m-tabs" style={{ flex: 'none' }}>
            <Link className="m-tab" href={`/courses/${params.id}`}>Lesson</Link>
            <Link className="m-tab" href={`/courses/${params.id}/practice`}>Practice</Link>
            <span className="m-tab on">Assessment</span>
          </div>

          <div className="m-row" style={{ gap: 18, alignItems: 'flex-start', flex: 1 }}>
            <div
              className="m-card"
              style={{
                flex: 1,
                padding: '24px 26px',
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                minWidth: 0,
              }}
            >
              {timeExpired && !res && (
                <Alert k="warn">
                  <b>Time is up!</b> Submitting your answers automatically...
                </Alert>
              )}

              {res ? (
                <>
                  <Alert k={res.passed ? 'ok' : 'warn'}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <b style={{ fontSize: 16 }}>
                        {res.passed ? '🎉 Congratulations, you passed!' : '⚠️ Did not meet the pass mark.'}
                      </b>
                      <div>
                        You scored <b>{res.score}%</b>. The passing threshold set by the instructor is <b>{res.passMark}%</b>.
                        {res.passed
                          ? ' Your achievement has been recorded toward credential completion.'
                          : ' You did not achieve the required pass mark. Review the explanations below and retry the quiz.'}
                      </div>
                    </div>
                  </Alert>

                  {qs.map((x: any, n: number) => {
                    const r = res.results.find((y: any) => y.questionId === x.id);
                    return (
                      <div key={x.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                        <div className="m-row" style={{ gap: 10, alignItems: 'flex-start' }}>
                          <Pill k={r?.correct ? 'go' : 'req'}>
                            {r?.correct ? 'Correct' : 'Incorrect'}
                          </Pill>
                          <div style={{ flex: 1 }}>
                            <b style={{ color: 'var(--navy)' }}>
                              {n + 1}. {x.prompt}
                            </b>
                            {r?.explanation && (
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 14,
                                  padding: '8px 12px',
                                  borderRadius: 6,
                                  background: 'var(--surface)',
                                  borderLeft: '3px solid var(--border)',
                                }}
                              >
                                <b>Explanation:</b> {r.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="m-row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                    <Btn kind="sec" href={`/courses/${params.id}`}>
                      Back to course
                    </Btn>
                    {!res.passed && (
                      <Btn onClick={handleRetry} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Ic n="refresh" s={16} />
                        Retry Quiz
                      </Btn>
                    )}
                    {res.passed && (
                      <Btn href={`/courses/${params.id}`}>
                        Complete & Return
                      </Btn>
                    )}
                  </div>
                </>
              ) : !q ? (
                <Alert>This knowledge check has no questions yet.</Alert>
              ) : (
                <>
                  {/* Question header & progress bar */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 600,
                        color: 'var(--navy)',
                        marginBottom: 8,
                      }}
                    >
                      <span>Question {i + 1} of {qs.length}</span>
                      {timeLimitMinutes > 0 && (
                        <span style={{ color: isLowTime ? 'var(--required-ink)' : 'inherit', fontWeight: 700 }}>
                          ⏱ {formatTime(timeLeft)}
                        </span>
                      )}
                    </div>
                    <Bar pct={Math.round((100 * (i + 1)) / qs.length)} />
                  </div>

                  <h2 className="m-h2" style={{ fontSize: 24, lineHeight: 1.3, marginTop: 6 }}>
                    {q.prompt}
                  </h2>

                  {err && <Alert k="warn">{err}</Alert>}

                  <div role="radiogroup" aria-label="Answers" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {q.options.map((o: any) => {
                      const on = ans[q.id] === o.id;
                      return (
                        <div
                          key={o.id}
                          className="m-row"
                          onClick={() => setAns({ ...ans, [q.id]: o.id })}
                          style={{
                            gap: 14,
                            minHeight: 62,
                            padding: '0 18px',
                            borderRadius: 10,
                            cursor: 'pointer',
                            border: `2px solid ${on ? 'var(--navy)' : 'var(--border)'}`,
                            background: on ? 'var(--highlight)' : '#fff',
                            fontWeight: on ? 700 : 400,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Radio on={on} onChange={() => setAns({ ...ans, [q.id]: o.id })} label={o.text} />
                          <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{o.label}</span>
                          <span>{o.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ flex: 1 }} />

                  <div className="m-row" style={{ justifyContent: 'space-between', paddingTop: 10 }}>
                    <Btn kind="sec" disabled={i === 0} onClick={() => setI(i - 1)}>
                      Previous
                    </Btn>

                    {i < qs.length - 1 ? (
                      <Btn style={{ minWidth: 110 }} disabled={!ans[q.id]} onClick={() => setI(i + 1)}>
                        Next
                      </Btn>
                    ) : (
                      <Btn
                        style={{ minWidth: 130 }}
                        disabled={qs.some((x: any) => !ans[x.id]) || isSubmitting}
                        onClick={() => submitQuiz()}
                      >
                        {isSubmitting ? 'Evaluating...' : 'Submit answers'}
                      </Btn>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sidebar info & Live Timer */}
            <div style={{ width: 270, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Live Countdown Clock Widget */}
              {timeLimitMinutes > 0 && !res && (
                <div
                  className="m-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    textAlign: 'center',
                    border: isLowTime ? '2px solid var(--required-ink)' : '1px solid var(--border)',
                    background: isLowTime ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface)',
                  }}
                >
                  <div className="m-sub" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Time Remaining
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      color: isLowTime ? 'var(--required-ink)' : 'var(--navy)',
                      lineHeight: 1,
                    }}
                  >
                    {formatTime(timeLeft)}
                  </div>
                  <div className="m-sub" style={{ fontSize: 12 }}>
                    Auto-submits when timer expires
                  </div>
                </div>
              )}

              {/* Assessment Rules Card */}
              <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 className="m-h3">Quiz Rules</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                  <div className="m-row" style={{ gap: 8 }}>
                    <Ic n="target" s={16} color="var(--navy)" />
                    <span>Pass mark: <b>{data.course.passMark}%</b></span>
                  </div>
                  <div className="m-row" style={{ gap: 8 }}>
                    <Ic n="clock" s={16} color="var(--navy)" />
                    <span>Duration: <b>{timeLimitMinutes > 0 ? `${timeLimitMinutes} minutes` : 'Untimed'}</b></span>
                  </div>
                  <div className="m-row" style={{ gap: 8 }}>
                    <Ic n="refresh" s={16} color="var(--navy)" />
                    <span>Retries: <b>Unlimited until passed</b></span>
                  </div>
                </div>
              </div>

              {/* Need help */}
              <div className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 className="m-h3">Need help?</h2>
                <div className="m-sub" style={{ fontSize: 14 }}>
                  You can review lessons before taking or retrying the assessment.
                </div>
                <Link className="m-link" href={`/courses/${params.id}`}>
                  Review course lessons
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
