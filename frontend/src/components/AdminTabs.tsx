'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: [string, string][] = [['/admin/users', 'Users'], ['/admin/groups', 'Groups and teams'], ['/admin/roles', 'Roles'], ['/admin/retention', 'Retention'], ['/admin/audit', 'Audit trail']];
export default function AdminTabs() {
  const p = usePathname();
  return (
    <div className="m-tabs" style={{ flex: 'none' }} role="tablist">
      {TABS.map(([h, l]) => <Link key={h} href={h} role="tab" aria-selected={p === h} className={`m-tab ${p === h ? 'on' : ''}`}>{l}</Link>)}
    </div>
  );
}
