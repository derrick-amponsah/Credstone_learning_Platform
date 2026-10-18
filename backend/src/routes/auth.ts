import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { q, one } from '../db';
import { COOKIE } from '../auth';
import { config } from '../config';
import { audit, notifyRole, sendMail } from '../audit';

const COMMON = ['password1234', '123456789012', 'qwertyuiop12', 'welcome12345', 'passw0rd1234', 'letmein12345'];
export const pwSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .regex(/[0-9]/, 'Add a number.')
  .regex(/[a-z]/, 'Add a lower case letter.')
  .regex(/[A-Z]/, 'Add an upper case letter.')
  .refine((p) => !COMMON.includes(p.toLowerCase()), 'Choose a less common password.');

const sha = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const DUMMY = bcrypt.hashSync('not-a-real-password', 10);

async function profile(id: string, roles: string[]) {
  const u = await one('select id, first_name, last_name, email, employee_id, level, prefs, must_change_password from users where id = $1', [id]);
  const team = await one('select g.name from memberships m join groups g on g.id = m.group_id where m.user_id = $1 and m.ends_on is null limit 1', [id]);
  const sup = team
    ? await one(
        `select s.first_name || ' ' || s.last_name as name from memberships m
         join supervisor_assignments sa on sa.group_id = m.group_id and sa.ends_on is null
         join users s on s.id = sa.supervisor_id where m.user_id = $1 and m.ends_on is null limit 1`,
        [id]
      )
    : null;
  return { ...u, roles, team: team?.name ?? null, supervisor: sup?.name ?? null };
}

export default async function (app: FastifyInstance) {
  // Path 1: a new user signs up. They have no role and cannot sign in until an administrator assigns one.
  app.post('/auth/signup', { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } }, async (req, reply) => {
    const b = z
      .object({
        firstName: z.string().trim().min(1, 'Enter your first name.'),
        lastName: z.string().trim().min(1, 'Enter your last name.'),
        email: z.string().trim().toLowerCase().email('Enter a valid work email.'),
        employeeId: z.string().trim().optional(),
        password: pwSchema,
        agree: z.literal(true, { errorMap: () => ({ message: 'Agree to the Learning Data and Privacy Notice to continue.' }) }),
      })
      .parse(req.body);
    if (await one('select 1 x from users where email = $1', [b.email])) return reply.code(409).send({ error: 'An account with this email already exists. Try signing in.' });
    const hash = await bcrypt.hash(b.password, 10);
    const u = await one(
      "insert into users(first_name, last_name, email, employee_id, password_hash, status, source) values ($1,$2,$3,$4,$5,'pending','signup') returning id",
      [b.firstName, b.lastName, b.email, b.employeeId || null, hash]
    );
    // The platform administrator is notified and assigns a role on their Users page.
    await notifyRole('admin', 'signup', 'New sign-up waiting for a role', `${b.firstName} ${b.lastName} (${b.email}) signed up. Assign a role to let them in.`, '/admin/users?status=pending');
    await audit(u.id, 'user.signup', 'user', u.id, { email: b.email });
    return reply.code(201).send({ status: 'pending' });
  });

  app.post('/auth/signin', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    const b = z.object({ email: z.string().trim().toLowerCase(), password: z.string().min(1) }).parse(req.body);
    const u = await one('select id, password_hash, status, must_change_password from users where email = $1', [b.email]);
    const ok = await bcrypt.compare(b.password, u?.passwordHash || DUMMY);
    if (!u || !ok) return reply.code(401).send({ error: 'The email or password is not right. Check both and try again.' });
    if (u.status === 'pending') return reply.code(403).send({ code: 'PENDING', error: 'Your account is waiting for an administrator to assign a role. You will be able to sign in once it is approved.' });
    if (u.status !== 'active') return reply.code(403).send({ code: 'DISABLED', error: 'This account cannot sign in. Contact your administrator.' });
    await q('update users set last_login_at = now() where id = $1', [u.id]);
    const token = app.jwt.sign({ sub: u.id });
    reply.setCookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', secure: config.cookieSecure, maxAge: 8 * 3600 });
    return { ok: true, mustChangePassword: u.mustChangePassword };
  });

  app.post('/auth/signout', async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/auth/me', { preHandler: app.role() }, async (req) => profile(req.uid, req.roles));

  app.patch('/auth/me', { preHandler: app.role() }, async (req) => {
    const b = z
      .object({
        firstName: z.string().trim().min(1).optional(),
        lastName: z.string().trim().min(1).optional(),
        level: z.enum(['Just starting', 'Comfortable', 'Advanced']).optional(),
        prefs: z.record(z.any()).optional(),
      })
      .parse(req.body);
    await q(
      `update users set first_name = coalesce($2, first_name), last_name = coalesce($3, last_name), level = coalesce($4, level),
       prefs = prefs || $5::jsonb where id = $1`,
      [req.uid, b.firstName ?? null, b.lastName ?? null, b.level ?? null, JSON.stringify(b.prefs ?? {})]
    );
    return profile(req.uid, req.roles);
  });

  app.post('/auth/change-password', { preHandler: app.role() }, async (req, reply) => {
    const b = z.object({ current: z.string().min(1), password: pwSchema }).parse(req.body);
    const u = await one('select password_hash from users where id = $1', [req.uid]);
    if (!(await bcrypt.compare(b.current, u.passwordHash))) return reply.code(400).send({ error: 'The current password is not right.' });
    await q('update users set password_hash = $2, must_change_password = false where id = $1', [req.uid, await bcrypt.hash(b.password, 10)]);
    await audit(req.uid, 'user.password_change', 'user', req.uid);
    return { ok: true };
  });

  // The answer never reveals whether an address has an account.
  app.post('/auth/reset-request', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (req) => {
    const b = z.object({ email: z.string().trim().toLowerCase().email() }).parse(req.body);
    const u = await one("select id from users where email = $1 and status = 'active'", [b.email]);
    if (u) {
      const token = crypto.randomBytes(32).toString('hex');
      await q("insert into password_resets(token_hash, user_id, expires_at) values ($1,$2, now() + interval '30 minutes')", [sha(token), u.id]);
      sendMail(b.email, 'Reset your Credstone Learning password', `Choose a new password (link works for 30 minutes):\n${config.appUrl}/reset?token=${token}`);
    }
    return { ok: true };
  });

  app.post('/auth/reset', async (req, reply) => {
    const b = z.object({ token: z.string().min(10), password: pwSchema }).parse(req.body);
    const r = await one('select user_id from password_resets where token_hash = $1 and used_at is null and expires_at > now()', [sha(b.token)]);
    if (!r) return reply.code(400).send({ error: 'This reset link has expired. Request a new one.' });
    await q('update users set password_hash = $2, must_change_password = false where id = $1', [r.userId, await bcrypt.hash(b.password, 10)]);
    await q('update password_resets set used_at = now() where token_hash = $1', [sha(b.token)]);
    await audit(r.userId, 'user.password_reset', 'user', r.userId);
    return { ok: true };
  });
}
