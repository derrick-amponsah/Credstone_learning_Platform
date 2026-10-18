'use client';
import Shell, { Head } from '@/components/Shell';
import AdminTabs from '@/components/AdminTabs';
import { ErrorBox, Loading } from '@/components/ui';
import { fmtDate, useApi } from '@/lib/api';

export default function AdminAudit() {
  const { data, error, loading } = useApi<any[]>('/admin/audit?limit=200');
  return (
    <Shell allow={['admin']}>
      <Head eye="Administrator" title="Audit trail" sub="Sign-ups, approvals, grades, credentials and every view of learner evidence." />
      <AdminTabs />
      <div className="m-card" style={{ padding: '14px 16px', overflowX: 'auto' }}>
        {loading ? <Loading /> : error ? <ErrorBox error={error} /> : <table className="m-tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead><tbody>
          {data!.map((a) => <tr key={a.id}><td>{fmtDate(a.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>{a.actor || 'System'}</td><td><b>{a.action}</b></td><td className="m-sub" style={{ fontSize: 14 }}>{Object.keys(a.detail || {}).length ? JSON.stringify(a.detail) : a.entity}</td></tr>)}</tbody></table>}
      </div>
    </Shell>
  );
}
