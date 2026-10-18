'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Bar, Btn, Disc, ErrorBox, I, Ic, Loading, Pill, Tabs } from '@/components/ui';
import { api, useApi } from '@/lib/api';
import { useSession } from '@/lib/session';

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Lesson({ params }: { params: { id: string; lid: string } }) {
  const { user } = useSession();
  const { data: l, error, loading, reload } = useApi(`/lessons/${params.lid}`);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState('transcript');
  const [caps, setCaps] = useState<boolean>(user?.prefs?.captions ?? true);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const posRef = useRef(0);
  const video = useRef<HTMLVideoElement>(null);
  const total = (l?.minutes || 1) * 60;

  useEffect(() => { if (l) { setPos(l.positionSeconds); posRef.current = l.positionSeconds; setFinished(false); setPlaying(false); } }, [l?.id]);
  // Placeholder playback when a lesson has no media file yet: advances the clock and saves the position every 10 s.
  useEffect(() => {
    if (!playing || l?.videoUrl) return;
    const t = setInterval(() => { posRef.current = Math.min(total, posRef.current + speed); setPos(posRef.current); if (posRef.current >= total) { setPlaying(false); complete(); } }, 1000);
    return () => clearInterval(t);
  }, [playing, speed, total, l?.videoUrl]);
  useEffect(() => { const t = setInterval(() => { if (playing) save(); }, 10000); return () => clearInterval(t); });
  const save = () => api(`/lessons/${params.lid}/progress`, { body: { positionSeconds: Math.floor(posRef.current) } }).catch(() => {});
  const complete = async () => { setFinished(true); await api(`/lessons/${params.lid}/progress`, { body: { completed: true, positionSeconds: Math.floor(posRef.current) } }); reload(); };
  const saveExit = async () => { await save(); window.location.href = `/courses/${params.id}`; };

  const nextLesson = l?.outline.find((x: any) => x.position === l.position + 1);
  return (
    <Shell back={{ href: `/courses/${params.id}`, label: 'Back to course' }}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <Head eye={`Lesson ${l.position} of ${l.total} · ${l.courseTitle}`} title={l.title}>
            {l.positionSeconds > 0 && !finished && <Pill k="info">Resumed at {mmss(l.positionSeconds)}</Pill>}<Btn kind="sec sm" onClick={saveExit}>Save and exit</Btn>
          </Head>
          <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative', height: 420, borderRadius: 14, background: 'var(--navy)', overflow: 'hidden', flex: 'none' }}>
                {l.videoUrl ? <video ref={video} src={l.videoUrl} controls style={{ width: '100%', height: '100%' }} onTimeUpdate={(e) => { posRef.current = e.currentTarget.currentTime; setPos(posRef.current); }} onEnded={complete} onPause={save} /> : (
                  <>
                    <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#2a3f6e" strokeWidth="4"><rect x="-20" y="260" width="260" height="190" rx="6" /><rect x="520" y="-30" width="320" height="200" rx="6" /></g></svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button className="m-disc" aria-label={playing ? 'Pause' : 'Play'} onClick={() => { setPlaying(!playing); if (playing) save(); }} style={{ width: 92, height: 92, border: 0, cursor: 'pointer' }}><I n={playing ? 'pause' : 'play'} s={44} /></button>
                    </div>
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'rgba(10,18,40,.82)', padding: '12px 18px' }}>
                      <div className="m-bar" style={{ background: '#3a4a6e', marginBottom: 10 }}><i style={{ width: `${(100 * pos) / total}%`, background: 'var(--gold)' }} /></div>
                      <div className="m-row" style={{ gap: 18, color: '#fff', fontWeight: 600 }}>
                        <button className="m-link" style={{ color: '#fff', display: 'flex' }} aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying(!playing)}><I n={playing ? 'pause' : 'play'} s={24} /></button>
                        <span>{mmss(Math.floor(pos))} / {mmss(total)}</span><div className="m-grow" />
                        <button className="m-link m-row" style={{ gap: 6, color: '#fff' }} aria-pressed={caps} onClick={() => setCaps(!caps)}><I n="captions" s={24} /> Captions {caps ? 'on' : 'off'}</button>
                        <button className="m-link" style={{ color: '#fff' }} aria-label="Playback speed" onClick={() => setSpeed(speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1)}>{speed.toFixed(1)}x</button>
                        <I n="volume" s={24} /><I n="full" s={24} />
                      </div>
                    </div>
                    {caps && playing && <div style={{ position: 'absolute', left: 40, right: 40, bottom: 90, textAlign: 'center', color: '#fff', background: 'rgba(0,0,0,.6)', padding: '6px 10px', borderRadius: 6 }}>{(l.transcript || '').split('. ')[Math.floor(pos / 8) % Math.max(1, (l.transcript || '').split('. ').length)]}</div>}
                  </>
                )}
              </div>
              {finished && <Alert k="ok"><b>Lesson complete.</b> {nextLesson ? <Link className="m-link" href={`/courses/${params.id}/lessons/${nextLesson.id}`}>Go to lesson {nextLesson.position}</Link> : <Link className="m-link" href={`/courses/${params.id}/quiz`}>Take the knowledge check</Link>}</Alert>}
              {!finished && !l.videoUrl && <div className="m-row" style={{ justifyContent: 'flex-end' }}><button className="m-link" style={{ fontSize: 15 }} onClick={complete}>Mark lesson as done</button></div>}
              <Tabs value={tab} onChange={setTab} items={[['transcript', 'Transcript'], ['notes', 'Notes'], ['resources', 'Resources']]} />
              <div className="m-card" style={{ minHeight: 100 }}>
                {tab === 'transcript' && (user?.prefs?.transcripts ?? true) && <><div className="m-sub" style={{ fontSize: 14 }}>{mmss(Math.floor(pos))}</div><div style={{ marginTop: 4, lineHeight: 1.5 }}>{l.transcript || 'No transcript has been added for this lesson yet.'}</div></>}
                {tab === 'transcript' && user?.prefs?.transcripts === false && <div className="m-sub">Transcripts are turned off in your settings.</div>}
                {tab === 'notes' && <div className="m-sub">Notes are planned for a later phase.</div>}
                {tab === 'resources' && <div className="m-sub">No resources are attached to this lesson.</div>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 360, flex: 'none' }}>
              <div className="m-card" style={{ padding: '16px 0 0', overflow: 'hidden' }}>
                <div className="m-row" style={{ justifyContent: 'space-between', padding: '0 18px' }}><h2 className="m-h3">Course outline</h2><span className="m-sub" style={{ fontSize: 15 }}>Lesson {l.position} of {l.total}</span></div>
                <div style={{ padding: '10px 18px 12px' }}><Bar pct={Math.round((100 * l.outline.filter((x: any) => x.state === 'done').length) / l.total)} /></div>
                {l.outline.map((x: any) => (
                  <Link key={x.id} href={`/courses/${params.id}/lessons/${x.id}`} className="m-row row-link" style={{ gap: 12, padding: '11px 14px', borderTop: '1px solid var(--border)', background: x.id === l.id ? 'var(--highlight)' : undefined, fontWeight: x.id === l.id ? 700 : 400 }}>
                    {x.state === 'done' ? <Ic n="checkc" s={22} color="var(--success-ink)" /> : x.id === l.id ? <span className="m-disc" style={{ width: 24, height: 24 }}><I n="play" s={12} /></span> : <span className="m-rad" style={{ width: 22, height: 22 }} />}
                    <span style={{ color: 'var(--navy)', flex: 1 }}>{x.position}. {x.title}</span>
                  </Link>))}
              </div>
              <div className="m-card"><div className="m-row" style={{ gap: 12 }}><Disc n="bulb" sand /><div><b style={{ color: 'var(--navy)' }}>Want to try it first?</b><div className="m-sub" style={{ fontSize: 15 }}>Practice is not graded and can be repeated.</div></div></div>
                <Btn kind="sec" style={{ marginTop: 12, width: '100%' }} href={`/courses/${params.id}/practice`}>Practise this lesson</Btn></div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
