'use client';
import Link from 'next/link';
import { useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Alert, Av, Btn, ErrorBox, I, Ic, Loading, Pill } from '@/components/ui';
import { useApi } from '@/lib/api';

const PILL: Record<string, [string, string]> = { ready: ['go', 'Ready'], overdue: ['req', 'Overdue'], obs_pending: ['warn', 'Observation pending'], in_progress: ['', 'In progress'], none: ['', 'Nothing assigned'] };

export default function Team() {
  const [gid, setGid] = useState('');
  const { data, error, loading } = useApi(`/team${gid ? `?groupId=${gid}` : ''}`);
  return (
    <Shell allow={['supervisor']}>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : !data.group ? <Alert>You are not assigned to a team yet. Ask your administrator.</Alert> : (
        <>
          <Head eye="Team readiness" title={data.group.name} sub={data.groups.length > 1 ? 'You supervise more than one team.' : 'You are the supervisor of this team only.'}>
            <div className="m-row" style={{ gap: 10 }}>
              {data.groups.length > 1 && <div className="m-in" style={{ height: 46, padding: '0 8px 0 16px' }}><select aria-label="Team" value={data.group.id} onChange={(e) => setGid(e.target.value)}>{data.groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>}
              <Btn kind="sec" onClick={() => window.open(`/api/team/export/csv?groupId=${data.group.id}`, '_blank')}><I n="download" s={18} />&nbsp; Export CSV</Btn>
            </div>
          </Head>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, flex: 'none' }}>
            {[['Assigned', data.counts.assigned, `Learners in ${data.group.name}`], ['Ready', data.counts.ready, 'Criteria all met'], ['Overdue', data.counts.overdue, 'Need a conversation'], ['Observations pending', data.counts.pending, 'Waiting on you']].map(([l, v, s], i) => (
              <div key={l as string} className="m-card" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><div className="m-sub" style={{ fontSize: 15 }}>{l}</div><div className="m-kpi" style={i === 2 && v ? { color: 'var(--required-ink)' } : undefined}>{v}</div><div className="m-sub" style={{ fontSize: 15 }}>{s}</div></div>))}
          </div>
          <div className="m-row" style={{ gap: 18, alignItems: 'flex-start', flex: 1 }}>
            <div className="m-card" style={{ flex: 1.5, padding: 0, overflow: 'hidden', minWidth: 0 }}>
              <div style={{ padding: '14px 16px' }}><h2 className="m-h3">Team members</h2></div>
              {data.members.map((m: any, i: number) => { const [k, l] = PILL[m.status]; const to = m.status === 'obs_pending' ? `/team/observe/${m.id}?courseId=${m.courseId}` : null; const Row: any = to ? Link : 'div'; return (
                <Row key={m.id} {...(to ? { href: to } : {})} className={`m-row ${to ? 'row-link' : ''}`} style={{ gap: 14, padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 0 }}>
                  <Av t={m.name.slice(-1)} bg="var(--info-bg)" fg="var(--info-ink)" /><div style={{ flex: 1 }}><b style={{ color: 'var(--navy)' }}>{m.name}</b><div className="m-sub" style={{ fontSize: 15 }}>{m.course ? `${m.course} · ${m.progress}%` : 'No courses yet'}</div></div><Pill k={k}>{l}</Pill>{to && <Ic n="chevr" s={22} color="var(--navy)" />}</Row>); })}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <div className="m-card"><h2 className="m-h3">Application after training</h2><div className="m-sub" style={{ marginTop: 6 }}>Your observations and performance indicators appear here as signals, not proof of impact.</div>
                <div className="m-row" style={{ gap: 12, marginTop: 14 }}>{data.members.find((m: any) => m.status === 'obs_pending') ? <Btn href={`/team/observe/${data.members.find((m: any) => m.status === 'obs_pending').id}?courseId=${data.members.find((m: any) => m.status === 'obs_pending').courseId}`}>Record observation</Btn> : <Btn disabled>Record observation</Btn>}</div></div>
              <div className="m-card" style={{ background: 'var(--info-bg)', borderColor: '#cfe0f6' }}><div className="m-row" style={{ gap: 12, alignItems: 'flex-start' }}><Ic n="shieldcheck" s={24} color="var(--info-ink)" /><div style={{ fontSize: 15 }}><b>You only see {data.group.name}.</b> Every view is recorded in the audit trail.</div></div></div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
