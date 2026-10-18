'use client';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { Bar, Btn, Disc, ErrorBox, I, Ic, Loading, Pill } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function Course({ params }: { params: { id: string } }) {
  const { data, error, loading } = useApi(`/courses/${params.id}`);
  const c = data?.course;
  const done = data?.lessons.filter((l: any) => l.state === 'done').length ?? 0;
  const next = data?.lessons.find((l: any) => l.state === 'next');
  const pct = data?.enrolment?.progress ?? 0;
  return (
    <Shell back={{ href: '/my-learning', label: 'Back to My Learning' }}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <div className="m-row" style={{ gap: 20, flex: 'none' }}>
            <Disc n={c.icon} size={76} />
            <div>
              {data.parent && <div className="m-sub" style={{ fontSize: 15 }}>Course {data.parent.position} of {data.parent.total} in {data.parent.title}</div>}
              <h1 className="m-h1">{c.title}</h1>
              <div className="m-row" style={{ gap: 14, marginTop: 6 }}>{data.enrolment?.required && <Pill k="req">Required</Pill>}<Bar pct={pct} style={{ width: 260 }} /><b style={{ color: 'var(--navy)' }}>{pct}%</b></div>
            </div>
          </div>
          <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1 }}>
            <div style={{ flex: 1.35, minWidth: 0 }}>
              <div className="m-card" style={{ padding: '16px 0 0', overflow: 'hidden' }}>
                <div className="m-row" style={{ justifyContent: 'space-between', padding: '0 18px 10px' }}><h2 className="m-h3">{c.kind === 'path' ? 'Courses in this path' : 'Lessons'}</h2>{c.kind === 'course' && <span className="m-sub" style={{ fontSize: 15 }}>{done} of {data.lessons.length} done</span>}</div>
                {c.kind === 'path' ? data.children.map((x: any, i: number) => (
                  <Link key={x.id} href={`/courses/${x.id}`} className="m-row row-link" style={{ gap: 14, padding: '12px 16px', borderTop: '1px solid var(--border)' }}><Disc n="book" size={32} sand /><div style={{ flex: 1, fontWeight: 600, color: 'var(--navy)' }}>{i + 1}. {x.title}</div><Ic n="chevr" /></Link>
                )) : data.lessons.map((l: any) => (
                  <Link key={l.id} href={`/courses/${params.id}/lessons/${l.id}`} className="m-row row-link" style={{ gap: 14, padding: '12px 16px', borderTop: '1px solid var(--border)', background: l.state === 'next' ? 'var(--highlight)' : undefined }}>
                    {l.state === 'done' ? <span className="m-disc" style={{ width: 32, height: 32, background: 'var(--navy)', color: 'var(--gold-soft)' }}><I n="check" s={18} /></span>
                      : l.state === 'next' ? <span className="m-disc" style={{ width: 32, height: 32 }}><I n="play" s={16} /></span>
                      : <span className="m-disc sand" style={{ width: 32, height: 32 }}><b style={{ fontSize: 14 }}>{l.position}</b></span>}
                    <div style={{ flex: 1 }}><div style={{ fontWeight: l.state === 'next' ? 700 : 600, color: 'var(--navy)' }}>{l.position}. {l.title}</div><div className="m-sub" style={{ fontSize: 15 }}>{l.minutes} min · {l.kind}</div></div>
                    {l.state === 'done' ? <Pill k="go">Done</Pill> : l.state === 'next' ? <Pill k="nv">Next</Pill> : <span className="m-sub" style={{ fontSize: 15 }}>To come</span>}
                  </Link>
                ))}
                {c.kind === 'course' && !data.lessons.length && <div className="m-sub" style={{ padding: 18 }}>No lessons have been added yet.</div>}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
              <div className="m-card"><h2 className="m-h3">Objective</h2><div style={{ marginTop: 6 }}>{c.objective || 'Build the skills covered in this course.'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                  <div><div className="m-sub" style={{ fontSize: 14 }}>Effort</div><b style={{ color: 'var(--navy)' }}>About {Number(c.hours)} hours</b></div>
                  {data.prerequisite && <div><div className="m-sub" style={{ fontSize: 14 }}>Prerequisite</div><b style={{ color: 'var(--navy)' }}>{data.prerequisite.title}</b><div><Pill k={data.prerequisite.done ? 'go' : 'warn'}>{data.prerequisite.done ? 'Completed' : 'Not yet'}</Pill></div></div>}
                </div></div>
              {c.kind === 'course' && (
                <div className="m-card"><h2 className="m-h3" style={{ marginBottom: 10 }}>Success criteria</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data.criteria.map((x: any) => <div key={x.key} className="m-row" style={{ gap: 12, alignItems: 'flex-start' }}><Ic n={x.met ? 'checkc' : 'target'} s={22} color={x.met ? 'var(--success-ink)' : 'var(--navy)'} /><span>{x.label}{x.met ? ' (met)' : ''}</span></div>)}
                  </div></div>
              )}
              {c.kind === 'course' && (
                <div className="m-row" style={{ gap: 12, flexWrap: 'wrap' }}>
                  {data.hasPractice && <Btn kind="sec" style={{ flex: 1 }} href={`/courses/${params.id}/practice`}>Practise first</Btn>}
                  <Btn style={{ flex: 1 }} href={next ? `/courses/${params.id}/lessons/${next.id}` : `/courses/${params.id}/quiz`}><I n="play" s={18} />&nbsp; {next ? (done ? 'Resume lesson' : 'Start course') : 'Take knowledge check'}</Btn>
                  {c.requiresPractical && <Btn kind="sec" style={{ flexBasis: '100%' }} href={`/courses/${params.id}/task`}>Practical task</Btn>}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
