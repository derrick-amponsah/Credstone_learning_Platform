'use client';
import { useRef, useState } from 'react';
import Shell, { Head } from '@/components/Shell';
import AdminTabs from '@/components/AdminTabs';
import { Alert, Btn, ErrorBox, Field, I, Loading, Pill, Select } from '@/components/ui';
import { api, fmtDate, useApi } from '@/lib/api';

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const head = lines.shift()!.split(',').map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ''));
  const col = (names: string[]) => head.findIndex((h) => names.includes(h));
  const [ie, ii, it] = [col(['email', 'workemail']), col(['learnerid', 'employeeid', 'id']), col(['team', 'teamname', 'group'])];
  return lines.map((l) => { const c = l.split(',').map((x) => x.trim()); return { email: ie >= 0 ? c[ie] : undefined, employeeId: ii >= 0 ? c[ii] : undefined, team: it >= 0 ? c[it] : '' }; }).filter((r) => r.team);
}

export default function AdminGroups() {
  const { data, error, loading, reload } = useApi('/admin/groups');
  const [term, setTerm] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<any>(null);
  const [drag, setDrag] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const act = async (fn: () => Promise<any>, ok?: string) => { setMsg(null); try { const r = await fn(); if (ok) setMsg({ k: 'ok', t: ok }); await reload(); return r; } catch (e: any) { setMsg({ k: 'warn', t: e.message }); } };
  async function onFile(f?: File) {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) return setMsg({ k: 'warn', t: 'Save your spreadsheet as CSV and drop it again. Columns: email or employee ID, and team.' });
    const rows = parseCsv(await f.text());
    if (!rows.length) return setMsg({ k: 'warn', t: 'No rows found. The first row must name the columns, such as email and team.' });
    const r = await act(() => api('/admin/groups/import', { body: { rows } }));
    if (r) setMsg({ k: r.needsReview ? 'warn' : 'ok', t: `${r.updated} people moved. ${r.needsReview} rows need review${r.unmatched?.length ? ': ' + r.unmatched.slice(0, 3).map((u: any) => u.email || u.employeeId).join(', ') : ''}.` });
  }
  const groups = (data?.groups || []).filter((g: any) => g.name.toLowerCase().includes(term.toLowerCase()));
  return (
    <Shell allow={['admin']}>
      <Head eye="Administrator" title="Groups and teams" sub="Supervisors see only the team they are assigned to. Access follows membership." />
      <AdminTabs />
      {msg && <Alert k={msg.k}>{msg.t}</Alert>}
      <div className="m-row" style={{ gap: 20, alignItems: 'flex-start', flex: 1, minHeight: 0 }}>
        <div className="m-card" style={{ flex: 1.5, paddingBottom: 6, minWidth: 0 }}>
          <div className="m-row" style={{ justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
            <div className="m-in" style={{ height: 42, width: 300, fontSize: 15 }}><I n="search" s={18} /><input aria-label="Search teams" placeholder="Search teams" value={term} onChange={(e) => setTerm(e.target.value)} /></div>
          </div>
          {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
            <div style={{ overflowX: 'auto' }}><table className="m-tbl">
              <thead><tr><th>Team</th><th>Supervisor</th><th>Members</th><th>Source</th><th>Membership</th></tr></thead>
              <tbody>{groups.map((g: any) => (
                <tr key={g.id}>
                  <td><b style={{ color: 'var(--navy)' }}>{g.name}</b></td>
                  <td><div className="m-in" style={{ height: 36, fontSize: 15, padding: '0 8px', border: '1px solid var(--border)' }}>
                    <select aria-label={`Supervisor for ${g.name}`} value={g.supervisorId || ''} onChange={(e) => act(() => api(`/admin/groups/${g.id}`, { method: 'PATCH', body: { supervisorId: e.target.value || null } }), 'Supervisor updated.')}>
                      <option value="">No supervisor</option>{data.supervisors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select></div></td>
                  <td>{g.members}</td><td>{g.source}</td>
                  <td><Pill k={g.membership === 'Current' ? 'go' : g.membership === 'Check due' ? 'warn' : 'req'}>{g.membership}</Pill>
                    {g.membership === 'Check due' && <button className="m-link" style={{ fontSize: 14, marginLeft: 8 }} onClick={() => act(() => api(`/admin/groups/${g.id}`, { method: 'PATCH', body: { checked: true } }), 'Marked as checked.')}>Mark checked</button>}</td>
                </tr>))}</tbody>
            </table></div>
          )}
          <form className="m-row" style={{ gap: 12, padding: '14px 0 8px', alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); act(() => api('/admin/groups', { body: { name } }), 'Team created.').then(() => setName('')); }}>
            <div style={{ flex: 1 }}><Field label="New team" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Team name" required /></div>
            <Btn type="submit" sm><I n="plus" s={16} />&nbsp; New team</Btn>
          </form>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          <div className="m-card">
            <div className="m-h3">Import a team list</div><div className="m-sub" style={{ fontSize: 15, margin: '4px 0 12px' }}>A CSV with an email or employee ID and a team name on each row.</div>
            <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
              style={{ border: '2px dashed var(--field-border)', borderRadius: 10, padding: 16, textAlign: 'center', background: drag ? 'var(--highlight)' : 'var(--surface)' }}>
              <span style={{ color: 'var(--navy)', display: 'flex', justifyContent: 'center' }}><I n="upload" s={30} /></span>
              <button className="m-link" onClick={() => file.current?.click()}>Drop a CSV here, or choose a file</button>
              <input ref={file} type="file" accept=".csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </div>
            {data?.lastImport && <div style={{ marginTop: 12 }}><Alert k="warn"><span style={{ fontSize: 15 }}>Last import, {fmtDate(data.lastImport.at, { day: 'numeric', month: 'short' })}: {data.lastImport.needsReview} rows need review.</span></Alert></div>}
          </div>
          <div className="m-card"><div className="m-h3">Membership owner</div>
            <div className="m-row" style={{ gap: 12, marginTop: 10 }}><span className="m-av" style={{ width: 44, height: 44, background: 'var(--sand)', color: 'var(--navy)' }}>{(data?.owner || '?').split(' ').map((x: string) => x[0]).join('')}</span>
              <div style={{ flex: 1 }}><b style={{ color: 'var(--navy)' }}>{data?.owner || 'Not set'}</b><div className="m-sub" style={{ fontSize: 15 }}>{data?.nextCheck ? `Next monthly check: ${fmtDate(data.nextCheck, { day: 'numeric', month: 'short' })}` : 'Check not yet recorded'}</div></div></div>
            <div className="m-sub" style={{ fontSize: 15, marginTop: 10 }}>The platform is only as accurate as the list it is given.</div></div>
        </div>
      </div>
    </Shell>
  );
}
