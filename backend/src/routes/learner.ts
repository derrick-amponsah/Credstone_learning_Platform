import { FastifyInstance } from 'fastify';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { q, one } from '../db';
import { audit, notifyRole } from '../audit';
import { saveFile } from '../storage';
import { criteria, maybeIssue } from '../services/credentials';

const nf = (m: string, code = 404) => Object.assign(new Error(m), { statusCode: code });

async function lessonStates(uid: string, courseId: string) {
  const rows = await q(
    `select l.id, l.position, l.title, l.minutes, l.kind, coalesce(lp.completed, false) as done
     from lessons l left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = $1
     where l.course_id = $2 order by l.position`,
    [uid, courseId]
  );
  let next = false;
  return rows.map((l) => {
    if (l.done) return { ...l, state: 'done' };
    if (!next) { next = true; return { ...l, state: 'next' }; }
    return { ...l, state: 'todo' };
  });
}

async function recompute(uid: string, courseId: string) {
  const r = await one(
    `select count(*)::int total, count(*) filter (where lp.completed)::int done from lessons l
     left join lesson_progress lp on lp.lesson_id = l.id and lp.user_id = $1 where l.course_id = $2`,
    [uid, courseId]
  );
  const pct = r.total ? Math.round((100 * r.done) / r.total) : 0;
  await q(
    `insert into enrolments(user_id, course_id, status, progress) values ($1,$2,'in_progress',$3)
     on conflict (user_id, course_id) do update set progress = $3, updated_at = now(),
       status = case when enrolments.status = 'completed' then 'completed' else 'in_progress' end`,
    [uid, courseId, pct]
  );
}

export default async function (app: FastifyInstance) {
  const U = { preHandler: app.role() };

  app.get('/home', U, async (req) => {
    const uid = req.uid;
    const counts = await one(
      `select count(*) filter (where status <> 'completed')::int in_progress,
              count(*) filter (where status <> 'completed' and due_on between current_date and current_date + 7)::int due_week,
              count(*) filter (where status <> 'completed' and due_on < current_date)::int overdue,
              min(due_on) filter (where status <> 'completed' and due_on between current_date and current_date + 7) next_due
       from enrolments where user_id = $1`, [uid]);
    const creds = await one("select count(*)::int n from credentials where user_id = $1 and status = 'valid'", [uid]);
    const cont = await one(
      `select e.course_id, e.progress, c.title from enrolments e join courses c on c.id = e.course_id
       where e.user_id = $1 and e.status = 'in_progress' and c.kind = 'course' order by e.updated_at desc limit 1`, [uid]);
    let lesson = null;
    if (cont) {
      const ls = await lessonStates(uid, cont.courseId);
      const n = ls.find((l) => l.state === 'next');
      lesson = n ? { id: n.id, position: n.position, title: n.title, total: ls.length } : null;
    }
    const dueSoon = await q(
      `select e.course_id, c.title, c.kind, e.required, e.due_on from enrolments e join courses c on c.id = e.course_id
       where e.user_id = $1 and e.status <> 'completed' and e.due_on is not null and e.due_on <= current_date + 14
       order by e.due_on limit 4`, [uid]);
    const feedback = await one(
      `select r.feedback, u.first_name || ' ' || u.last_name as assessor, c.title as course from reviews r
       join submissions s on s.id = r.submission_id join users u on u.id = r.reviewer_id join courses c on c.id = s.course_id
       where s.user_id = $1 order by r.created_at desc limit 1`, [uid]);
    const rec = await one(
      `select c.id, c.title, c.hours, (select count(*)::int from path_courses pc where pc.path_id = c.id) as courses from courses c
       where c.status = 'published' and c.kind = 'path' and not exists (select 1 from enrolments e where e.user_id = $1 and e.course_id = c.id)
       order by c.title limit 1`, [uid]);
    const unread = await one('select count(*)::int n from notifications where user_id = $1 and not read', [uid]);
    return { counts, credentials: creds.n, continue: cont ? { ...cont, lesson } : null, dueSoon, feedback, recommended: rec, unread: unread.n };
  });

  app.get('/catalogue', U, async (req) => {
    const { q: term } = req.query as any;
    const rows = await q(
      `select c.id, c.title, c.kind, c.hours, c.level, c.icon, c.category, e.status as enrol_status, coalesce(e.required, false) as required,
         coalesce(e.progress, 0) as progress, (sc.course_id is not null) as saved,
         (select count(*)::int from path_courses pc where pc.path_id = c.id) as course_count
       from courses c left join enrolments e on e.user_id = $1 and e.course_id = c.id
       left join saved_courses sc on sc.user_id = $1 and sc.course_id = c.id
       where c.status = 'published' and ($2::text is null or c.title ilike $2 or c.category ilike $2 or coalesce(c.summary, '') ilike $2)
       order by coalesce(e.required, false) desc, c.title`,
      [req.uid, term ? `%${term}%` : null]
    );
    return rows;
  });

  app.post('/courses/:id/enrol', U, async (req) => {
    const { id } = req.params as any;
    await q('insert into enrolments(user_id, course_id) values ($1,$2) on conflict do nothing', [req.uid, id]);
    return { ok: true };
  });
  app.post('/courses/:id/save', U, async (req) => {
    const { id } = req.params as any;
    const r = await q('delete from saved_courses where user_id = $1 and course_id = $2 returning 1', [req.uid, id]);
    if (!r.length) await q('insert into saved_courses values ($1,$2)', [req.uid, id]);
    return { saved: !r.length };
  });

  app.get('/courses/:id', U, async (req) => {
    const { id } = req.params as any;
    const c = await one("select * from courses where id = $1 and status = 'published'", [id]);
    if (!c) throw nf('That course was not found.');
    const enrolment = await one('select status, progress, required, due_on from enrolments where user_id = $1 and course_id = $2', [req.uid, id]);
    const lessons = await lessonStates(req.uid, id);
    const children = c.kind === 'path' ? await q('select c.id, c.title, c.hours from path_courses pc join courses c on c.id = pc.course_id where pc.path_id = $1 order by pc.position', [id]) : [];
    const pre = c.prerequisiteId
      ? await one(
          `select c.title, exists(select 1 from credentials cr where cr.user_id = $1 and cr.course_id = c.id and cr.status = 'valid') as done from courses c where c.id = $2`,
          [req.uid, c.prerequisiteId])
      : null;
    const parent = await one('select p.title, pc.position, (select count(*)::int from path_courses x where x.path_id = p.id) as total from path_courses pc join courses p on p.id = pc.path_id where pc.course_id = $1 limit 1', [id]);
    const scenarios = await one('select count(*)::int n from scenarios where course_id = $1', [id]);
    return {
      course: { id: c.id, title: c.title, kind: c.kind, objective: c.objective, hours: c.hours, icon: c.icon, requiresPractical: c.requiresPractical },
      enrolment, lessons, children, prerequisite: pre, parent, criteria: await criteria(req.uid, id), hasPractice: scenarios.n > 0,
    };
  });

  app.get('/lessons/:id', U, async (req) => {
    const { id } = req.params as any;
    const l = await one('select l.*, c.title as course_title from lessons l join courses c on c.id = l.course_id where l.id = $1', [id]);
    if (!l) throw nf('That lesson was not found.');
    const lp = await one('select position_seconds from lesson_progress where user_id = $1 and lesson_id = $2', [req.uid, id]);
    const outline = await lessonStates(req.uid, l.courseId);
    return { id: l.id, courseId: l.courseId, courseTitle: l.courseTitle, position: l.position, total: outline.length, title: l.title, minutes: l.minutes, transcript: l.transcript, videoUrl: l.videoUrl, positionSeconds: lp?.positionSeconds ?? 0, outline };
  });

  app.post('/lessons/:id/progress', U, async (req) => {
    const { id } = req.params as any;
    const b = z.object({ positionSeconds: z.number().int().min(0).optional(), completed: z.boolean().optional() }).parse(req.body);
    const l = await one('select course_id from lessons where id = $1', [id]);
    if (!l) throw nf('That lesson was not found.');
    await q(
      `insert into lesson_progress(user_id, lesson_id, completed, position_seconds) values ($1,$2,coalesce($3,false),coalesce($4,0))
       on conflict (user_id, lesson_id) do update set completed = lesson_progress.completed or coalesce($3,false),
         position_seconds = coalesce($4, lesson_progress.position_seconds), updated_at = now()`,
      [req.uid, id, b.completed ?? null, b.positionSeconds ?? null]
    );
    await recompute(req.uid, l.courseId);
    if (b.completed) await maybeIssue(req.uid, l.courseId);
    return { ok: true };
  });

  // Knowledge check (graded). Correct answers never leave the server until after submission.
  app.get('/courses/:id/quiz', U, async (req) => {
    const { id } = req.params as any;
    const c = await one('select title, objective, pass_mark from courses where id = $1', [id]);
    const questions = await q(
      `select qn.id, qn.prompt, (select json_agg(json_build_object('id', o.id, 'label', o.label, 'text', o.text) order by o.label) from options o where o.question_id = qn.id) as options
       from questions qn where qn.course_id = $1 and (qn.ai_drafted = false or qn.accepted_by is not null) order by qn.position`, [id]);
    return { course: c, questions };
  });
  app.post('/courses/:id/quiz', U, async (req) => {
    const { id } = req.params as any;
    const b = z.object({ answers: z.record(z.string()) }).parse(req.body);
    const c = await one('select pass_mark from courses where id = $1', [id]);
    const qs = await q(
      `select qn.id, qn.explanation, (select o.id from options o where o.question_id = qn.id and o.is_correct limit 1) as correct from questions qn
       where qn.course_id = $1 and (qn.ai_drafted = false or qn.accepted_by is not null)`, [id]);
    if (!qs.length) throw nf('This knowledge check has no questions yet.', 409);
    const results = qs.map((x) => ({ questionId: x.id, correct: b.answers[x.id] === x.correct, correctOptionId: x.correct, explanation: x.explanation }));
    const score = Math.round((100 * results.filter((r) => r.correct).length) / qs.length);
    const passed = score >= c.passMark;
    await q('insert into attempts(user_id, course_id, score, passed, answers) values ($1,$2,$3,$4,$5)', [req.uid, id, score, passed, JSON.stringify(b.answers)]);
    if (passed) await maybeIssue(req.uid, id);
    return { score, passed, passMark: c.passMark, results };
  });

  // Practice scenarios (never graded, never shown to a supervisor, nothing stored)
  app.get('/courses/:id/scenarios', U, async (req) => q('select id, position, title from scenarios where course_id = $1 order by position', [(req.params as any).id]));
  app.get('/scenarios/:id', U, async (req) => {
    const s = await one('select id, course_id, position, title, body, options from scenarios where id = $1', [(req.params as any).id]);
    if (!s) throw nf('That scenario was not found.');
    const t = await one('select count(*)::int n from scenarios where course_id = $1', [s.courseId]);
    const nxt = await one('select id from scenarios where course_id = $1 and position > $2 order by position limit 1', [s.courseId, s.position]);
    return { ...s, total: t.n, nextId: nxt?.id ?? null };
  });
  app.post('/scenarios/:id/decide', U, async (req) => {
    const b = z.object({ choice: z.string() }).parse(req.body);
    const s = await one('select * from scenarios where id = $1', [(req.params as any).id]);
    if (!s) throw nf('That scenario was not found.');
    const opt = s.options.find((o: any) => o.key === b.choice);
    if (!opt) throw nf('Choose one of the options.', 400);
    return { chosen: opt, strong: b.choice === s.bestKey, ...s.feedback[b.choice] };
  });

  // Practical task
  app.get('/courses/:id/task', U, async (req) => {
    const { id } = req.params as any;
    const c = await one('select title, task_prompt from courses where id = $1', [id]);
    const rubric = await q('select id, text from rubric_criteria where course_id = $1 order by position', [id]);
    const sub = await one("select id, file_name, link, notes, status, updated_at from submissions where user_id = $1 and course_id = $2 order by created_at desc limit 1", [req.uid, id]);
    const en = await one('select due_on from enrolments where user_id = $1 and course_id = $2', [req.uid, id]);
    return { course: c, rubric, submission: sub, dueOn: en?.dueOn ?? null };
  });
  app.post('/courses/:id/task', U, async (req, reply) => {
    const { id } = req.params as any;
    const f: any = {};
    let file: any = null;
    for await (const p of (req as any).parts()) {
      if (p.type === 'file') { if (p.filename) file = await saveFile(p); else p.file.resume(); }
      else f[p.fieldname] = p.value;
    }
    const submit = f.mode === 'submit';
    if (f.link && !/^https?:\/\//i.test(f.link)) return reply.code(400).send({ error: 'Links must start with http:// or https://.' });
    let sub = await one("select * from submissions where user_id = $1 and course_id = $2 and status = 'draft' order by created_at desc limit 1", [req.uid, id]);
    if (!sub) sub = await one("insert into submissions(user_id, course_id) values ($1,$2) returning *", [req.uid, id]);
    const hasWork = file || sub.fileKey || f.link || sub.link;
    if (submit && !hasWork) return reply.code(400).send({ error: 'Add a file or a link before you submit.' });
    await q(
      `update submissions set file_name = coalesce($2, file_name), file_key = coalesce($3, file_key), excerpt = coalesce($4, excerpt),
         link = coalesce($5, link), notes = coalesce($6, notes), status = $7, submitted_at = case when $7 = 'submitted' then now() else submitted_at end, updated_at = now() where id = $1`,
      [sub.id, file?.name ?? null, file?.key ?? null, file?.excerpt ?? null, f.link || null, f.notes ?? null, submit ? 'submitted' : 'draft']
    );
    if (submit) {
      const c = await one('select title from courses where id = $1', [id]);
      await notifyRole('assessor', 'assigned', 'New submission to review', c.title, '/review');
      await audit(req.uid, 'submission.submit', 'submission', sub.id);
    }
    return { ok: true, status: submit ? 'submitted' : 'draft' };
  });

  // Credentials
  app.get('/credentials', U, async (req) => {
    const rows = await q(
      `select cr.id, cr.title, cr.code, cr.issued_on, cr.valid_until, cr.course_id, cr.status,
         (cr.valid_until < current_date) as expired, (cr.valid_until between current_date and current_date + 45) as renew_soon,
         u.first_name || ' ' || u.last_name as holder
       from credentials cr join users u on u.id = cr.user_id where cr.user_id = $1 and cr.status = 'valid' order by cr.issued_on desc`, [req.uid]);
    const open = await q(
      `select e.course_id, c.title from enrolments e join courses c on c.id = e.course_id
       where e.user_id = $1 and e.status <> 'completed' and c.kind = 'course' and c.requires_practical order by e.updated_at desc`, [req.uid]);
    const inProgress = [];
    for (const o of open) { const cr = await criteria(req.uid, o.courseId); inProgress.push({ courseId: o.courseId, title: o.title, met: cr.filter((x) => x.met).length, total: cr.length }); }
    const selected = rows[0] ? { ...rows[0], criteria: await criteria(req.uid, rows[0].courseId) } : null;
    return { credentials: rows, inProgress, selected };
  });
  app.get('/credentials/:id/criteria', U, async (req) => {
    const c = await one('select course_id from credentials where id = $1 and user_id = $2', [(req.params as any).id, req.uid]);
    if (!c) throw nf('That credential was not found.');
    return criteria(req.uid, c.courseId);
  });
  app.post('/credentials/:id/renew', U, async (req) => {
    const c = await one('select cr.* from credentials cr where cr.id = $1 and cr.user_id = $2', [(req.params as any).id, req.uid]);
    if (!c) throw nf('That credential was not found.');
    await q(
      `insert into enrolments(user_id, course_id, status, enrolled_at, updated_at)
       values ($1, $2, 'in_progress', now(), now())
       on conflict (user_id, course_id)
       do update set status = 'in_progress', completed_at = null, updated_at = now()`,
      [req.uid, c.courseId]
    );
    await q(
      `update submissions set status = 'draft' where user_id = $1 and course_id = $2 and status in ('met', 'submitted')`,
      [req.uid, c.courseId]
    );
    await audit(req.uid, 'credential.renew_start', 'credential', c.id, { courseId: c.courseId });
    return { ok: true, courseId: c.courseId, title: c.title };
  });
  app.get('/credentials/:id/certificate.pdf', U, async (req, reply) => {
    const c = await one('select cr.*, u.first_name || \' \' || u.last_name as holder from credentials cr join users u on u.id = cr.user_id where cr.id = $1 and cr.user_id = $2', [(req.params as any).id, req.uid]);
    if (!c) throw nf('That credential was not found.');
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const d = (x: any) => new Date(x).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.rect(30, 30, 782, 535).lineWidth(4).stroke('#C5A059');
    doc.fillColor('#7A5C1E').fontSize(14).text('CREDSTONE LEARNING', 0, 110, { align: 'center' });
    doc.fillColor('#4B5563').fontSize(14).text('This certifies that', 0, 160, { align: 'center' });
    doc.fillColor('#111E38').fontSize(40).text(c.holder, 0, 190, { align: 'center' });
    doc.fillColor('#4B5563').fontSize(14).text('has met all criteria for', 0, 255, { align: 'center' });
    doc.fillColor('#111E38').fontSize(28).text(c.title, 0, 285, { align: 'center' });
    doc.fillColor('#4B5563').fontSize(12).text(`Issued ${d(c.issuedOn)}     Valid until ${d(c.validUntil)}     Credential ID ${c.code}`, 0, 400, { align: 'center' });
    doc.text(`Verify at ${process.env.APP_URL || 'http://localhost:3000'}/verify/${c.code}`, 0, 430, { align: 'center' });
    reply.header('Content-Type', 'application/pdf').header('Content-Disposition', `attachment; filename="${c.code}.pdf"`);
    reply.send(doc);
    doc.end();
    return reply;
  });
  // Public verify link
  app.get('/verify/:code', async (req) => {
    const c = await one("select cr.title, cr.code, cr.issued_on, cr.valid_until, cr.status, u.first_name || ' ' || u.last_name as holder from credentials cr join users u on u.id = cr.user_id where cr.code = $1", [(req.params as any).code]);
    if (!c) throw nf('No credential matches that ID.');
    return { ...c, valid: c.status === 'valid' && new Date(c.validUntil) >= new Date() };
  });

  // Notifications
  app.get('/notifications', U, async (req) => {
    const items = await q('select id, kind, title, body, link, read, created_at from notifications where user_id = $1 order by created_at desc limit 100', [req.uid]);
    return { items, unread: items.filter((i) => !i.read).length };
  });
  app.post('/notifications/read-all', U, async (req) => { await q('update notifications set read = true where user_id = $1', [req.uid]); return { ok: true }; });
  app.post('/notifications/:id/read', U, async (req) => { await q('update notifications set read = true where id = $1 and user_id = $2', [(req.params as any).id, req.uid]); return { ok: true }; });
  app.get('/notifications/count', U, async (req) => one('select count(*)::int n from notifications where user_id = $1 and not read', [req.uid]));
}
