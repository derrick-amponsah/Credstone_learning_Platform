'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell, { Head } from '@/components/Shell';
import { Alert, Btn, Disc, ErrorBox, I, Ic, Loading, Pill, Empty } from '@/components/ui';
import { api, fmtDate, useApi } from '@/lib/api';

export default function Credentials() {
  const router = useRouter();
  const { data, error, loading } = useApi('/credentials');
  const [selId, setSelId] = useState<string | null>(null);
  const [crit, setCrit] = useState<any[] | null>(null);
  const [copied, setCopied] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [renewMsg, setRenewMsg] = useState<any>(null);

  const cur = data?.credentials.find((c: any) => c.id === selId) || data?.selected;
  const verify = (c: any) => `${window.location.origin}/verify/${c.code}`;
  async function pick(c: any) { setSelId(c.id); setCrit(await api(`/credentials/${c.id}/criteria`)); }
  async function copy(c: any) { await navigator.clipboard.writeText(verify(c)); setCopied('Verify link copied.'); setTimeout(() => setCopied(''), 2500); }
  async function share(c: any) { if (navigator.share) { try { await navigator.share({ title: c.title, url: verify(c) }); return; } catch {} } copy(c); }

  async function handleRenew(c: any) {
    setRenewing(true);
    setRenewMsg(null);
    try {
      const res = await api<any>(`/credentials/${c.id}/renew`, { method: 'POST' });
      setRenewMsg({ k: 'ok', t: `Renewal cycle active for "${res.title}". Taking you to the course assessment...` });
      setTimeout(() => {
        router.push(`/courses/${res.courseId}`);
      }, 1000);
    } catch (e: any) {
      setRenewMsg({ k: 'warn', t: e.message || 'Renewal initiation failed.' });
      setRenewing(false);
    }
  }

  const criteria = crit ?? data?.selected?.criteria ?? [];
  return (
    <Shell>
      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <>
          <Head title="Credentials" sub="Issued only when the stated criteria are met." />
          {renewMsg && <Alert k={renewMsg.k}>{renewMsg.t}</Alert>}
          {!cur && !data.inProgress.length ? <Empty icon="award" title="No credentials yet" text="Finish a course and meet its criteria to earn your first one." action={<Btn href="/my-learning">Go to My Learning</Btn>} /> : (
            <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1 }}>
              {cur && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1.35, minWidth: 0 }}>
                  <div className="m-row" style={{ justifyContent: 'space-between' }}><h2 className="m-h2">{cur.title}</h2><Pill k={cur.expired ? 'req' : cur.renewSoon ? 'warn' : 'go'}>{cur.expired ? 'Expired' : cur.renewSoon ? 'Renew soon' : 'Valid'}</Pill></div>

                  {/* Renewal Alert & CTA */}
                  {(cur.renewSoon || cur.expired) && (
                    <div style={{ padding: '12px 16px', background: 'var(--highlight)', borderRadius: 10, border: '1.5px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                      <div className="m-row" style={{ gap: 10, flex: 1, minWidth: 240 }}>
                        <Ic n="clock" s={26} color="var(--navy)" />
                        <div>
                          <b style={{ color: 'var(--navy)' }}>{cur.expired ? 'Credential Expired' : 'Renewal Due Soon'}</b>
                          <div className="m-sub" style={{ fontSize: 13 }}>
                            {cur.expired ? 'Recertify to restore this credential to active status.' : 'Retake the assessment within 45 days to maintain regulatory currency.'}
                          </div>
                        </div>
                      </div>
                      <Btn onClick={() => handleRenew(cur)} disabled={renewing}>
                        <I n="award" s={16} />&nbsp; {renewing ? 'Preparing Re-assessment...' : 'Retake Certification / Renew'}
                      </Btn>
                    </div>
                  )}

                  <div style={{ border: '3px solid var(--gold)', borderRadius: 14, background: '#fff', padding: 10 }}>
                    <div style={{ border: '1px solid var(--gold)', borderRadius: 8, padding: '28px 34px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', background: 'var(--surface)' }}>
                      <svg width="52" height="52" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#1b2d52" /><path d="M43.5 22.4A15 15 0 1 0 43.5 41.6" fill="none" stroke="#C5A059" strokeWidth="7" /><rect x="37" y="29" width="9" height="6" rx="1.5" fill="#EFE8D8" /></svg>
                      <div className="m-eye" style={{ marginTop: 6 }}>Credstone Learning</div><div className="m-sub">This certifies that</div>
                      <div style={{ font: '600 38px var(--font-serif)', color: 'var(--navy)' }}>{cur.holder}</div><div className="m-sub">has met all criteria for</div>
                      <div style={{ font: '600 26px var(--font-serif)', color: 'var(--navy)' }}>{cur.title}</div>
                      <div className="m-row" style={{ gap: 40, marginTop: 12, color: 'var(--ink-muted)', fontSize: 15, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div><b style={{ color: 'var(--navy)' }}>{fmtDate(cur.issuedOn)}</b><br />Issued</div><div><b style={{ color: 'var(--navy)' }}>{fmtDate(cur.validUntil)}</b><br />Valid until</div><div><b style={{ color: 'var(--navy)' }}>{cur.code}</b><br />Credential ID</div></div>
                    </div>
                  </div>
                  <div className="m-row" style={{ gap: 12, flexWrap: 'wrap' }}>
                    <a className="m-btn" href={`/api/credentials/${cur.id}/certificate.pdf`}><I n="download" s={18} />&nbsp; Download certificate</a>
                    <Btn kind="sec" onClick={() => share(cur)}><I n="share" s={18} />&nbsp; Share</Btn>
                    <Btn kind="sec" onClick={() => copy(cur)}><I n="link" s={18} />&nbsp; Copy verify link</Btn>
                    <Btn kind="sec" onClick={() => handleRenew(cur)} disabled={renewing} title="Begin re-assessment">
                      <I n="award" s={18} />&nbsp; {renewing ? 'Starting...' : 'Renew / Recertify'}
                    </Btn>
                  </div>
                  {copied && <Alert k="ok">{copied}</Alert>}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0 }}>
                <div className="m-card" style={{ padding: '16px 0 6px', overflow: 'hidden' }}><h2 className="m-h3" style={{ marginBottom: 8, padding: '0 18px' }}>All credentials</h2>
                  {data.credentials.map((c: any, i: number) => (
                    <button key={c.id} onClick={() => pick(c)} className="m-row row-link" style={{ gap: 14, padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 0, width: '100%', background: c.id === cur?.id ? 'var(--highlight)' : 'none', border: 0, textAlign: 'left', font: 'inherit' }}>
                      <Disc n="award" sand /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{c.title}</div><div className="m-sub" style={{ fontSize: 15 }}>{c.renewSoon ? `Renewal due ${fmtDate(c.validUntil, { day: 'numeric', month: 'short', year: 'numeric' })}` : `Issued ${fmtDate(c.issuedOn, { day: 'numeric', month: 'short', year: 'numeric' })} · Valid to ${fmtDate(c.validUntil, { day: 'numeric', month: 'short', year: 'numeric' })}`}</div></div>
                      <Pill k={c.expired ? 'req' : c.renewSoon ? 'warn' : 'go'}>{c.expired ? 'Expired' : c.renewSoon ? 'Renew soon' : 'Valid'}</Pill></button>))}
                  {data.inProgress.map((p: any) => (
                    <a key={p.courseId} href={`/courses/${p.courseId}`} className="m-row row-link" style={{ gap: 14, padding: '11px 16px', borderTop: '1px solid var(--border)' }}>
                      <Disc n="users" sand /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--navy)' }}>{p.title}</div><div className="m-sub" style={{ fontSize: 15 }}>{p.met} of {p.total} criteria met</div></div><Pill>In progress</Pill></a>))}
                </div>
                {cur && (
                  <div className="m-card"><h2 className="m-h3">Criteria met</h2>
                    {criteria.map((x: any) => <div key={x.key} className="m-row" style={{ gap: 10, marginTop: 10 }}><Ic n={x.met ? 'checkc' : 'target'} s={22} color={x.met ? 'var(--success-ink)' : 'var(--navy)'} /><span>{x.label}</span></div>)}</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
