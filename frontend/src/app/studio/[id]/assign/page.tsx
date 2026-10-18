'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Btn, Check, Disc, ErrorBox, Field, Loading, Tabs, Toggle } from '@/components/ui';
import { api, fmtDate, useApi } from '@/lib/api';

export default function Assign({ params }: { params: { id: string } }) {
  const { data, error, loading } = useApi(`/studio/courses/${params.id}/assign`);
  const router = useRouter();
  const [tab, setTab] = useState('group');
  const [picked, setPicked] = useState<{ type: string; id: string }[]>([]);
  const [due, setDue] = useState('');
  const [req, setReq] = useState(true);
  const [remind, setRemind] = useState(true);
  const [prev, setPrev] = useState<any>(null);
  const [msg, setMsg] = useState<any>(null);
  const has = (a: any) => picked.some((p) => p.id === a.id && p.type === a.type);
  const toggle = (a: any) => setPicked(has(a) ? picked.filter((p) => !(p.id === a.id && p.type === a.type)) : [...picked, { type: a.type, id: a.id }]);
  useEffect(() => { if (!picked.length) return setPrev(null); api(`/studio/courses/${params.id}/assign/preview`, { body: { audiences: picked } }).then(setPrev).catch(() => {}); }, [picked, params.id]);
  async function assign() {
    setMsg(null);
    try { const r = await api(`/studio/courses/${params.id}/assign`, { body: { audiences: picked, dueOn: due || null, required: req, remind } }); setMsg({ k: 'ok', t: `Assigned to ${r.learners} learners (${r.added} new).` }); setTimeout(() => router.push('/studio'), 1500); }
    catch (e: any) { setMsg({ k: 'warn', t: e.message }); }
  }
  const items = (data?.audiences || []).filter((a: any) => a.type === tab);
  const c = data?.course;
  return (
    <Shell allow={['instructor', 'training_owner']}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <Head eye="Content Studio · Step 6 of 6" title={`Assign ${c.title}`} sub={c.publishedAt ? `Version ${c.version} (published ${fmtDate(c.publishedAt, { day: 'numeric', month: 'short', year: 'numeric' })}). Choose who should take it and by when.` : 'This version is not published yet.'} />
          {msg && <Alert k={msg.k}>{msg.t}</Alert>}
          <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1 }}>
            <div className="m-card" style={{ flex: 1.3, paddingBottom: 0, overflow: 'hidden', minWidth: 0 }}>
              <h2 className="m-h3" style={{ paddingBottom: 10 }}>Choose audiences</h2>
              <Tabs value={tab} onChange={setTab} items={[['group', 'Groups'], ['role', 'Roles'], ['cohort', 'Cohorts']]} />
              <div style={{ margin: '0 -18px' }}>
                {items.map((a: any) => <div key={a.id} className="m-row row-link" onClick={() => toggle(a)} style={{ gap: 14, padding: '12px 16px', borderTop: '1px solid var(--border)', background: has(a) ? 'var(--highlight)' : undefined }}>
                  <Check on={has(a)} onChange={() => toggle(a)} label={a.name} /><Disc n={a.type === 'role' ? 'shield' : a.type === 'cohort' ? 'layers' : 'users'} size={40} sand /><div style={{ flex: 1 }}><b style={{ color: 'var(--navy)' }}>{a.name}</b><div className="m-sub" style={{ fontSize: 15 }}>{a.people} {a.type === 'role' ? 'people' : 'learners'} · {a.type[0].toUpperCase() + a.type.slice(1)}</div></div></div>)}
                {!items.length && <div className="m-sub" style={{ padding: 18 }}>Nothing here yet.</div>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
              <div className="m-card"><h2 className="m-h3" style={{ marginBottom: 12 }}>Rules</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Field label="Due date" icon="calendar" type="date" value={due} onChange={(e: any) => setDue(e.target.value)} />
                  <div className="m-row" style={{ gap: 12 }}><div style={{ flex: 1 }}><b style={{ color: 'var(--navy)' }}>Required training</b><div className="m-sub" style={{ fontSize: 15 }}>Learners cannot remove it</div></div><Toggle on={req} onChange={setReq} label="Required training" /></div>
                  <div className="m-row" style={{ gap: 12 }}><div style={{ flex: 1 }}><b style={{ color: 'var(--navy)' }}>Send reminders</b><div className="m-sub" style={{ fontSize: 15 }}>7 and 2 days before</div></div><Toggle on={remind} onChange={setRemind} label="Send reminders" /></div></div></div>
              <div className="m-card" style={{ background: 'var(--highlight)', borderColor: '#e6d9b8' }}><div className="m-row" style={{ gap: 14 }}><div className="m-kpi">{prev?.learners ?? 0}</div><div><b style={{ color: 'var(--navy)' }}>learners will be assigned</b><div className="m-sub" style={{ fontSize: 15 }}>Across {picked.length} audiences · {prev?.alreadyEnrolled ?? 0} already enrolled</div></div></div></div>
              <Btn style={{ minHeight: 52, fontSize: 18 }} disabled={!picked.length || c.status !== 'published'} onClick={assign}>Assign course</Btn>
              <Btn kind="sec" href="/studio">Save for later</Btn>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
