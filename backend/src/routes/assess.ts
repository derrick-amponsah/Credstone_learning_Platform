import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { q, one } from '../db';
import { audit, notify } from '../audit';
import { config } from '../config';
import { getFileStream } from '../storage';
import { maybeIssue } from '../services/credentials';

const err = (m: string, code = 400) => Object.assign(new Error(m), { statusCode: code });
const letter = (i: number) => String.fromCharCode(65 + i);

export default async function (app: FastifyInstance) {
  const R = { preHandler: app.role('assessor') };

  app.get('/assess/queue', R, async () => {
    const rows = await q(
      `select s.id, s.submitted_at, c.title as course, s.user_id from submissions s join courses c on c.id = s.course_id
       where s.status = 'submitted' order by s.submitted_at`);
    return rows.map((r, i) => ({ ...r, label: `Learner ${letter(i)}`, isNew: Date.now() - new Date(r.submittedAt).getTime() < 36 * 3600 * 1000 }));
  });

  app.get('/assess/submissions/:id', R, async (req) => {
    const { id } = req.params as any;
    const s = await one(
      `select s.id, s.file_name, s.link, s.notes, s.excerpt, s.status, s.submitted_at, s.course_id, c.title as course, u.first_name || ' ' || u.last_name as learner
       from submissions s join courses c on c.id = s.course_id join users u on u.id = s.user_id where s.id = $1`, [id]);
    if (!s) throw err('That submission was not found.', 404);
    const rubric = await q('select id, position, title, text from rubric_criteria where course_id = $1 order by position', [s.courseId]);
    await audit(req.uid, 'evidence.view', 'submission', id); // every view of learner evidence is recorded
    return { submission: s, rubric };
  });

  app.get('/assess/submissions/:id/file', R, async (req, reply) => {
    const s = await one('select file_key, file_name from submissions where id = $1', [(req.params as any).id]);
    if (!s?.fileKey) throw err('No file was uploaded.', 404);
    const result = await getFileStream(s.fileKey);
    if (!result) throw err('File not found in storage.', 404);
    await audit(req.uid, 'evidence.download', 'submission', (req.params as any).id);
    reply.header('Content-Type', result.contentType);
    reply.header('Content-Length', result.size);
    reply.header('Content-Disposition', `attachment; filename="${s.fileName || 'submission'}"`);
    return reply.send(result.stream);
  });

  app.post('/assess/submissions/:id/review', R, async (req) => {
    const { id } = req.params as any;
    const b = z.object({
      ratings: z.record(z.enum(['not_yet', 'partly', 'meets'])),
      feedback: z.string().trim().min(5, 'Write feedback the learner can act on.'),
      outcome: z.enum(['met', 'resubmit']),
    }).parse(req.body);
    const s = await one("select s.*, c.author_id, c.title from submissions s join courses c on c.id = s.course_id where s.id = $1 and s.status = 'submitted'", [id]);
    if (!s) throw err('This submission is not waiting for review.', 409);
    if (s.userId === req.uid) throw err('You cannot review your own work.', 403);
    if (config.requireSeparateReviewer && s.authorId === req.uid) throw err('You wrote this course, so another assessor must review its submissions.', 403);
    const crit = await q('select id from rubric_criteria where course_id = $1', [s.courseId]);
    if (crit.some((c) => !b.ratings[c.id])) throw err('Rate every criterion first.');
    if (b.outcome === 'met' && Object.values(b.ratings).includes('not_yet')) throw err('A criterion is rated "Not yet", so ask for a resubmission instead.');
    await q('insert into reviews(submission_id, reviewer_id, ratings, feedback, outcome) values ($1,$2,$3,$4,$5)', [id, req.uid, JSON.stringify(b.ratings), b.feedback, b.outcome]);
    await q('update submissions set status = $2, updated_at = now() where id = $1', [id, b.outcome]);
    await notify(s.userId, 'feedback', b.outcome === 'met' ? 'Feedback ready on your practical task' : 'Please resubmit your practical task', b.feedback.slice(0, 140), `/courses/${s.courseId}/task`);
    await audit(req.uid, 'submission.review', 'submission', id, { outcome: b.outcome });
    if (b.outcome === 'met') await maybeIssue(s.userId, s.courseId);
    return { ok: true };
  });
}
