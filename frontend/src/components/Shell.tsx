'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, ROLE_NAMES } from '@/lib/session';
import { useApi, initials } from '@/lib/api';
import { I, Logo, Loading, Empty, Btn } from './ui';

type Nav = [string, string, string][];
const NAV: Record<string, Nav> = {
  learner: [
    ['home', 'Home', '/'],
    ['book', 'My Learning', '/my-learning'],
    ['layers', 'Catalogue', '/catalogue'],
    ['award', 'Credentials', '/credentials'],
    ['calendar', 'Calendar', '/calendar'],
    ['mail', 'Messages', '/messages'],
  ],
  instructor: [
    ['pencil', 'Content Studio', '/studio'],
    ['calendar', 'Calendar', '/calendar'],
    ['mail', 'Messages', '/messages'],
  ],
  training_owner: [
    ['checkc', 'Approvals', '/approvals'],
    ['chart', 'Analytics', '/training'],
    ['calendar', 'Calendar', '/calendar'],
    ['mail', 'Messages', '/messages'],
  ],
  supervisor: [
    ['chart', 'Team Training', '/team'],
    ['calendar', 'Calendar', '/calendar'],
    ['mail', 'Messages', '/messages'],
  ],
  assessor: [
    ['checkc', 'Review Queue', '/review'],
    ['calendar', 'Calendar', '/calendar'],
    ['mail', 'Messages', '/messages'],
  ],
  admin: [
    ['users', 'Users', '/admin/users'],
    ['layers', 'Groups & Teams', '/admin/groups'],
    ['key', 'Roles', '/admin/roles'],
    ['shield', 'Audit Trail', '/admin/audit'],
    ['chart', 'Reports', '/training'],
    ['mail', 'Messages', '/messages'],
  ],
};

export const HOME_ROUTE: Record<string, string> = {
  learner: '/',
  instructor: '/studio',
  training_owner: '/approvals',
  supervisor: '/team',
  assessor: '/review',
  admin: '/admin/users',
};

const SEARCH: Record<string, string> = {
  learner: 'Search the catalogue...',
  instructor: 'Search in creator studio...',
  training_owner: 'Search courses for approval...',
  supervisor: 'Search people or courses...',
  assessor: 'Search submissions...',
  admin: 'Search users, teams or roles...',
};

export default function Shell({ children, back, allow, noSearch }: { children: React.ReactNode; back?: { href: string; label: string }; allow?: string[]; noSearch?: boolean }) {
  const { user, active, setActive, signOut } = useSession();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [term, setTerm] = useState('');
  const count = useApi<{ n: number }>(user ? '/notifications/count' : null);

  useEffect(() => {
    if (user === null) router.replace('/signin');
    else if (user?.mustChangePassword) router.replace('/change-password');
    else if (user && !user.prefs?.onboarded) router.replace('/welcome');
  }, [user, router]);

  if (!user || user.mustChangePassword || !user.prefs?.onboarded) return <div className="m-app app"><Loading /></div>;
  const denied = allow && !user.roles.some((r: string) => allow.includes(r));
  const nav = NAV[active] || NAV.learner;
  const isOn = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const name = `${user.firstName} ${user.lastName}`;
  const homeUrl = HOME_ROUTE[active] || '/';

  return (
    <div className="m-app app">
      <a href="#main" className="skip">Skip to content</a>
      <aside className="m-side">
        <Link href={homeUrl} className="m-brand" style={{ textDecoration: 'none' }}>
          <Logo />
          <span>Credstone<br />Learning</span>
        </Link>
        <nav aria-label="Main" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nav.map(([ic, label, href], i) => (
            <Link key={label + i} href={href} className={`m-nav ${isOn(href) ? 'on' : ''}`} aria-current={isOn(href) ? 'page' : undefined}>
              <I n={ic} s={22} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="m-sp" />
        <Link href="/settings" className={`m-nav ${path.startsWith('/settings') ? 'on' : ''}`}>
          <I n="settings" s={22} />
          <span>Settings</span>
        </Link>
      </aside>
      <div className="m-main" style={{ position: 'relative' }}>
        <header className="m-top">
          {back ? (
            <Link href={back.href} className="m-back"><I n="back" /><span>{back.label}</span></Link>
          ) : noSearch ? null : (
            <form className="m-search" role="search" onSubmit={(e) => {
              e.preventDefault();
              if (active === 'learner') router.push(`/catalogue?q=${encodeURIComponent(term)}`);
              else if (active === 'instructor') router.push(`/studio?q=${encodeURIComponent(term)}`);
              else if (active === 'training_owner') router.push(`/approvals?q=${encodeURIComponent(term)}`);
              else if (active === 'supervisor') router.push(`/team?q=${encodeURIComponent(term)}`);
              else if (active === 'assessor') router.push(`/review?q=${encodeURIComponent(term)}`);
              else if (active === 'admin') router.push(`/admin/users?q=${encodeURIComponent(term)}`);
            }}>
              <I n="search" /><input aria-label="Search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={SEARCH[active]} style={{ border: 0, outline: 0, flex: 1, font: 'inherit', background: 'transparent' }} />
            </form>
          )}
          <div className="m-grow" />
          <Link href="/notifications" className="m-bell" aria-label={`Notifications${count.data?.n ? `, ${count.data.n} unread` : ''}`}><I n="bell" s={24} />{!!count.data?.n && <i />}</Link>
          <button className="m-av" aria-label="Account menu" aria-expanded={menu} onClick={() => setMenu(!menu)} style={{ border: 0, cursor: 'pointer' }}>{initials(name)}</button>
        </header>
        {menu && (
          <div className="pop" role="menu">
            <div><b style={{ color: 'var(--navy)' }}>{name}</b><div className="m-sub" style={{ fontSize: 14 }}>{user.email}</div></div>
            {user.roles.length > 1 && (
              <div className="m-field"><label htmlFor="viewas" style={{ fontSize: 14 }}>View as</label>
                <div className="m-in" style={{ height: 42 }}>
                  <select
                    id="viewas"
                    value={active}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      setActive(nextRole);
                      setMenu(false);
                      router.push(HOME_ROUTE[nextRole] || '/');
                    }}
                  >
                    {user.roles.map((r: string) => <option key={r} value={r}>{ROLE_NAMES[r]}</option>)}
                  </select>
                </div>
              </div>
            )}
            <Btn kind="sec sm" href="/settings">Settings</Btn>
            <Btn kind="sm" onClick={signOut}>Sign out</Btn>
          </div>
        )}
        <main id="main" className="m-body">
          {denied ? <Empty icon="lock" title="You do not have access to this page" text="Ask your administrator if you need a different role." action={<Btn href={homeUrl}>Go home</Btn>} /> : children}
        </main>
      </div>
    </div>
  );
}

export function Head({ eye, title, sub, children }: { eye?: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16,
        flex: 'none',
        width: '100%',
        minWidth: 0,
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0, maxWidth: '100%' }}>
        {eye && <div className="m-eye">{eye}</div>}
        <h1
          className="m-h1"
          style={{
            overflowWrap: 'break-word',
            wordBreak: 'normal',
            hyphens: 'auto',
            lineHeight: 1.25,
            margin: '2px 0 0',
          }}
        >
          {title}
        </h1>
        {sub && (
          <div
            className="m-sub"
            style={{
              marginTop: 4,
              overflowWrap: 'break-word',
              wordBreak: 'normal',
            }}
          >
            {sub}
          </div>
        )}
      </div>

      {children && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            flexShrink: 0,
            alignSelf: 'flex-start',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
