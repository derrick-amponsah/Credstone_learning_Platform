'use client';
import Link from 'next/link';
import { useState } from 'react';
import Shell, { Head } from './Shell';
import { Alert, Btn, Check, Disc, Empty, ErrorBox, I, Loading, Pill, Tabs } from './ui';
import { api, useApi } from '@/lib/api';

const Thumb = ({ icon, badge }: { icon: string; badge: React.ReactNode }) => (
  <div className="m-thumb">
    <svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%" viewBox="0 0 220 104" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#2a3f6e" strokeWidth="3"><rect x="-10" y="70" width="90" height="40" rx="4" /><rect x="100" y="78" width="130" height="40" rx="4" /><rect x="140" y="-12" width="100" height="40" rx="4" /></g></svg>
    <span className="m-disc" style={{ width: 56, height: 56, position: 'relative' }}><I n={icon} s={30} c="#111E38" /></span>{badge}
  </div>
);

export default function CatalogueView({ mine, initialQ }: { mine?: boolean; initialQ?: string }) {
  const term = initialQ || '';
  const { data, error, loading, reload } = useApi<any[]>(`/catalogue?q=${encodeURIComponent(term)}`);
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('relevant');
  const [f, setF] = useState<Record<string, boolean>>({ courses: true, paths: true, beginner: true, intermediate: true, advanced: true, required: true, chosen: true });
  const [len, setLen] = useState<string[]>([]);
  const tg = (k: string) => setF({ ...f, [k]: !f[k] });
  const toggleLen = (k: string) => setLen(len.includes(k) ? len.filter((x) => x !== k) : [...len, k]);

  let rows = (data || []).filter((c) => (mine ? c.enrolStatus : true));
  const reqCount = rows.filter((c) => c.required && c.enrolStatus !== 'completed').length;
  rows = rows.filter((c) => (c.kind === 'path' ? f.paths : f.courses) && f[c.level.toLowerCase()] !== false && (c.required ? f.required : f.chosen)
    && (!len.length || len.some((l) => (l === 'lt1' ? c.hours < 1 : Number(c.hours) >= 1 && Number(c.hours) <= 3))));
  if (tab === 'required') rows = rows.filter((c) => c.required); if (tab === 'paths') rows = rows.filter((c) => c.kind === 'path'); if (tab === 'saved') rows = rows.filter((c) => c.saved);
  if (sort === 'az') rows = [...rows].sort((a, b) => a.title.localeCompare(b.title)); if (sort === 'short') rows = [...rows].sort((a, b) => a.hours - b.hours);
  const clear = () => { setF({ courses: true, paths: true, beginner: true, intermediate: true, advanced: true, required: true, chosen: true }); setLen([]); };
  const FG = ({ title, items }: { title: string; items: [string, string][] }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}><div className="m-sec">{title}</div>
      {items.map(([k, l]) => <div key={k} className="m-row" style={{ gap: 12 }}><Check on={k.startsWith('len') ? len.includes(k.slice(3)) : !!f[k]} onChange={() => (k.startsWith('len') ? toggleLen(k.slice(3)) : tg(k))} label={l} /><span>{l}</span></div>)}</div>
  );
  return (
    <Shell>
      <Head title={mine ? 'My Learning' : 'Catalogue'} sub={mine ? 'Courses and paths you have been assigned or chosen.' : 'Find a course or path. Required training is marked so nothing is missed.'}>
        <div className="m-in" style={{ height: 46, padding: '0 8px 0 16px', fontWeight: 600, color: 'var(--navy)' }}>
          <label htmlFor="sort" style={{ fontWeight: 600 }}>Sort:</label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}><option value="relevant">Most relevant</option><option value="az">A to Z</option><option value="short">Shortest first</option></select>
        </div>
      </Head>
      {term && <Alert>Showing results for &ldquo;{term}&rdquo;. <Link className="m-link" href={mine ? '/my-learning' : '/catalogue'}>Clear search</Link></Alert>}
      <Tabs value={tab} onChange={setTab} items={[['all', 'All'], ['required', 'Required for me', reqCount ? <span className="m-pill req">{reqCount}</span> : null], ['paths', 'Paths'], ['saved', 'Saved']]} />
      <div className="m-row" style={{ gap: 22, alignItems: 'flex-start', flex: 1 }}>
        <div className="m-card" style={{ width: 250, flex: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="m-row" style={{ justifyContent: 'space-between' }}><h2 className="m-h3">Filters</h2><button className="m-link" style={{ fontSize: 15 }} onClick={clear}>Clear all</button></div>
          <FG title="Type" items={[['courses', 'Courses'], ['paths', 'Paths']]} />
          <FG title="Level" items={[['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']]} />
          <FG title="Assignment" items={[['required', 'Required for me'], ['chosen', 'Chosen by me']]} />
          <FG title="Length" items={[['lenlt1', 'Under 1 hour'], ['len1to3', '1 to 3 hours']]} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? <Loading /> : error ? <ErrorBox error={error} /> : !rows.length ? <Empty icon="search" title="Nothing matches yet" text="Clear a filter or search for something else." action={<Btn kind="sec" onClick={clear}>Clear filters</Btn>} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
              {rows.map((c) => {
                const st = c.enrolStatus;
                const badge = c.required && st !== 'completed' ? <Pill k="req">Required</Pill> : st === 'completed' ? <Pill k="go">Completed</Pill> : st ? <Pill k="go">In progress</Pill> : <Pill>Chosen</Pill>;
                return (
                  <div key={c.id} className="m-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Thumb icon={c.icon} badge={badge} />
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <h3 className="m-h3">{c.title}</h3>
                      <div className="m-sub" style={{ fontSize: 15 }}>{c.kind === 'path' ? `Path · ${c.courseCount} courses` : `Course · ${Number(c.hours)}h`} · {c.level}</div>
                      <div className="m-row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                        <Link className="m-link" style={{ fontSize: 15 }} href={`/courses/${c.id}`}>View details</Link>
                        {st ? <Btn sm href={`/courses/${c.id}`}>{st === 'completed' ? 'Review' : st === 'in_progress' ? 'Resume' : 'Start'}</Btn> : <Btn sm onClick={async () => { await api(`/courses/${c.id}/enrol`, { body: {} }); reload(); }}>Enrol</Btn>}
                      </div>
                      <button className="m-link" style={{ fontSize: 14, alignSelf: 'flex-start', fontWeight: 600 }} aria-pressed={c.saved} onClick={async () => { await api(`/courses/${c.id}/save`, { body: {} }); reload(); }}>{c.saved ? 'Saved' : 'Save for later'}</button>
                    </div>
                  </div>);
              })}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
