import { q, one } from '../db';
import { audit, notify } from '../audit';

/** The criteria a learner must meet for a course. A credential is issued only when all are met. */
export async function criteria(userId: string, courseId: string) {
  const c = await one('select requires_practical, requires_observation, pass_mark from courses where id = $1', [courseId]);
  if (!c) return [];
  const k = await one('select 1 x from attempts where user_id = $1 and course_id = $2 and passed limit 1', [userId, courseId]);
  const out: any[] = [{ key: 'knowledge', label: `Score ${c.passMark}% or more on the knowledge check`, met: !!k }];
  if (c.requiresPractical) {
    const p = await one("select 1 x from submissions where user_id = $1 and course_id = $2 and status = 'met' limit 1", [userId, courseId]);
    out.push({ key: 'practical', label: 'Submit the practical task, reviewed against the rubric', met: !!p });
  }
  if (c.requiresObservation) {
    const o = await one('select 1 x from observations where learner_id = $1 and course_id = $2 limit 1', [userId, courseId]);
    out.push({ key: 'observation', label: 'Supervisor observation, where your role requires it', met: !!o });
  }
  return out;
}

/** Issue a credential if every criterion is met and every lesson is done. Safe to call repeatedly. */
export async function maybeIssue(userId: string, courseId: string) {
  const cr = await criteria(userId, courseId);
  if (!cr.length || !cr.every((c) => c.met)) return null;
  const en = await one('select progress from enrolments where user_id = $1 and course_id = $2', [userId, courseId]);
  if (en && en.progress < 100) return null;
  const existing = await one("select id from credentials where user_id = $1 and course_id = $2 and status = 'valid' and valid_until >= current_date", [userId, courseId]);
  if (existing) return existing;
  const course = await one('select code, title from courses where id = $1', [courseId]);
  const code = `CT-${course.code || 'XX'}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
  const row = await one(
    "insert into credentials(user_id, course_id, title, code, valid_until, issuance) values ($1,$2,$3,$4, current_date + interval '2 years', 'criteria') returning *",
    [userId, courseId, course.title, code]
  );
  await q("update enrolments set status = 'completed', progress = 100, completed_at = now(), updated_at = now() where user_id = $1 and course_id = $2", [userId, courseId]);
  await notify(userId, 'credential', 'Your credential is ready to download', course.title, '/credentials');
  await audit(null, 'credential.issue', 'credential', row.id, { userId, courseId, code });
  return row;
}

/** Enrol a set of users in a course (keeps existing enrolments). Returns how many were new. */
export async function enrolUsers(userIds: string[], courseId: string, opts: { required: boolean; dueOn: string | null }) {
  let added = 0;
  for (const uid of userIds) {
    const r = await q(
      `insert into enrolments(user_id, course_id, required, due_on) values ($1,$2,$3,$4)
       on conflict (user_id, course_id) do update set required = enrolments.required or excluded.required, due_on = coalesce(excluded.due_on, enrolments.due_on)
       returning (xmax = 0) as inserted`,
      [uid, courseId, opts.required, opts.dueOn]
    );
    if (r[0]?.inserted) added++;
  }
  return added;
}
