'use client';
import { useRef, useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Btn, Disc, ErrorBox, Field, I, Ic, Loading, Pill, TextArea } from '@/components/ui';
import { api, fmtDate, useApi } from '@/lib/api';

export default function Task({ params }: { params: { id: string } }) {
  const { data, error, loading, reload } = useApi(`/courses/${params.id}/task`);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState<string | null>(null);
  const [msg, setMsg] = useState<any>(null);
  const input = useRef<HTMLInputElement>(null);
  const sub = data?.submission;
  const locked = sub && ['submitted', 'met'].includes(sub.status);

  async function send(mode: 'draft' | 'submit') {
    setMsg(null);
    const fd = new FormData(); fd.append('mode', mode);
    if (link) fd.append('link', link); if (notes !== null) fd.append('notes', notes); if (file) fd.append('file', file);
    try { await api(`/courses/${params.id}/task`, { form: fd }); setFile(null); setMsg({ k: 'ok', t: mode === 'submit' ? 'Submitted. An assessor will review it against the rubric.' : 'Draft saved.' }); reload(); }
    catch (e: any) { setMsg({ k: 'warn', t: e.message }); }
  }
  return (
    <Shell back={{ href: `/courses/${params.id}`, label: 'Back to course' }}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <Head eye={`Course · ${data.course.title}`} title="Practical task: opening the conversation">{sub?.status === 'draft' && <Pill k="info">Draft saved</Pill>}{sub?.status === 'submitted' && <Pill k="warn">Waiting for review</Pill>}{sub?.status === 'met' && <Pill k="go">Met</Pill>}{sub?.status === 'resubmit' && <Pill k="req">Resubmit</Pill>}</Head>
          {msg && <Alert k={msg.k}>{msg.t}</Alert>}
          <div className="m-row" style={{ gap: 18, alignItems: 'flex-start', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1.4, minWidth: 0 }}>
              <div className="m-card"><h2 className="m-h3">The task</h2><div style={{ marginTop: 6, lineHeight: 1.5 }}>{data.course.taskPrompt || 'Complete the task described by your instructor.'}</div></div>
              <div className="m-card"><h2 className="m-h3" style={{ marginBottom: 10 }}>Your submission</h2>
                {!locked && (
                  <div style={{ border: '2px dashed var(--field-border)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)' }}>
                    <Ic n="upload" s={32} color="var(--navy)" /><div style={{ flex: 1 }}><b style={{ color: 'var(--navy)' }}>Choose a file to upload</b><div className="m-sub" style={{ fontSize: 15 }}>DOCX, PDF or MP4 · up to 50 MB</div></div>
                    <Btn kind="sec sm" onClick={() => input.current?.click()}>Choose file</Btn><input ref={input} hidden type="file" accept=".docx,.pdf,.mp4,.txt,.doc" onChange={(e) => setFile(e.target.files?.[0] || null)} /></div>)}
                {(file || sub?.fileName) && (
                  <div className="m-row" style={{ gap: 12, marginTop: 12, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <Disc n="file" size={40} sand /><div style={{ flex: 1 }}><b style={{ color: 'var(--navy)' }}>{file?.name || sub.fileName}</b><div className="m-sub" style={{ fontSize: 14 }}>{file ? `${Math.round(file.size / 1024)} KB · ready to upload` : 'Uploaded'}</div></div><Ic n="checkc" s={22} color="var(--success-ink)" /></div>)}
                {!locked && <div style={{ marginTop: 14 }}><Field label="Or paste a link" icon="link" placeholder="https://" value={link || sub?.link || ''} onChange={(e: any) => setLink(e.target.value)} /></div>}
                <div style={{ marginTop: 14 }}><TextArea label="Notes for your assessor (optional)" height={90} placeholder="Anything you want the assessor to know..." disabled={locked} value={notes ?? sub?.notes ?? ''} onChange={(e: any) => setNotes(e.target.value)} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
              <div className="m-card"><h2 className="m-h3">How this is reviewed</h2><div className="m-sub" style={{ fontSize: 15, margin: '4px 0 6px' }}>An assessor reviews your work against this rubric and gives written feedback within 5 working days.</div>
                {data.rubric.map((r: any) => <div key={r.id} className="m-row" style={{ gap: 12, padding: '9px 0', borderTop: '1px solid var(--border)' }}><span style={{ flex: 1 }}>{r.text}</span><Pill>Checked at review</Pill></div>)}</div>
              <div className="m-card"><div className="m-row" style={{ gap: 12 }}><Disc n="clock" sand /><div><b style={{ color: 'var(--navy)' }}>{data.dueOn ? `Due ${fmtDate(data.dueOn, { weekday: 'long', day: 'numeric', month: 'short' })}` : 'No due date'}</b>{sub?.updatedAt && <div className="m-sub" style={{ fontSize: 15 }}>Saved {fmtDate(sub.updatedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>}</div></div></div>
              <Btn style={{ minHeight: 50 }} disabled={locked} onClick={() => send('submit')}>{sub?.status === 'resubmit' ? 'Resubmit for review' : 'Submit for review'}</Btn><Btn kind="sec" disabled={locked} onClick={() => send('draft')}>Save draft</Btn>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
