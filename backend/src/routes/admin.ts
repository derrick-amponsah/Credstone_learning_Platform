import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { q, one, tx } from '../db';
import { audit, notify, sendMail } from '../audit';
import { dropRoles } from '../cache';
import { config } from '../config';

const roleKeys = z.array(z.string()).min(1, 'Choose at least one role.');

async function roleRows(keys: string[]) {
  const rows = await q('select id, key, name from roles where key = any($1)', [keys]);
  if (rows.length !== new Set(keys).size) throw Object.assign(new Error('One of those roles does not exist.'), { statusCode: 400 });
  return rows;
}

export default async function (app: FastifyInstance) {
  const A = { preHandler: app.role('admin') };

  app.get('/admin/roles', A, async () =>
    q(`select r.key, r.name, r.description,
         (select count(*)::int from user_roles ur join users u on u.id = ur.user_id where ur.role_id = r.id and u.status = 'active') as people
       from roles r order by r.id`)
  );

  app.get('/admin/users', A, async (req) => {
    const { status, q: term } = req.query as any;
    const users = await q(
      `select u.id, u.first_name, u.last_name, u.email, u.employee_id, u.status, u.source, u.created_at, u.reject_reason,
         coalesce(array_agg(r.key order by r.id) filter (where r.key is not null), '{}') as roles,
         (select g.name from memberships m join groups g on g.id = m.group_id where m.user_id = u.id and m.ends_on is null limit 1) as team
       from users u left join user_roles ur on ur.user_id = u.id left join roles r on r.id = ur.role_id
       where ($1::text is null or u.status = $1) and ($2::text is null or u.email ilike $2 or (u.first_name || ' ' || u.last_name) ilike $2)
       group by u.id order by (u.status = 'pending') desc, u.created_at desc limit 300`,
      [status || null, term ? `%${term}%` : null]
    );
    const counts = await q('select status, count(*)::int n from users group by status');
    return { users, counts: Object.fromEntries(counts.map((c) => [c.status, c.n])) };
  });

  // Path 1: approve a sign-up and assign a role (and optionally a team).
  app.post('/admin/users/:id/approve', A, async (req, reply) => {
    const { id } = req.params as any;
    const b = z.object({ roles: roleKeys, groupId: z.string().uuid().nullish() }).parse(req.body);
    const u = await one('select id, email, first_name, status from users where id = $1', [id]);
    if (!u) return reply.code(404).send({ error: 'That user was not found.' });
    if (u.status !== 'pending') return reply.code(409).send({ error: 'This sign-up has already been reviewed.' });
    const roles = await roleRows(b.roles);
    await tx(async (t) => {
      await t("update users set status = 'active', reviewed_by = $2, reviewed_at = now() where id = $1", [id, req.uid]);
      for (const r of roles) await t('insert into user_roles(user_id, role_id, granted_by) values ($1,$2,$3)', [id, r.id, req.uid]);
      if (b.groupId) await t('insert into memberships(user_id, group_id) values ($1,$2)', [id, b.groupId]);
    });
    await dropRoles(id);
    const names = roles.map((r) => r.name).join(', ');
    await notify(id, 'account', 'Your account is approved', `You can now use Credstone Learning as: ${names}.`, '/');
    sendMail(u.email, 'Your Credstone Learning account is approved', `Hi ${u.firstName}, you can now sign in: ${config.appUrl}/signin (role: ${names}).`);
    await audit(req.uid, 'user.approve', 'user', id, { roles: b.roles, groupId: b.groupId ?? null });
    return { ok: true };
  });

  app.post('/admin/users/:id/reject', A, async (req, reply) => {
    const { id } = req.params as any;
    const b = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body ?? {});
    const r = await q("update users set status = 'rejected', reviewed_by = $2, reviewed_at = now(), reject_reason = $3 where id = $1 and status = 'pending' returning id", [id, req.uid, b.reason || null]);
    if (!r.length) return reply.code(409).send({ error: 'This sign-up is not waiting for review.' });
    await audit(req.uid, 'user.reject', 'user', id, { reason: b.reason ?? null });
    return { ok: true };
  });

  // Path 2: the administrator creates the account, assigns the role and issues sign-in credentials straight away.
  app.post('/admin/users/issue', A, async (req, reply) => {
    const b = z
      .object({
        firstName: z.string().trim().min(1, 'Enter a first name.'),
        lastName: z.string().trim().min(1, 'Enter a last name.'),
        email: z.string().trim().toLowerCase().email('Enter a valid work email.'),
        employeeId: z.string().trim().optional(),
        roles: roleKeys,
        groupId: z.string().uuid().nullish(),
      })
      .parse(req.body);
    if (await one('select 1 x from users where email = $1', [b.email])) return reply.code(409).send({ error: 'An account with this email already exists. Find it in the list and change its role instead.' });
    const roles = await roleRows(b.roles);
    const temporaryPassword = `Cs-${crypto.randomBytes(6).toString('hex')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const hash = await bcrypt.hash(temporaryPassword, 10);
    const user = await tx(async (t) => {
      const [u] = await t(
        `insert into users(first_name, last_name, email, employee_id, password_hash, status, source, must_change_password, reviewed_by, reviewed_at)
         values ($1,$2,$3,$4,$5,'active','admin_issued',true,$6,now()) returning id, first_name, last_name, email`,
        [b.firstName, b.lastName, b.email, b.employeeId || null, hash, req.uid]
      );
      for (const r of roles) await t('insert into user_roles(user_id, role_id, granted_by) values ($1,$2,$3)', [u.id, r.id, req.uid]);
      if (b.groupId) await t('insert into memberships(user_id, group_id) values ($1,$2)', [u.id, b.groupId]);
      return u;
    });
    await audit(req.uid, 'user.issue', 'user', user.id, { roles: b.roles, groupId: b.groupId ?? null });
    // Shown once. The person must choose their own password at first sign-in.
    return reply.code(201).send({ user, signIn: { url: `${config.appUrl}/signin`, email: user.email, temporaryPassword } });
  });

  app.put('/admin/users/:id/roles', A, async (req, reply) => {
    const { id } = req.params as any;
    const b = z.object({ roles: roleKeys }).parse(req.body);
    const u = await one("select id from users where id = $1 and status in ('active','suspended')", [id]);
    if (!u) return reply.code(404).send({ error: 'That user was not found.' });
    if (id === req.uid && !b.roles.includes('admin')) return reply.code(400).send({ error: 'You cannot remove your own administrator role.' });
    const roles = await roleRows(b.roles);
    await tx(async (t) => {
      await t('delete from user_roles where user_id = $1', [id]);
      for (const r of roles) await t('insert into user_roles(user_id, role_id, granted_by) values ($1,$2,$3)', [id, r.id, req.uid]);
    });
    await dropRoles(id);
    await audit(req.uid, 'user.roles', 'user', id, { roles: b.roles });
    return { ok: true };
  });

  const setStatus = (path: string, from: string[], to: string, action: string) =>
    app.post(path, A, async (req, reply) => {
      const { id } = req.params as any;
      if (id === req.uid) return reply.code(400).send({ error: 'You cannot change your own account status.' });
      const r = await q('update users set status = $2 where id = $1 and status = any($3) returning id', [id, to, from]);
      if (!r.length) return reply.code(409).send({ error: 'That account cannot be changed this way.' });
      await dropRoles(id);
      await audit(req.uid, action, 'user', id);
      return { ok: true };
    });
  setStatus('/admin/users/:id/suspend', ['active'], 'suspended', 'user.suspend');
  setStatus('/admin/users/:id/reactivate', ['suspended'], 'active', 'user.reactivate');

  // Groups and teams
  app.get('/admin/groups', A, async () => {
    const rows = await q(
      `select g.id, g.name, g.source, g.last_checked_on,
         (select count(*)::int from memberships m where m.group_id = g.id and m.ends_on is null) as members,
         (select sa.supervisor_id from supervisor_assignments sa where sa.group_id = g.id and sa.ends_on is null limit 1) as supervisor_id,
         (select u.first_name || ' ' || u.last_name from supervisor_assignments sa join users u on u.id = sa.supervisor_id where sa.group_id = g.id and sa.ends_on is null limit 1) as supervisor
       from groups g where g.kind = 'group' order by g.name`
    );
    const groups = rows.map((g) => ({
      ...g,
      membership: !g.supervisor ? 'Needs owner' : !g.lastCheckedOn || Date.now() - new Date(g.lastCheckedOn).getTime() > 30 * 86400000 ? 'Check due' : 'Current',
    }));
    const last = await one("select created_at, detail from audit_log where action = 'groups.import' order by id desc limit 1");
    const owner = await one(
      "select u.first_name || ' ' || u.last_name as name from app_settings s join users u on u.id::text = s.value #>> '{}' where s.key = 'membership_owner'"
    );
    const oldest = await one("select min(last_checked_on) as d from groups where kind = 'group'");
    const supervisors = await q("select u.id, u.first_name || ' ' || u.last_name as name from users u join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id where r.key = 'supervisor' and u.status = 'active' order by 2");
    return { groups, lastImport: last ? { at: last.createdAt, needsReview: last.detail.needsReview } : null, owner: owner?.name ?? null, nextCheck: oldest?.d ? new Date(new Date(oldest.d).getTime() + 30 * 86400000) : null, supervisors };
  });

  app.post('/admin/groups', A, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1, 'Enter a team name.'), supervisorId: z.string().uuid().nullish() }).parse(req.body);
    if (await one('select 1 x from groups where lower(name) = lower($1)', [b.name])) return reply.code(409).send({ error: 'A team with that name already exists.' });
    const g = await one("insert into groups(name, last_checked_on) values ($1, current_date) returning id", [b.name]);
    if (b.supervisorId) await q('insert into supervisor_assignments(supervisor_id, group_id) values ($1,$2)', [b.supervisorId, g.id]);
    await audit(req.uid, 'group.create', 'group', g.id, { name: b.name });
    return reply.code(201).send(g);
  });

  app.patch('/admin/groups/:id', A, async (req) => {
    const { id } = req.params as any;
    const b = z.object({ supervisorId: z.string().uuid().nullish(), checked: z.boolean().optional() }).parse(req.body);
    if (b.supervisorId !== undefined) {
      await q('update supervisor_assignments set ends_on = current_date where group_id = $1 and ends_on is null', [id]);
      if (b.supervisorId) await q('insert into supervisor_assignments(supervisor_id, group_id) values ($1,$2)', [b.supervisorId, id]);
    }
    if (b.checked) await q('update groups set last_checked_on = current_date where id = $1', [id]);
    await audit(req.uid, 'group.update', 'group', id, b);
    return { ok: true };
  });

  // CSV import: rows of {email or employeeId, team}. Unmatched rows are returned for review.
  app.post('/admin/groups/import', A, async (req) => {
    const b = z.object({ rows: z.array(z.object({ email: z.string().optional(), employeeId: z.string().optional(), team: z.string().min(1) })).max(5000) }).parse(req.body);
    let updated = 0;
    const unmatched: any[] = [];
    for (const row of b.rows) {
      const u = row.email
        ? await one('select id from users where email = $1', [row.email.trim().toLowerCase()])
        : row.employeeId ? await one('select id from users where employee_id = $1', [row.employeeId.trim()]) : null;
      if (!u) { unmatched.push({ ...row, reason: 'No matching learner' }); continue; }
      let g = await one('select id from groups where lower(name) = lower($1)', [row.team.trim()]);
      if (!g) g = await one("insert into groups(name, source) values ($1, 'Spreadsheet import') returning id", [row.team.trim()]);
      const cur = await one('select group_id from memberships where user_id = $1 and ends_on is null', [u.id]);
      if (cur?.groupId === g.id) continue;
      await q('update memberships set ends_on = current_date where user_id = $1 and ends_on is null', [u.id]);
      await q('insert into memberships(user_id, group_id) values ($1,$2)', [u.id, g.id]);
      updated++;
    }
    await audit(req.uid, 'groups.import', 'group', null, { rows: b.rows.length, updated, needsReview: unmatched.length });
    return { updated, needsReview: unmatched.length, unmatched: unmatched.slice(0, 50) };
  });

  app.get('/admin/audit', A, async (req) => {
    const limit = Math.min(Number((req.query as any).limit) || 100, 500);
    return q(
      `select a.id, a.created_at, a.action, a.entity, a.entity_id, a.detail, u.first_name || ' ' || u.last_name as actor
       from audit_log a left join users u on u.id = a.actor_id order by a.id desc limit $1`,
      [limit]
    );
  });

  app.get('/admin/retention', A, async () => ({ policies: await q('select data_type, months, note from retention_policies order by data_type'), minGroupSize: config.minGroupSize }));
}
