'use client';
import Shell, { Head } from '@/components/Shell';
import AdminTabs from '@/components/AdminTabs';
import { Alert, ErrorBox, Loading } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function AdminRetention() {
  const { data, error, loading } = useApi('/admin/retention');
  return (
    <Shell allow={['admin']}>
      <Head eye="Administrator" title="Retention" sub="How long each type of data is kept. Periods are to be confirmed before launch." />
      <AdminTabs />
      <div className="m-card" style={{ padding: '14px 16px' }}>
        {loading ? <Loading /> : error ? <ErrorBox error={error} /> : <table className="m-tbl"><thead><tr><th>Data</th><th>Kept for</th><th>Note</th></tr></thead><tbody>
          {data.policies.map((p: any) => <tr key={p.dataType}><td><b style={{ color: 'var(--navy)' }}>{p.dataType}</b></td><td>{p.months} months</td><td>{p.note}</td></tr>)}</tbody></table>}
      </div>
      {data && <Alert>Results are shown as totals only for groups of {data.minGroupSize} or more people.</Alert>}
    </Shell>
  );
}
