'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Bar, Btn, Disc, ErrorBox, Av, Loading, Pill, I } from '@/components/ui';
import { fmtDate, useApi } from '@/lib/api';
import { useSession } from '@/lib/session';

const HOME: Record<string, string> = { admin: '/admin/users', assessor: '/review', supervisor: '/team', instructor: '/studio', training_owner: '/training' };

function dueLabel(d: string) {
  const days = Math.round((new Date(d).getTime() - new Date(new Date().toDateString()).getTime()) / 864e5);
  if (days < 0) return ['req', 'Overdue']; if (days === 0) return ['warn', 'Due today'];
  const wd = new Date(d).toLocaleDateString('en-GB', { weekday: 'short' });
  return [days <= 3 ? 'warn' : 'info', days <= 7 ? `Due ${wd}` : `Due ${fmtDate(d, { day: 'numeric', month: 'short' })}`];
}

export default function Home() {
  const { user, active } = useSession();
  const router = useRouter();
  const go = HOME[active];
  useEffect(() => { if (user && go) router.replace(go); }, [user, go, router]);
  const { data: h, error, loading } = useApi(user && !go ? '/home' : null);
  const hour = new Date().getHours();
  return (
    <Shell>
      {go || loading ? <Loading /> : error ? <ErrorBox error={error} /> : h && (
        <>
          <Head title="Your learning" sub={`Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${user.firstName}. Here is where things stand today.`}>
            <Btn href="/notifications" kind="sec sm"><I n="bell" s={18} />&nbsp; Notifications {h.unread > 0 && <span className="m-pill nv" style={{ marginLeft: 8 }}>{h.unread}</span>}</Btn>
          </Head>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, flex: 'none' }}>
            {[['In progress', h.counts.inProgress, 'Courses and paths'], ['Due this week', h.counts.dueWeek, h.counts.nextDue ? `Next: ${new Date(h.counts.nextDue).toLocaleDateString('en-GB', { weekday: 'long' })}` : 'Nothing due'], ['Credentials', h.credentials, 'Earned to date'], ['Overdue', h.counts.overdue, h.counts.overdue ? 'Needs attention' : 'All clear']].map(([l, v, s], i) => (
              <div key={l as string} className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div className="m-sub" style={{ fontSize: 15 }}>{l}</div><div className="m-kpi" style={i === 3 && v ? { color: 'var(--required-ink)' } : undefined}>{v}</div><div className="m-sub" style={{ fontSize: 15 }}>{s}</div>
              </div>
            ))}
          </div>
          <div className="m-row" style={{ gap: 18, alignItems: 'flex-start', flex: 1 }}>
            <div style={{ flex: 1.25, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              {h.continue && (
                <div className="m-card" style={{ flex: 'none', borderLeft: '6px solid var(--gold)' }}>
                  <div className="m-eye">Continue</div><h2 className="m-h2" style={{ marginTop: 4 }}>{h.continue.title}</h2>
                  {h.continue.lesson && <div className="m-sub">Lesson {h.continue.lesson.position} of {h.continue.lesson.total} · {h.continue.lesson.title}</div>}
                  <div className="m-row" style={{ gap: 12, margin: '12px 0 14px' }}><Bar pct={h.continue.progress} style={{ flex: 1 }} /><b style={{ color: 'var(--navy)' }}>{h.continue.progress}%</b></div>
                  <div className="m-row" style={{ gap: 12 }}>
                    <Btn href={h.continue.lesson ? `/courses/${h.continue.courseId}/lessons/${h.continue.lesson.id}` : `/courses/${h.continue.courseId}`}><I n="play" s={18} />&nbsp; Resume lesson</Btn><Btn kind="sec" href={`/courses/${h.continue.courseId}`}>View course</Btn>
                  </div>
                </div>
              )}
              <div className="m-card" style={{ flex: 'none', paddingBottom: 6 }}>
                <div className="m-row" style={{ justifyContent: 'space-between', paddingBottom: 8 }}><h2 className="m-h3">Due soon</h2><a className="m-link" style={{ fontSize: 15 }} href="/my-learning">View all</a></div>
                {!h.dueSoon.length && <div className="m-sub" style={{ padding: '8px 0 12px' }}>Nothing is due in the next two weeks.</div>}
                {h.dueSoon.map((d: any, i: number) => { const [k, t] = dueLabel(d.dueOn); return (
                  <a key={d.courseId} href={`/courses/${d.courseId}`} className="m-row row-link" style={{ gap: 14, padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 0 }}>
                    <Disc n={d.kind === 'path' ? 'route' : 'list'} sand /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{d.title}</div><div className="m-sub" style={{ fontSize: 15 }}>{d.required ? 'Required' : 'Chosen'} {d.kind} · {new Date(d.dueOn) < new Date() ? 'was due' : 'due'} {fmtDate(d.dueOn, { day: 'numeric', month: 'short' })}</div></div><Pill k={k}>{t}</Pill>
                  </a>); })}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              {h.feedback && (
                <div className="m-card"><div className="m-row" style={{ justifyContent: 'space-between' }}><h2 className="m-h3">Recent feedback</h2><Pill>Practical task</Pill></div>
                  <div className="m-row" style={{ gap: 12, marginTop: 10, alignItems: 'flex-start' }}><Av t={h.feedback.assessor.split(' ').map((x: string) => x[0]).join('')} size={40} />
                    <div><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{h.feedback.assessor}, assessor</div><div style={{ marginTop: 2 }}>&ldquo;{h.feedback.feedback}&rdquo;</div></div></div>
                  <div style={{ marginTop: 12 }}><a className="m-link" href="/notifications">Read full feedback</a></div></div>
              )}
              {h.recommended && (
                <div className="m-card"><div className="m-eye">Recommended next</div>
                  <div className="m-row" style={{ gap: 14, marginTop: 8 }}><Disc n="route" size={56} /><div><h3 className="m-h3">{h.recommended.title}</h3><div className="m-sub" style={{ fontSize: 15 }}>Path · {h.recommended.courses} courses · About {Number(h.recommended.hours)}h</div></div></div>
                  {h.continue && <div className="m-sub" style={{ marginTop: 10 }}>Suggested because you are close to finishing {h.continue.title}.</div>}
                  <div className="m-row" style={{ gap: 12, marginTop: 14 }}><Btn href={`/courses/${h.recommended.id}`}>Start course</Btn><Btn kind="sec" href="/catalogue">Not now</Btn></div></div>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
