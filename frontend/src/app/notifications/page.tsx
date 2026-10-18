'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import { Btn, Disc, Empty, ErrorBox, Loading, Pill, Tabs, Toggle } from '@/components/ui';
import { api, ago, useApi } from '@/lib/api';
import { useSession } from '@/lib/session';

const KIND: Record<string, [string, string, string, string]> = {
  feedback: ['pencil', '', 'Feedback', 'feedback'], assigned: ['route', '', 'Assigned', 'assigned'], reminder: ['clock', 'warn', 'Reminder', 'reminders'],
  credential: ['award', 'go', 'Credential', 'all'], signup: ['users', 'warn', 'Sign-up', 'all'], account: ['checkc', 'go', 'Account', 'all'],
};
export default function Notifications() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const { data, error, loading, reload } = useApi('/notifications');
  const [tab, setTab] = useState('all');
  const prefs = { email: true, weekly: false, reminders: true, ...(user?.prefs?.notif || {}) };
  const setPref = async (k: string, v: boolean) => { await api('/auth/me', { method: 'PATCH', body: { prefs: { notif: { ...prefs, [k]: v } } } }); refresh(); };
  const items = (data?.items || []).filter((n: any) => tab === 'all' || KIND[n.kind]?.[3] === tab);
  const open = async (n: any) => { await api(`/notifications/${n.id}/read`, { body: {} }); if (n.link) router.push(n.link); else reload(); };
  return (
    <Shell>
      <Head title="Notifications" sub="Assignments, feedback and reminders in one place."><Btn kind="sec sm" onClick={async () => { await api('/notifications/read-all', { body: {} }); reload(); }}>Mark all as read</Btn></Head>
      <Tabs value={tab} onChange={setTab} items={[['all', 'All', data?.unread ? <span className="m-pill nv">{data.unread}</span> : null], ['assigned', 'Assigned'], ['feedback', 'Feedback'], ['reminders', 'Reminders']]} />
      <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1 }}>
        <div className="m-card" style={{ flex: 1, padding: 0, overflow: 'hidden', minWidth: 0 }}>
          {loading ? <Loading /> : error ? <ErrorBox error={error} /> : !items.length ? <div style={{ padding: 18 }}><Empty icon="bell" title="You are all caught up" text="New assignments, feedback and reminders will appear here." /></div> : items.map((n: any, i: number) => {
            const [ic, pk, label] = KIND[n.kind] || ['info', '', 'Update'];
            return (
              <button key={n.id} onClick={() => open(n)} className="m-row row-link" style={{ gap: 14, padding: '13px 18px', borderTop: i ? '1px solid var(--border)' : 0, background: n.read ? 'none' : 'var(--highlight)', width: '100%', border: 0, textAlign: 'left', font: 'inherit' }}>
                <span style={{ width: 10, flex: 'none' }}>{!n.read && <i style={{ display: 'block', width: 10, height: 10, borderRadius: '50%', background: 'var(--gold-ink)' }} aria-label="Unread" />}</span>
                <Disc n={ic} size={44} sand /><div style={{ flex: 1 }}><div style={{ fontWeight: n.read ? 600 : 700, color: 'var(--navy)' }}>{n.title}</div><div className="m-sub" style={{ fontSize: 15 }}>{n.body ? `${n.body} · ` : ''}{ago(n.createdAt)}</div></div><Pill k={pk}>{label}</Pill></button>);
          })}
        </div>
        <div className="m-card" style={{ width: 360, flex: 'none' }}><h2 className="m-h3" style={{ marginBottom: 4 }}>How we contact you</h2>
          {[['In the app', 'Always on', null, true], ['Email', 'Assignments and feedback', 'email', prefs.email], ['Weekly summary', 'Every Monday morning', 'weekly', prefs.weekly], ['Reminders', '2 days before a due date', 'reminders', prefs.reminders]].map(([t, s, k, on]: any) => (
            <div key={t} className="m-row" style={{ gap: 14, padding: '12px 0', borderTop: '1px solid var(--border)' }}><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{t}</div><div className="m-sub" style={{ fontSize: 15 }}>{s}</div></div>
              <Toggle on={!!on} label={t} onChange={(v) => k && setPref(k, v)} /></div>))}
        </div>
      </div>
    </Shell>
  );
}
