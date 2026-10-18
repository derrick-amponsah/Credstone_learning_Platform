import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { q, one } from '../db';

const eventSchema = z.object({
  title: z.string().trim().min(1, 'Enter an event title.'),
  description: z.string().trim().default(''),
  eventType: z.enum(['deadline', 'session', 'observation', 'study', 'credential']).default('study'),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullish(),
  link: z.string().nullish(),
  courseId: z.string().uuid().nullish(),
});

export default async function (app: FastifyInstance) {
  const U = { preHandler: app.role() };

  // Fetch all calendar events for the signed-in user (custom + dynamic course/credential dates)
  app.get('/calendar/events', U, async (req) => {
    // 1. Custom events created by the user
    const custom = await q(
      `select id, title, description, event_type, starts_at, ends_at, link, course_id, true as is_custom
       from calendar_events
       where user_id = $1
       order by starts_at asc`,
      [req.uid]
    );

    // 2. Course enrolment deadlines
    const deadlines = await q(
      `select e.id as id,
              'Due: ' || c.title as title,
              'Course deadline for ' || c.title || case when e.required then ' (Required)' else '' end as description,
              'deadline' as event_type,
              (e.due_on::text || 'T17:00:00Z')::timestamptz as starts_at,
              (e.due_on::text || 'T18:00:00Z')::timestamptz as ends_at,
              '/courses/' || c.id as link,
              c.id as course_id,
              false as is_custom
       from enrolments e
       join courses c on c.id = e.course_id
       where e.user_id = $1 and e.due_on is not null and e.status != 'completed'
       order by e.due_on asc`,
      [req.uid]
    );

    // 3. Observations follow-up dates (both as learner and as supervisor)
    const observations = await q(
      `select o.id as id,
              'Follow-up: ' || c.title as title,
              coalesce(o.notes, 'Practical observation review') as description,
              'observation' as event_type,
              (o.follow_up_on::text || 'T10:00:00Z')::timestamptz as starts_at,
              (o.follow_up_on::text || 'T11:00:00Z')::timestamptz as ends_at,
              '/team' as link,
              c.id as course_id,
              false as is_custom
       from observations o
       join courses c on c.id = o.course_id
       where (o.learner_id = $1 or o.supervisor_id = $1) and o.follow_up_on is not null
       order by o.follow_up_on asc`,
      [req.uid]
    );

    // 4. Credential renewal reminders
    const credentials = await q(
      `select cr.id as id,
              'Expires: ' || cr.title as title,
              'Credential code ' || cr.code || ' expires on ' || cr.valid_until::text as description,
              'credential' as event_type,
              (cr.valid_until::text || 'T09:00:00Z')::timestamptz as starts_at,
              (cr.valid_until::text || 'T10:00:00Z')::timestamptz as ends_at,
              '/credentials' as link,
              cr.course_id,
              false as is_custom
       from credentials cr
       where cr.user_id = $1 and cr.status = 'valid' and cr.valid_until is not null
       order by cr.valid_until asc`,
      [req.uid]
    );

    return [...custom, ...deadlines, ...observations, ...credentials];
  });

  // Create a new calendar event
  app.post('/calendar/events', U, async (req, reply) => {
    const b = eventSchema.parse(req.body);
    const row = await one(
      `insert into calendar_events(user_id, title, description, event_type, starts_at, ends_at, link, course_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning id, title, description, event_type, starts_at, ends_at, link, course_id, true as is_custom`,
      [req.uid, b.title, b.description, b.eventType, b.startsAt, b.endsAt || null, b.link || null, b.courseId || null]
    );
    return reply.code(201).send(row);
  });

  // Delete a custom calendar event
  app.delete('/calendar/events/:id', U, async (req, reply) => {
    const { id } = req.params as any;
    const r = await q('delete from calendar_events where id = $1 and user_id = $2 returning id', [id, req.uid]);
    if (!r.length) return reply.code(404).send({ error: 'Event not found or cannot be deleted.' });
    return { ok: true };
  });
}
