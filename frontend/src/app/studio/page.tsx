'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Shell from '@/components/Shell';
import { Alert, Btn, Disc, I, Ic, Loading } from '@/components/ui';
import { api, useApi } from '@/lib/api';
import { useSession } from '@/lib/session';

const STEPS = ['Source', 'AI draft', 'Edit', 'Approve', 'Publish', 'Assign'];

export default function Studio() {
  const { user } = useSession();
  const router = useRouter();
  const drafts = useApi<any[]>('/studio/drafts');
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const [title, setTitle] = useState('');

  async function create(files: FileList | null) {
    setErr('');
    const fd = new FormData();
    if (title) fd.append('title', title);
    Array.from(files || []).forEach((f) => fd.append('file', f));
    try { const c = await api('/studio/courses', { form: fd }); router.push(`/studio/${c.id}`); } catch (e: any) { setErr(e.message); }
  }
  async function withAi() {
    const t = window.prompt('Name the new course');
    if (!t) return;
    try { const c = await api('/studio/courses', { form: (() => { const f = new FormData(); f.append('title', t); return f; })() }); router.push(`/studio/${c.id}`); } catch (e: any) { setErr(e.message); }
  }
  return (
    <Shell allow={['instructor']}>
      <div style={{ flex: 'none' }}><h1 className="m-h1">Create a new course</h1><div className="m-sub" style={{ maxWidth: 860, marginTop: 4 }}>Turn your existing materials into engaging learning experiences. Use AI to help you get started, then refine and publish with the right approvals.</div></div>
      <ol className="m-row" style={{ gap: 12, flex: 'none', padding: '6px 0 10px', borderBottom: '1px solid var(--border)', listStyle: 'none', margin: 0 }} aria-label="Steps">
        {STEPS.map((s, i) => <li key={s} className="m-row" style={{ gap: 10, flex: 1 }}><span className={`m-step ${i === 0 ? 'on' : ''}`}>{i + 1}</span><span style={{ fontWeight: i ? 500 : 700, color: i ? 'var(--ink-muted)' : 'var(--navy)' }}>{s}</span>{i < 5 && <i style={{ flex: 1, height: 2, background: 'var(--border)' }} />}</li>)}
      </ol>
      {err && <Alert k="warn">{err}</Alert>}
      <div className="m-row" style={{ gap: 20, alignItems: 'stretch', flex: 'none', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.65, minWidth: 320, border: '2px dashed var(--field-border)', borderRadius: 14, background: '#fff', padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); create(e.dataTransfer.files); }}>
          <Ic n="upload" s={40} color="var(--navy)" /><h2 className="m-h3" style={{ fontSize: 20 }}>Upload your source material</h2><div className="m-sub" style={{ fontSize: 15 }}>Add decks, SOPs, PDFs or existing documents.</div>
          <div className="m-in" style={{ height: 44, width: 280, fontSize: 15 }}><input aria-label="Course title (optional)" placeholder="Course title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <Btn onClick={() => input.current?.click()}>Choose files</Btn><input ref={input} type="file" multiple hidden accept=".pdf,.ppt,.pptx,.doc,.docx,.txt" onChange={(e) => create(e.target.files)} />
          <div className="m-sub" style={{ fontSize: 15 }}>Supported formats: PDF, PPT, DOC, DOCX, TXT (Max 50MB)</div>
        </div>
        <div className="m-card" style={{ flex: 1, minWidth: 280, background: 'var(--highlight)', padding: 22, display: 'flex', flexDirection: 'column', gap: 10, borderColor: '#e6d9b8' }}>
          <div className="m-row" style={{ gap: 12 }}><Disc n="spark" size={44} /><b style={{ color: 'var(--navy)', fontSize: 18 }}>Or create with AI (optional)</b></div>
          <div style={{ color: 'var(--highlight-ink)' }}>Generate an outline, examples or knowledge checks based on your approved material.</div>
          <Btn kind="sec" style={{ alignSelf: 'flex-start', background: '#fff' }} onClick={withAi}>Start with AI</Btn><div style={{ fontSize: 15, color: 'var(--highlight-ink)' }}>AI output will be saved as a draft</div>
        </div>
      </div>
      <h2 className="m-h2" style={{ flex: 'none' }}>Recent drafts</h2>
      <div className="m-card" style={{ padding: 0, overflow: 'hidden', flex: 'none' }}>
        {drafts.loading ? <Loading /> : !drafts.data?.length ? <div className="m-sub" style={{ padding: 18 }}>No drafts yet. Upload material above to start one.</div> : drafts.data.map((d: any, i: number) => (
          <div key={d.id} className="m-row" style={{ gap: 14, padding: '10px 16px', borderTop: i ? '1px solid var(--border)' : 0 }}><Disc n="file" size={42} sand /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{d.title}</div><div className="m-sub" style={{ fontSize: 15 }}>Version {d.version} · Draft</div></div><Btn sm href={`/studio/${d.id}`}>Continue editing</Btn></div>))}
      </div>
    </Shell>
  );
}
