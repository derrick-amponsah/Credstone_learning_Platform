import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { q, one } from '../db';
import { audit, notify, notifyRole } from '../audit';
import { config } from '../config';
import { saveFile, deleteFile } from '../storage';
import { enrolUsers } from '../services/credentials';

const err = (m: string, code = 400) => Object.assign(new Error(m), { statusCode: code });

async function audienceUsers(audiences: { type?: string; id?: string }[]) {
  const ids = new Set<string>();
  for (const a of audiences) {
    if (!a.type || !a.id) continue;
    const rows =
      a.type === 'role'
        ? await q("select u.id from users u join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id where r.key = $1 and u.status = 'active'", [a.id])
        : await q('select user_id as id from memberships where group_id = $1 and ends_on is null', [a.id]);
    rows.forEach((r) => ids.add(r.id));
  }
  return [...ids];
}

export default async function (app: FastifyInstance) {
  // Strict Role Separation:
  // Instructors author and upload content.
  // Training Owners ONLY review, approve and publish content (no uploading or content authoring).
  const INSTR = { preHandler: app.role('instructor') };
  const OWNER = { preHandler: app.role('training_owner') };
  const BOTH = { preHandler: app.role('instructor', 'training_owner') };

  // ==========================================
  // INSTRUCTOR ROUTES (Content Studio)
  // ==========================================

  app.get('/studio/drafts', INSTR, async () =>
    q(`select c.id, c.title, c.status, c.version, c.updated from (select *, created_at as updated from courses) c where c.status = 'draft' order by c.created_at desc limit 8`)
  );

  // Create a course from uploaded source material (multipart: files + optional title) - INSTRUCTOR ONLY
  app.post('/studio/courses', INSTR, async (req, reply) => {
    const f: any = {};
    const files: any[] = [];
    for await (const p of (req as any).parts()) {
      if (p.type === 'file') {
        if (p.filename) files.push(await saveFile(p));
        else p.file.resume();
      } else {
        f[p.fieldname] = p.value;
      }
    }
    const title = (f.title || files[0]?.name?.replace(/\.[^.]+$/, '') || '').trim();
    if (!title) throw err('Add a title or upload source material.');
    const c = await one("insert into courses(title, author_id, objective, code) values ($1,$2,$3,'NEW') returning id", [title, req.uid, '']);
    for (const x of files) {
      await q('insert into source_materials(course_id, name, file_key, uploaded_by) values ($1,$2,$3,$4)', [c.id, x.name, x.key, req.uid]);
    }
    await audit(req.uid, 'course.create', 'course', c.id, { sources: files.length });
    return reply.code(201).send(c);
  });

  app.get('/studio/courses/:id', INSTR, async (req) => {
    const { id } = req.params as any;
    const c = await one(
      'select id, title, version, status, objective, prerequisite_id as "prerequisiteId", task_prompt as "taskPrompt", requires_practical as "requiresPractical", pass_mark as "passMark", quiz_time_limit_minutes as "quizTimeLimitMinutes" from courses where id = $1',
      [id]
    );
    if (!c) throw err('That course was not found.', 404);
    const availablePrerequisites = await q(
      `select id, code, title, level, category from courses where id <> $1 and kind = 'course' and (prerequisite_id is null or prerequisite_id <> $1) order by level asc, title asc`,
      [id]
    );
    const prerequisiteCourse = c.prerequisiteId
      ? await one('select id, code, title, level from courses where id = $1', [c.prerequisiteId])
      : null;
    const lessons = await q('select id, position, title, status, minutes, kind, transcript, video_url as "videoUrl", document_url as "documentUrl", source_ref as "sourceRef" from lessons where course_id = $1 order by position', [id]);
    const sources = await q('select id, name, file_key as "fileKey", created_at as "createdAt" from source_materials where course_id = $1 order by created_at desc', [id]);
    const ai = await q('select id, prompt, source_ref as "sourceRef" from questions where course_id = $1 and ai_drafted and accepted_by is null order by position', [id]);
    const questions = await q(
      `select q.id, q.position, q.prompt, q.explanation, q.source_ref as "sourceRef", q.ai_drafted as "aiDrafted",
         coalesce(json_agg(json_build_object('id', o.id, 'label', o.label, 'text', o.text, 'isCorrect', o.is_correct) order by o.label) filter (where o.id is not null), '[]') as options
       from questions q
       left join options o on o.question_id = q.id
       where q.course_id = $1 and (not q.ai_drafted or q.accepted_by is not null)
       group by q.id order by q.position`,
      [id]
    );
    const comments = await q(
      `select cc.id, cc.body, cc.created_at as "createdAt", cc.resolved, cc.resolved_at as "resolvedAt",
              u.first_name || ' ' || u.last_name as author, u.first_name as "firstName",
              ru.first_name || ' ' || ru.last_name as "resolvedBy"
       from course_comments cc
       join users u on u.id = cc.author_id
       left join users ru on ru.id = cc.resolved_by
       where cc.course_id = $1
       order by cc.resolved asc, cc.created_at desc limit 20`,
      [id]
    );
    const qc = await one('select count(*)::int n from questions where course_id = $1 and (not ai_drafted or accepted_by is not null)', [id]);
    const rubricCriteria = await q('select id, position, title, text from rubric_criteria where course_id = $1 order by position', [id]);

    return {
      course: { ...c, prerequisiteCourse },
      availablePrerequisites,
      lessons,
      sources,
      ai,
      questions,
      comments,
      questionCount: qc.n,
      needsSource: lessons.filter((l) => l.status === 'needs_source' || !l.sourceRef),
      rubricCriteria,
    };
  });

  app.post('/studio/courses/:id/sources', INSTR, async (req) => {
    const { id } = req.params as any;
    let n = 0;
    for await (const p of (req as any).parts()) {
      if (p.type === 'file' && p.filename) {
        const x = await saveFile(p);
        await q('insert into source_materials(course_id, name, file_key, uploaded_by) values ($1,$2,$3,$4)', [id, x.name, x.key, req.uid]);
        n++;
      } else if (p.type === 'file') {
        p.file.resume();
      }
    }
    await audit(req.uid, 'course.sources', 'course', id, { added: n });
    return { added: n };
  });

  // Delete uploaded source material - INSTRUCTOR ONLY
  app.delete('/studio/sources/:id', INSTR, async (req) => {
    const { id } = req.params as any;
    const source = await one(
      'select sm.id, sm.course_id, sm.name, sm.file_key as "fileKey", c.status from source_materials sm join courses c on c.id = sm.course_id where sm.id = $1',
      [id]
    );
    if (!source) throw err('Source material not found.', 404);
    if (source.status !== 'draft') throw err('Cannot remove source material from a course that is not in draft status.', 400);

    await q('delete from source_materials where id = $1', [id]);
    deleteFile(source.fileKey);
    await audit(req.uid, 'source.delete', 'course', source.course_id, { sourceId: id, name: source.name });
    return { ok: true, id };
  });

  // Delete draft course - INSTRUCTOR ONLY
  app.delete('/studio/courses/:id', INSTR, async (req) => {
    const { id } = req.params as any;
    const c = await one('select id, title, status from courses where id = $1', [id]);
    if (!c) throw err('Course not found.', 404);
    if (c.status !== 'draft') throw err('Only draft courses can be deleted.', 400);

    // Clean up uploaded source files from disk
    const sources = await q('select file_key as "fileKey" from source_materials where course_id = $1', [id]);
    for (const s of sources) {
      deleteFile(s.fileKey);
    }

    // Clean up uploaded lesson videos and documents from disk
    const lessons = await q("select video_url as \"videoUrl\", document_url as \"documentUrl\" from lessons where course_id = $1", [id]);
    for (const l of lessons) {
      if (l.videoUrl && l.videoUrl.startsWith('/api/media/')) {
        const key = l.videoUrl.replace('/api/media/', '');
        deleteFile(key);
      }
      if (l.documentUrl && l.documentUrl.startsWith('/api/media/')) {
        const key = l.documentUrl.replace('/api/media/', '');
        deleteFile(key);
      }
    }

    await q("delete from courses where id = $1 and status = 'draft'", [id]);
    await audit(req.uid, 'course.delete', 'course', id, { title: c.title });
    return { ok: true, id };
  });

  app.patch('/studio/courses/:id', INSTR, async (req) => {
    const b = z.object({
      title: z.string().trim().min(1).optional(),
      objective: z.string().trim().optional(),
      taskPrompt: z.string().trim().nullish(),
      requiresPractical: z.boolean().optional(),
      passMark: z.number().int().min(1).max(100).optional(),
      quizTimeLimitMinutes: z.number().int().min(0).max(180).optional(),
      prerequisiteId: z.string().uuid().nullable().optional(),
    }).parse(req.body);

    const id = (req.params as any).id;

    if (b.prerequisiteId !== undefined) {
      if (b.prerequisiteId === id) {
        throw err('A course cannot be a prerequisite of itself.', 400);
      }
      if (b.prerequisiteId) {
        const cycle = await one('select id from courses where id = $1 and prerequisite_id = $2', [b.prerequisiteId, id]);
        if (cycle) {
          throw err('Cannot set prerequisite: that course already requires this course as a prerequisite.', 400);
        }
      }
    }

    await q(
      `update courses set
         title = coalesce($2, title),
         objective = coalesce($3, objective),
         task_prompt = case when $4::boolean then $5 else task_prompt end,
         requires_practical = coalesce($6, requires_practical),
         pass_mark = coalesce($7, pass_mark),
         quiz_time_limit_minutes = coalesce($8, quiz_time_limit_minutes),
         prerequisite_id = case when $9::boolean then $10 else prerequisite_id end
       where id = $1`,
      [
        id,
        b.title ?? null,
        b.objective ?? null,
        b.taskPrompt !== undefined,
        b.taskPrompt ?? null,
        b.requiresPractical ?? null,
        b.passMark ?? null,
        b.quizTimeLimitMinutes ?? null,
        b.prerequisiteId !== undefined,
        b.prerequisiteId ?? null,
      ]
    );
    return { ok: true };
  });

  // Rubric Authoring (Instructors only)
  app.post('/studio/courses/:id/rubric', INSTR, async (req) => {
    const { id } = req.params as any;
    const b = z.object({
      criteria: z.array(z.object({
        title: z.string().trim().min(1, 'Criterion title is required.'),
        text: z.string().trim().min(1, 'Criterion description is required.'),
        position: z.number().int().optional(),
      })),
    }).parse(req.body);

    await q('delete from rubric_criteria where course_id = $1', [id]);
    for (const [idx, item] of b.criteria.entries()) {
      await q(
        'insert into rubric_criteria(course_id, position, title, text) values ($1, $2, $3, $4)',
        [id, item.position ?? (idx + 1), item.title, item.text]
      );
    }
    await audit(req.uid, 'course.rubric_update', 'course', id, { count: b.criteria.length });
    const saved = await q('select id, position, title, text from rubric_criteria where course_id = $1 order by position', [id]);
    return { ok: true, criteria: saved };
  });

  app.post('/studio/courses/:id/lessons', INSTR, async (req) => {
    const b = z.object({
      title: z.string().trim().min(1, 'Name the lesson.'),
      minutes: z.number().int().min(1).default(5),
      kind: z.enum(['Video', 'Document']).default('Video'),
      videoUrl: z.string().trim().nullish(),
      documentUrl: z.string().trim().nullish(),
      transcript: z.string().trim().nullish(),
      sourceRef: z.string().trim().nullish(),
    }).parse(req.body);
    const n = await one('select coalesce(max(position), 0) + 1 as p from lessons where course_id = $1', [(req.params as any).id]);
    // A lesson is 'ready' when it has a source reference. For Document lessons also being 'ready' if a document is attached.
    const hasSource = !!(b.sourceRef && b.sourceRef.trim());
    const hasDocument = b.kind === 'Document' && !!(b.documentUrl && b.documentUrl.trim());
    const status = (hasSource || hasDocument) ? 'ready' : 'needs_source';
    // Ensure document_url column exists (idempotent)
    await q('alter table lessons add column if not exists document_url text', []);
    return one(
      `insert into lessons(course_id, position, title, minutes, kind, video_url, document_url, transcript, source_ref, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
      [(req.params as any).id, n.p, b.title, b.minutes, b.kind, b.videoUrl || null, b.documentUrl || null, b.transcript || null, b.sourceRef || null, status]
    );
  });

  app.patch('/studio/lessons/:id', INSTR, async (req) => {
    const b = z.object({
      title: z.string().trim().min(1).optional(),
      kind: z.enum(['Video', 'Document']).optional(),
      sourceRef: z.string().trim().nullish(),
      videoUrl: z.string().trim().nullish(),
      documentUrl: z.string().trim().nullish(),
      transcript: z.string().trim().nullish(),
      minutes: z.number().int().min(1).optional(),
    }).parse(req.body);
    // Ensure document_url column exists (idempotent)
    await q('alter table lessons add column if not exists document_url text', []);
    // Determine status: ready if sourceRef provided, or if Document kind with a document attached
    const updatedKind = b.kind;
    const updatedSourceRef = b.sourceRef;
    const updatedDocUrl = b.documentUrl;
    await q(
      `update lessons set
         title = coalesce($2, title),
         kind = coalesce($3, kind),
         source_ref = case when $4::text is not null then nullif($4, '') else source_ref end,
         video_url = case when $5::text is not null then nullif($5, '') else video_url end,
         document_url = case when $6::text is not null then nullif($6, '') else document_url end,
         transcript = case when $7::text is not null then nullif($7, '') else transcript end,
         minutes = coalesce($8, minutes),
         status = case
           when ($4::text is not null and nullif($4,'') is not null) then 'ready'
           when ($3 = 'Document' or kind = 'Document') and ($6::text is not null and nullif($6,'') is not null) then 'ready'
           when coalesce(nullif($4,''), source_ref) is not null then 'ready'
           else 'needs_source'
         end
       where id = $1`,
      [
        (req.params as any).id,
        b.title ?? null,
        updatedKind ?? null,
        updatedSourceRef !== undefined ? updatedSourceRef : null,
        b.videoUrl !== undefined ? b.videoUrl : null,
        updatedDocUrl !== undefined ? updatedDocUrl : null,
        b.transcript !== undefined ? b.transcript : null,
        b.minutes ?? null,
      ]
    );
    return { ok: true };
  });

  app.delete('/studio/lessons/:id', INSTR, async (req) => {
    await q('delete from lessons where id = $1', [(req.params as any).id]);
    return { ok: true };
  });

  // Upload video content for lessons directly to local storage (S3-ready) - INSTRUCTOR ONLY
  app.post('/studio/courses/:id/upload-video', INSTR, async (req, reply) => {
    let uploadedFile: any = null;
    for await (const p of (req as any).parts()) {
      if (p.type === 'file' && p.filename) {
        uploadedFile = await saveFile(p);
      } else if (p.type === 'file') {
        p.file.resume();
      }
    }
    if (!uploadedFile) throw err('No video file was uploaded.');
    const videoUrl = `/api/media/${uploadedFile.key}`;
    await audit(req.uid, 'course.upload_video', 'course', (req.params as any).id, { key: uploadedFile.key, name: uploadedFile.name });
    return reply.code(200).send({ ok: true, videoUrl, filename: uploadedFile.name });
  });

  // Upload document content for document-type lessons (PDF, Word, PowerPoint, TXT) - INSTRUCTOR ONLY
  app.post('/studio/courses/:id/upload-document', INSTR, async (req, reply) => {
    let uploadedFile: any = null;
    for await (const p of (req as any).parts()) {
      if (p.type === 'file' && p.filename) {
        uploadedFile = await saveFile(p);
      } else if (p.type === 'file') {
        p.file.resume();
      }
    }
    if (!uploadedFile) throw err('No document file was uploaded.');
    const documentUrl = `/api/media/${uploadedFile.key}`;
    await audit(req.uid, 'course.upload_document', 'course', (req.params as any).id, { key: uploadedFile.key, name: uploadedFile.name });
    return reply.code(200).send({ ok: true, documentUrl, filename: uploadedFile.name });
  });

  // Manual Question creation in Studio (INSTRUCTOR ONLY)
  app.post('/studio/courses/:id/questions', INSTR, async (req) => {
    const { id } = req.params as any;
    const b = z.object({
      prompt: z.string().trim().min(3, 'Enter a question prompt.'),
      explanation: z.string().trim().optional(),
      sourceRef: z.string().trim().optional(),
      options: z.array(z.object({
        label: z.string().trim().min(1),
        text: z.string().trim().min(1, 'Option text is required.'),
        isCorrect: z.boolean().default(false),
      })).min(2, 'Provide at least two options.'),
    }).parse(req.body);

    const hasCorrect = b.options.some((o) => o.isCorrect);
    if (!hasCorrect) throw err('Mark at least one option as correct.', 400);

    const n = await one('select coalesce(max(position), 0) + 1 as p from questions where course_id = $1', [id]);
    const qn = await one(
      `insert into questions(course_id, position, prompt, explanation, source_ref, ai_drafted, accepted_by, accepted_at)
       values ($1, $2, $3, $4, $5, false, $6, now()) returning id`,
      [id, n.p, b.prompt, b.explanation || null, b.sourceRef || null, req.uid]
    );
    for (const o of b.options) {
      await q('insert into options(question_id, label, text, is_correct) values ($1, $2, $3, $4)', [qn.id, o.label, o.text, o.isCorrect]);
    }
    await audit(req.uid, 'question.create', 'course', id, { questionId: qn.id });
    return { ok: true, id: qn.id };
  });

  app.delete('/studio/questions/:id', INSTR, async (req) => {
    await q('delete from questions where id = $1', [(req.params as any).id]);
    return { ok: true };
  });

  // AI assistance (stub)
  app.post('/studio/courses/:id/ai-draft', INSTR, async (req) => {
    const { id } = req.params as any;
    const lessons = await q("select title, source_ref from lessons where course_id = $1 and source_ref is not null and source_ref <> '' order by position limit 3", [id]);
    if (!lessons.length) throw err('Add a source to at least one lesson first. AI drafts only from approved material.', 409);
    const n = await one('select coalesce(max(position), 0) as p from questions where course_id = $1', [id]);
    let pos = n.p;
    for (const l of lessons.slice(0, 2)) {
      const [qn] = await q('insert into questions(course_id, position, prompt, explanation, source_ref, ai_drafted) values ($1,$2,$3,$4,$5,true) returning id', [id, ++pos, `Which statement best reflects the guidance in "${l.title}"?`, 'Check against the source before accepting.', l.sourceRef]);
      for (const [i, t] of ['Follow the approach set out in the source', 'Use your own judgement without checking', 'Skip the step when time is short', 'Ask someone else to decide'].entries())
        await q('insert into options(question_id, label, text, is_correct) values ($1,$2,$3,$4)', [qn.id, 'ABCD'[i], t, i === 0]);
    }
    await audit(req.uid, 'ai.draft', 'course', id, { questions: Math.min(2, lessons.length) });
    return { ok: true };
  });

  app.post('/studio/questions/:id/accept', INSTR, async (req) => {
    await q('update questions set accepted_by = $2, accepted_at = now() where id = $1', [(req.params as any).id, req.uid]);
    await audit(req.uid, 'ai.accept', 'question', (req.params as any).id);
    return { ok: true };
  });

  app.patch('/studio/questions/:id', INSTR, async (req) => {
    const b = z.object({ prompt: z.string().trim().min(3) }).parse(req.body);
    await q('update questions set prompt = $2 where id = $1', [(req.params as any).id, b.prompt]);
    return { ok: true };
  });

  app.post('/studio/courses/:id/submit', INSTR, async (req) => {
    const { id } = req.params as any;
    const miss = await q("select position from lessons where course_id = $1 and (source_ref is null or source_ref = '') order by position", [id]);
    if (miss.length) throw err(`Lesson ${miss[0].position} needs a source before this course can go for review.`, 422);
    const cur = await one("select version from courses where id = $1 and status = 'draft'", [id]);
    const next = '0.' + ((parseInt(String(cur?.version || '0.0').split('.')[1], 10) || 0) + 1);
    const c = cur && (await one("update courses set status = 'in_review', version = $3, author_id = coalesce(author_id, $2) where id = $1 returning title", [id, req.uid, next]));
    if (!c) throw err('This course is not a draft.', 409);
    await notifyRole('training_owner', 'assigned', 'A version is waiting for your approval', c.title, `/studio/${id}/review`);
    await audit(req.uid, 'course.submit', 'course', id);
    return { ok: true };
  });

  // Course Version History (Accessible by both instructors and training owners)
  app.get('/studio/courses/:id/versions', BOTH, async (req) => {
    const { id } = req.params as any;
    return q(
      `select cv.id, cv.version, cv.title, cv.objective, cv.approved_at as "approvedAt",
              u.first_name || ' ' || u.last_name as "approvedBy",
              jsonb_array_length(cv.snapshot->'lessons') as "lessonsCount",
              jsonb_array_length(cv.snapshot->'questions') as "questionsCount",
              jsonb_array_length(cv.snapshot->'rubric') as "rubricCount"
       from course_versions cv
       left join users u on u.id = cv.approved_by
       where cv.course_id = $1
       order by cv.approved_at desc`,
      [id]
    );
  });

  // ==========================================
  // TRAINING OWNER APPROVALS & SNAPSHOTTING
  // ==========================================

  // Dedicated Approvals Queue Dashboard
  app.get('/approvals', OWNER, async () => {
    const awaiting = await q(
      `select c.id, c.title, c.version, c.objective, c.requires_practical as "requiresPractical", c.task_prompt as "taskPrompt",
              c.created_at as "submittedAt",
              u.first_name || ' ' || u.last_name as author,
              (select count(*)::int from lessons l where l.course_id = c.id) as "lessonsCount",
              (select count(*)::int from questions q where q.course_id = c.id and (not q.ai_drafted or q.accepted_by is not null)) as "questionsCount",
              (select count(*)::int from rubric_criteria rc where rc.course_id = c.id) as "rubricCount"
       from courses c
       left join users u on u.id = c.author_id
       where c.status = 'in_review'
       order by c.created_at desc`
    );

    const published = await q(
      `select cv.id, cv.course_id as "courseId", cv.version, cv.title, cv.objective, cv.approved_at as "approvedAt",
              u.first_name || ' ' || u.last_name as "approvedBy",
              jsonb_array_length(cv.snapshot->'lessons') as "lessonsCount",
              jsonb_array_length(cv.snapshot->'questions') as "questionsCount",
              jsonb_array_length(cv.snapshot->'rubric') as "rubricCount"
       from course_versions cv
       left join users u on u.id = cv.approved_by
       order by cv.approved_at desc limit 30`
    );

    const stats = {
      awaitingCount: awaiting.length,
      publishedCount: published.length,
      totalCourses: (await one("select count(*)::int n from courses where status = 'published'"))?.n || 0,
    };

    return { awaiting, published, stats };
  });

  app.get('/approvals/versions/:id', OWNER, async (req) => {
    const { id } = req.params as any;
    const v = await one(
      `select cv.*, u.first_name || ' ' || u.last_name as "approvedByName"
       from course_versions cv
       left join users u on u.id = cv.approved_by
       where cv.id = $1`,
      [id]
    );
    if (!v) throw err('Version snapshot not found.', 404);
    return v;
  });

  // Review course details (Training owner only)
  app.get('/studio/courses/:id/review', OWNER, async (req) => {
    const { id } = req.params as any;
    const c = await one(
      'select id, title, version, status, objective, task_prompt as "taskPrompt", requires_practical as "requiresPractical" from courses where id = $1',
      [id]
    );
    if (!c) throw err('That course was not found.', 404);
    const author = await one('select u.first_name || \' \' || u.last_name as name, c.created_at from courses c join users u on u.id = c.author_id where c.id = $1', [id]);
    const lessons = await q('select id, position, title, status, minutes, video_url as "videoUrl", transcript, source_ref as "sourceRef" from lessons where course_id = $1 order by position', [id]);
    const lessonCounts = await one("select count(*)::int n, count(*) filter (where source_ref is not null and source_ref <> '')::int sourced from lessons where course_id = $1", [id]);
    const qs = await one('select count(*)::int n, count(*) filter (where ai_drafted)::int ai, count(*) filter (where ai_drafted and accepted_by is null)::int ai_open from questions where course_id = $1', [id]);
    const sources = await one('select count(*)::int n, count(*) filter (where approved)::int ok from source_materials where course_id = $1', [id]);
    const comments = await q(
      `select cc.id, cc.body, cc.created_at as "createdAt", cc.resolved, cc.resolved_at as "resolvedAt",
              u.first_name || ' ' || u.last_name as author,
              ru.first_name || ' ' || ru.last_name as "resolvedBy"
       from course_comments cc
       join users u on u.id = cc.author_id
       left join users ru on ru.id = cc.resolved_by
       where cc.course_id = $1
       order by cc.resolved asc, cc.created_at desc`,
      [id]
    );
    const rubricCriteria = await q('select id, position, title, text from rubric_criteria where course_id = $1 order by position', [id]);

    const unresolvedComments = comments.filter((cm: any) => !cm.resolved);

    const checklist = [
      { label: 'The objective is measurable', done: !!(c.objective && c.objective.trim().length > 10) },
      { label: 'Every lesson has a linked source', done: lessonCounts.n > 0 && lessonCounts.sourced === lessonCounts.n },
      { label: 'Assessment matches the objective', done: qs.n > 0 },
      { label: `AI-assisted content reviewed by a person${qs.aiOpen ? ` (${qs.aiOpen} left)` : ''}`, done: qs.aiOpen === 0 },
      ...(c.requiresPractical ? [{ label: 'Rubric criteria defined for practical task', done: rubricCriteria.length > 0 }] : []),
      ...(comments.length > 0
        ? [{ label: `Reviewer comments addressed (${comments.length - unresolvedComments.length}/${comments.length} resolved)`, done: unresolvedComments.length === 0 }]
        : []),
    ];

    return {
      course: c,
      author,
      lessons,
      rubricCriteria,
      checklist,
      comments,
      provenance: { sources, ai: qs.ai },
      canApprove: checklist.every((x) => x.done),
    };
  });

  app.post('/studio/courses/:id/comments', BOTH, async (req) => {
    const b = z.object({ body: z.string().trim().min(1).max(1000) }).parse(req.body);
    await q('insert into course_comments(course_id, author_id, body) values ($1,$2,$3)', [(req.params as any).id, req.uid, b.body]);
    return { ok: true };
  });

  app.patch('/studio/courses/:id/comments/:commentId/resolve', BOTH, async (req) => {
    const { id, commentId } = req.params as any;
    const b = z.object({ resolved: z.boolean() }).parse(req.body);

    const c = await one('select id from course_comments where id = $1 and course_id = $2', [commentId, id]);
    if (!c) throw err('Comment not found.', 404);

    if (b.resolved) {
      await q(
        'update course_comments set resolved = true, resolved_by = $1, resolved_at = now() where id = $2',
        [req.uid, commentId]
      );
    } else {
      await q(
        'update course_comments set resolved = false, resolved_by = null, resolved_at = null where id = $1',
        [commentId]
      );
    }
    return { ok: true, resolved: b.resolved };
  });

  // ONE-CLICK COURSE VERSION SNAPSHOTTING ON PUBLISH
  app.post('/studio/courses/:id/approve', OWNER, async (req) => {
    const { id } = req.params as any;
    const c = await one('select id, title, status, author_id, objective, task_prompt as "taskPrompt", requires_practical as "requiresPractical", version from courses where id = $1', [id]);
    if (!c || c.status !== 'in_review') throw err('This version is not waiting for approval.', 409);
    if (config.requireSeparateReviewer && c.authorId === req.uid) throw err('You wrote this course, so someone else must approve it.', 403);
    const open = await one('select count(*)::int n from questions where course_id = $1 and ai_drafted and accepted_by is null', [id]);
    if (open.n) throw err('Review the AI-assisted questions first.', 409);

    // Snapshot full course state: lessons, questions, rubric
    const lessons = await q('select id, position, title, minutes, transcript, video_url, source_ref from lessons where course_id = $1 order by position', [id]);
    const questions = await q(
      `select q.id, q.position, q.prompt, q.explanation, q.source_ref,
         coalesce(json_agg(json_build_object('id', o.id, 'label', o.label, 'text', o.text, 'isCorrect', o.is_correct) order by o.label) filter (where o.id is not null), '[]') as options
       from questions q
       left join options o on o.question_id = q.id
       where q.course_id = $1 and (not q.ai_drafted or q.accepted_by is not null)
       group by q.id order by q.position`,
      [id]
    );
    const rubric = await q('select id, position, title, text from rubric_criteria where course_id = $1 order by position', [id]);

    // Version increment logic
    const prevVersion = String(c.version || '0.1');
    let publishedVersion = '1.0';
    if (prevVersion.startsWith('1.')) {
      const minor = parseInt(prevVersion.split('.')[1] || '0', 10);
      publishedVersion = `1.${minor + 1}`;
    } else if (!prevVersion.startsWith('0.')) {
      const major = parseInt(prevVersion.split('.')[0] || '1', 10);
      publishedVersion = `${major + 1}.0`;
    }

    const snapshot = {
      course: {
        id: c.id,
        title: c.title,
        objective: c.objective,
        taskPrompt: c.taskPrompt,
        requiresPractical: c.requiresPractical,
        version: publishedVersion,
      },
      lessons,
      questions,
      rubric,
      approvedAt: new Date().toISOString(),
      approvedBy: req.uid,
    };

    // Store immutable snapshot into course_versions
    await q(
      `insert into course_versions(course_id, version, title, objective, task_prompt, snapshot, approved_by, approved_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [id, publishedVersion, c.title, c.objective, c.taskPrompt, JSON.stringify(snapshot), req.uid]
    );

    await q("update courses set status = 'published', version = $2, published_at = now() where id = $1", [id, publishedVersion]);
    if (c.authorId) await notify(c.authorId, 'account', 'Your course was approved and published', `${c.title} (v${publishedVersion})`, `/studio/${id}`);
    await audit(req.uid, 'course.approve', 'course', id, { version: publishedVersion, lessons: lessons.length, questions: questions.length, rubric: rubric.length });
    return { ok: true, version: publishedVersion };
  });

  app.post('/studio/courses/:id/return', OWNER, async (req) => {
    const { id } = req.params as any;
    const b = z.object({ comment: z.string().trim().min(1, 'Add a comment for the editor.') }).parse(req.body);
    const c = await one("update courses set status = 'draft' where id = $1 and status = 'in_review' returning title, author_id", [id]);
    if (!c) throw err('This version is not waiting for approval.', 409);
    await q('insert into course_comments(course_id, author_id, body) values ($1,$2,$3)', [id, req.uid, b.comment]);
    if (c.authorId) await notify(c.authorId, 'feedback', 'Your version was returned with comments', b.comment, `/studio/${id}`);
    await audit(req.uid, 'course.return', 'course', id);
    return { ok: true };
  });

  // Assign to audiences (Both instructors and training owners)
  app.get('/studio/courses/:id/assign', BOTH, async (req) => {
    const { id } = req.params as any;
    const c = await one('select id, title, version, published_at, status from courses where id = $1', [id]);
    const groups = await q(
      `select g.id, g.name, g.kind, (select count(*)::int from memberships m where m.group_id = g.id and m.ends_on is null) as people from groups g order by g.name`);
    const roles = await q(
      `select r.key as id, r.name, (select count(*)::int from user_roles ur join users u on u.id = ur.user_id where ur.role_id = r.id and u.status = 'active') as people from roles r order by r.id`);
    return { course: c, audiences: [...groups.map((g) => ({ type: g.kind, id: g.id, name: g.name, people: g.people })), ...roles.map((r) => ({ type: 'role', id: r.id, name: r.name, people: r.people }))] };
  });

  const assignBody = z.object({
    audiences: z.array(z.object({ type: z.enum(['group', 'cohort', 'role']), id: z.string() })).min(1, 'Choose at least one audience.'),
    dueOn: z.string().nullish(),
    required: z.boolean().default(true),
    remind: z.boolean().default(true),
  });

  app.post('/studio/courses/:id/assign/preview', BOTH, async (req) => {
    const b = assignBody.partial().parse(req.body);
    const ids = await audienceUsers(b.audiences ?? []);
    const already = ids.length ? (await one('select count(*)::int n from enrolments where course_id = $1 and user_id = any($2)', [(req.params as any).id, ids])).n : 0;
    return { learners: ids.length, alreadyEnrolled: already, audiences: (b.audiences ?? []).length };
  });

  app.post('/studio/courses/:id/assign', BOTH, async (req) => {
    const { id } = req.params as any;
    const b = assignBody.parse(req.body);
    const c = await one("select title, status from courses where id = $1", [id]);
    if (c?.status !== 'published') throw err('Only an approved, published version can be assigned.', 409);
    const ids = await audienceUsers(b.audiences);
    if (!ids.length) throw err('Those audiences have no learners yet.', 409);
    await q('insert into assignments(course_id, audiences, due_on, required, remind, assigned_by) values ($1,$2,$3,$4,$5,$6)', [id, JSON.stringify(b.audiences), b.dueOn || null, b.required, b.remind, req.uid]);
    const added = await enrolUsers(ids, id, { required: b.required, dueOn: b.dueOn || null });
    await q(
      `insert into notifications(user_id, kind, title, body, link) select unnest($1::uuid[]), 'assigned', $2, $3, $4`,
      [ids, `You have been assigned ${c.title}`, b.dueOn ? `Due ${b.dueOn}` : null, `/courses/${id}`]
    );
    await audit(req.uid, 'course.assign', 'course', id, { learners: ids.length, added });
    return { learners: ids.length, added };
  });
}
