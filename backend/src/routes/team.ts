import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { q, one } from '../db';
import { audit, notify } from '../audit';
import { config } from '../config';
import { criteria, maybeIssue } from '../services/credentials';

const err = (m: string, code = 400) => Object.assign(new Error(m), { statusCode: code });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function csvEscape(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// A supervisor sees only the groups they are currently assigned to. Checked here on the server for every request.
const myGroups = (uid: string) =>
  q('select g.id, g.name from supervisor_assignments sa join groups g on g.id = sa.group_id where sa.supervisor_id = $1 and sa.ends_on is null order by g.name', [uid]);
const canSee = async (uid: string, learnerId: string) =>
  !!(await one(
    `select 1 x from memberships m join supervisor_assignments sa on sa.group_id = m.group_id and sa.supervisor_id = $1 and sa.ends_on is null
     where m.user_id = $2 and m.ends_on is null`, [uid, learnerId]));

export default async function (app: FastifyInstance) {
  const SUP = { preHandler: app.role('supervisor') };
  const OVER = { preHandler: app.role('training_owner', 'admin') };

  app.get('/team/export/csv', SUP, async (req, reply) => {
    const groups = await myGroups(req.uid);
    if (!groups.length) throw err('No team found.', 404);
    const want = (req.query as any).groupId;
    const group = want ? groups.find((g) => g.id === want) : groups[0];
    if (!group) throw err('You can only see the teams you supervise.', 403);

    const members = await q(
      `select u.id, u.first_name, u.last_name, u.email, g.name as group_name
       from memberships m
       join users u on u.id = m.user_id
       join groups g on g.id = m.group_id
       where m.group_id = $1 and m.ends_on is null
       order by u.last_name, u.first_name`,
      [group.id]
    );

    const rows: string[] = [
      ['Learner Name', 'Email', 'Team', 'Course', 'Progress (%)', 'Status', 'Due Date'].map(csvEscape).join(','),
    ];

    for (const m of members) {
      const en = await q(
        `select e.course_id, e.progress, e.status, e.due_on, c.title, c.requires_observation
         from enrolments e join courses c on c.id = e.course_id
         where e.user_id = $1 and c.kind = 'course'
         order by e.updated_at desc`,
        [m.id]
      );
      if (!en.length) {
        rows.push([`${m.firstName} ${m.lastName}`, m.email, m.groupName, 'None', '0%', 'No assignments', 'N/A'].map(csvEscape).join(','));
        continue;
      }
      for (const e of en) {
        let status = e.status === 'completed' ? 'Completed' : 'In progress';
        if (e.status !== 'completed' && e.dueOn && new Date(e.dueOn) < new Date()) status = 'Overdue';
        rows.push([
          `${m.firstName} ${m.lastName}`,
          m.email,
          m.groupName,
          e.title,
          `${e.progress}%`,
          status,
          e.dueOn ? new Date(e.dueOn).toISOString().split('T')[0] : 'N/A',
        ].map(csvEscape).join(','));
      }
    }

    await audit(req.uid, 'team.export_csv', 'group', group.id);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="team-${group.name.toLowerCase().replace(/\\s+/g, '-')}-compliance.csv"`);
    return reply.send(rows.join('\r\n'));
  });

  app.get('/training/export/csv', OVER, async (req, reply) => {
    const records = await q(
      `select u.first_name || ' ' || u.last_name as learner, u.email, c.title as course, c.category,
              e.status, e.progress, e.due_on, e.completed_at, coalesce(cr.code, 'None') as credential_code
       from enrolments e
       join users u on u.id = e.user_id
       join courses c on c.id = e.course_id
       left join credentials cr on cr.user_id = e.user_id and cr.course_id = e.course_id
       order by c.title, u.last_name`
    );
    const rows = [
      ['Learner Name', 'Email', 'Course', 'Category', 'Progress (%)', 'Status', 'Due Date', 'Completed Date', 'Credential Code'].map(csvEscape).join(','),
      ...records.map((r: any) => [
        r.learner,
        r.email,
        r.course,
        r.category,
        `${r.progress}%`,
        r.status,
        r.dueOn ? new Date(r.dueOn).toISOString().split('T')[0] : 'N/A',
        r.completedAt ? new Date(r.completedAt).toISOString().split('T')[0] : 'N/A',
        r.credentialCode,
      ].map(csvEscape).join(',')),
    ];
    await audit(req.uid, 'training.export_csv', 'system', 'all');
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', 'attachment; filename="credstone-learning-training-report.csv"');
    return reply.send(rows.join('\r\n'));
  });

  app.get('/team', SUP, async (req) => {
    const groups = await myGroups(req.uid);
    if (!groups.length) return { groups: [], group: null, counts: null, members: [] };
    const want = (req.query as any).groupId;
    const group = want ? groups.find((g) => g.id === want) : groups[0];
    if (!group) throw err('You can only see the teams you supervise.', 403);
    const members = await q('select u.id, u.first_name, u.last_name from memberships m join users u on u.id = m.user_id where m.group_id = $1 and m.ends_on is null order by u.last_name', [group.id]);
    const out: any[] = [];
    for (const m of members) {
      const en = await q(
        `select e.course_id, e.progress, e.status, e.due_on, c.title, c.requires_observation from enrolments e join courses c on c.id = e.course_id
         where e.user_id = $1 and c.kind = 'course' order by e.updated_at desc`, [m.id]);
      let status = en.length ? 'ready' : 'none', pick = en[0];
      for (const e of en) {
        if (e.status !== 'completed' && e.dueOn && new Date(e.dueOn) < new Date()) { status = 'overdue'; pick = e; break; }
        if (e.status !== 'completed' && e.requiresObservation && e.progress === 100) {
          const cr = await criteria(m.id, e.courseId);
          if (cr.filter((c) => c.key !== 'observation').every((c) => c.met) && !cr.find((c) => c.key === 'observation')?.met) { status = 'obs_pending'; pick = e; }
        }
        if (e.status !== 'completed' && status === 'ready') { status = 'in_progress'; pick = e; }
      }
      out.push({ id: m.id, name: `${m.firstName} ${m.lastName}`, course: pick?.title ?? null, courseId: pick?.courseId ?? null, progress: pick?.progress ?? 0, status });
    }
    await audit(req.uid, 'team.view', 'group', group.id);
    const n = (s: string) => out.filter((o) => o.status === s).length;
    return { groups, group, counts: { assigned: out.length, ready: n('ready'), overdue: n('overdue'), pending: n('obs_pending') }, members: out };
  });

  app.get('/team/observe/:learnerId', SUP, async (req) => {
    const { learnerId } = req.params as any;
    if (!(await canSee(req.uid, learnerId))) throw err('You can only record observations for your own team.', 403);
    const l = await one('select first_name, last_name from users where id = $1', [learnerId]);
    let courseId = (req.query as any).courseId;
    if (!courseId) {
      const e = await one(
        `select e.course_id from enrolments e join courses c on c.id = e.course_id where e.user_id = $1 and c.requires_observation
         and not exists (select 1 from observations o where o.learner_id = e.user_id and o.course_id = e.course_id) order by e.updated_at desc limit 1`, [learnerId]);
      courseId = e?.courseId;
    }
    if (!courseId) throw err('This learner has no observation waiting.', 404);
    const c = await one('select id, title, observation_items, requires_observation from courses where id = $1', [courseId]);
    const e = await one('select updated_at from enrolments where user_id = $1 and course_id = $2', [learnerId, courseId]);
    return { learner: { id: learnerId, name: `${l.firstName} ${l.lastName}` }, course: c, pendingSince: e?.updatedAt ?? null };
  });
  app.post('/team/observe/:learnerId', SUP, async (req) => {
    const { learnerId } = req.params as any;
    if (!(await canSee(req.uid, learnerId))) throw err('You can only record observations for your own team.', 403);
    const b = z.object({
      courseId: z.string().uuid(), ratings: z.array(z.enum(['not_seen', 'partly', 'observed'])).min(1),
      notes: z.string().trim().max(2000).optional(), followUpOn: z.string().nullish(),
    }).parse(req.body);
    const o = await one('insert into observations(learner_id, supervisor_id, course_id, ratings, notes, follow_up_on) values ($1,$2,$3,$4,$5,$6) returning id', [learnerId, req.uid, b.courseId, JSON.stringify(b.ratings), b.notes || null, b.followUpOn || null]);
    await notify(learnerId, 'feedback', 'Your supervisor recorded an observation', b.notes?.slice(0, 140) ?? null, `/courses/${b.courseId}`);
    await audit(req.uid, 'observation.record', 'observation', o.id, { learnerId });
    await maybeIssue(learnerId, b.courseId);
    return { ok: true };
  });

  // Training overview: totals only. Individual names only for the training owner; small groups are folded into "Other".
  app.get('/training/overview', OVER, async (req) => {
    const range = (req.query as any).range || '3m';
    const months = range === '12m' ? 12 : range === '1m' ? 1 : 3;
    const since = new Date(); since.setMonth(since.getMonth() - months);
    const delta = (now: number, before: number) => (before > 0 ? Math.round((100 * (now - before)) / before) : null);
    const ago = new Date(Date.now() - 30 * 86400000);
    const a = await one(
      `select (select count(*)::int from users u join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id where r.key = 'learner' and u.status = 'active') as learners,
              (select count(*)::int from users u join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id where r.key = 'learner' and u.status = 'active' and u.created_at <= $1) as learners_prev,
              (select count(*)::int from enrolments where status = 'in_progress') as prog, (select count(*)::int from enrolments where status = 'in_progress' and created_at <= $1) as prog_prev,
              (select count(*)::int from enrolments where status = 'completed') as done, (select count(*)::int from enrolments where status = 'completed' and completed_at <= $1) as done_prev,
              (select count(*)::int from credentials) as creds, (select count(*)::int from credentials where issued_on <= $1) as creds_prev`, [ago]);
    const series = [];
    for (let i = 5; i >= 0; i--) {
      const end = new Date(); end.setMonth(end.getMonth() - i + 1, 0); end.setHours(23, 59, 59);
      const r = await one('select count(*)::int total, count(*) filter (where completed_at <= $1)::int done from enrolments where created_at <= $1', [end]);
      series.push({ label: MONTHS[end.getMonth()], value: r.total ? Math.round((100 * r.done) / r.total) : 0 });
    }
    const cats = await q('select c.category, count(distinct e.user_id)::int n from enrolments e join courses c on c.id = e.course_id where e.created_at >= $1 group by c.category order by n desc', [since]);
    let other = 0; const shown: any[] = [];
    for (const c of cats) (c.n >= config.minGroupSize && c.category !== 'Other' ? shown.push(c) : (other += c.n));
    if (other) shown.push({ category: 'Other', n: other });
    const total = shown.reduce((s, c) => s + c.n, 0) || 1;
    const owner = req.roles.includes('training_owner');
    const recent = await q(
      `select u.first_name || ' ' || u.last_name as learner, c.title as course, e.status, coalesce(e.completed_at, e.updated_at) as at from enrolments e
       join users u on u.id = e.user_id join courses c on c.id = e.course_id where e.updated_at >= $1 order by e.updated_at desc limit 4`, [since]);
    const impact = await q('select label, basis, value_pct from impact_metrics order by id');
    return {
      kpis: [
        { label: 'Total learners', value: a.learners, delta: delta(a.learners, a.learnersPrev) },
        { label: 'Courses in progress', value: a.prog, delta: delta(a.prog, a.progPrev) },
        { label: 'Completed', value: a.done, delta: delta(a.done, a.donePrev) },
        { label: 'Credentials issued', value: a.creds, delta: delta(a.creds, a.credsPrev) },
      ],
      series, categories: shown.map((c) => ({ name: c.category, pct: Math.round((100 * c.n) / total) })), learners: a.learners,
      recent: recent.map((r) => ({ ...r, learner: owner ? r.learner : 'Learner (hidden)' })), impact,
    };
  });
}
