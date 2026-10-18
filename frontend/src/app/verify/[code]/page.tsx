'use client';
import { Alert, Disc, Logo, Loading } from '@/components/ui';
import { fmtDate, useApi } from '@/lib/api';

// Public page: anyone with a verify link can check a credential.
export default function Verify({ params }: { params: { code: string } }) {
  const { data: c, error, loading } = useApi(`/verify/${params.code}`);
  return (
    <div className="m-app app" style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <div className="m-card" style={{ maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center', padding: 32 }}>
        <Logo size={52} /><div className="m-eye">Credstone Learning · Credential check</div>
        {loading ? <Loading /> : error ? <Alert k="warn">{error.message}</Alert> : (
          <>
            <Disc n="award" size={64} /><div className="m-h1" style={{ fontSize: 30 }}>{c.holder}</div>
            <div className="m-sub">has met all criteria for</div><div className="m-h2">{c.title}</div>
            <div className={`m-pill ${c.valid ? 'go' : 'req'}`}>{c.valid ? 'Valid' : 'Not valid'}</div>
            <div className="m-sub" style={{ fontSize: 15 }}>Issued {fmtDate(c.issuedOn)} · Valid until {fmtDate(c.validUntil)} · {c.code}</div>
          </>
        )}
      </div>
    </div>
  );
}
