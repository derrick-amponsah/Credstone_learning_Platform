'use client';
import Shell, { Head } from '@/components/Shell';
import AdminTabs from '@/components/AdminTabs';
import { ErrorBox, Loading } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function AdminRoles() {
  const { data, error, loading } = useApi<any[]>('/admin/roles');
  return (
    <Shell allow={['admin']}>
      <Head eye="Administrator" title="Roles" sub="Roles are enforced on the server for every request. Assign them from the Users tab." />
      <AdminTabs />
      <div className="m-card" style={{ padding: '14px 16px' }}>
        {loading ? <Loading /> : error ? <ErrorBox error={error} /> : <table className="m-tbl"><thead><tr><th>Role</th><th>What it can do</th><th>People</th></tr></thead><tbody>
          {data!.map((r) => <tr key={r.key}><td><b style={{ color: 'var(--navy)' }}>{r.name}</b></td><td>{r.description}</td><td>{r.people}</td></tr>)}</tbody></table>}
      </div>
    </Shell>
  );
}
