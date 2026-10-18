import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { q, one, tx } from '../db';

export default async function (app: FastifyInstance) {
  const U = { preHandler: app.role() };

  // List conversations for the logged in user
  app.get('/messages/conversations', U, async (req) => {
    const convos = await q(
      `select c.id, c.subject, c.category, c.course_id, c.created_at, c.updated_at,
              cp.last_read_at
       from conversations c
       join conversation_participants cp on cp.conversation_id = c.id and cp.user_id = $1
       order by c.updated_at desc`,
      [req.uid]
    );

    const out = [];
    for (const c of convos) {
      // Find other participants
      const participants = await q(
        `select u.id, u.first_name, u.last_name, u.email,
                coalesce(array_agg(r.key) filter (where r.key is not null), '{}') as roles
         from conversation_participants cp
         join users u on u.id = cp.user_id
         left join user_roles ur on ur.user_id = u.id
         left join roles r on r.id = ur.role_id
         where cp.conversation_id = $1 and cp.user_id != $2
         group by u.id`,
        [c.id, req.uid]
      );

      // Latest message
      const lastMsg = await one(
        `select m.id, m.body, m.created_at, m.sender_id, u.first_name || ' ' || u.last_name as sender_name
         from messages m
         join users u on u.id = m.sender_id
         where m.conversation_id = $1
         order by m.created_at desc limit 1`,
        [c.id]
      );

      // Unread count
      const unread = await one(
        `select count(*)::int as n
         from messages m
         where m.conversation_id = $1 and m.sender_id != $2 and m.created_at > $3`,
        [c.id, req.uid, c.lastReadAt]
      );

      out.push({
        ...c,
        participants,
        lastMessage: lastMsg,
        unreadCount: unread?.n ?? 0,
      });
    }

    return out;
  });

  // Get single conversation details and all messages
  app.get('/messages/conversations/:id', U, async (req, reply) => {
    const { id } = req.params as any;
    const isMember = await one(
      'select 1 x from conversation_participants where conversation_id = $1 and user_id = $2',
      [id, req.uid]
    );
    if (!isMember) return reply.code(404).send({ error: 'Conversation not found.' });

    const convo = await one(
      `select c.id, c.subject, c.category, c.course_id, c.created_at, c.updated_at,
              crs.title as course_title
       from conversations c
       left join courses crs on crs.id = c.course_id
       where c.id = $1`,
      [id]
    );

    const participants = await q(
      `select u.id, u.first_name, u.last_name, u.email,
              coalesce(array_agg(r.key) filter (where r.key is not null), '{}') as roles
       from conversation_participants cp
       join users u on u.id = cp.user_id
       left join user_roles ur on ur.user_id = u.id
       left join roles r on r.id = ur.role_id
       where cp.conversation_id = $1
       group by u.id`,
      [id]
    );

    const messages = await q(
      `select m.id, m.body, m.attachments, m.created_at, m.sender_id,
              u.first_name || ' ' || u.last_name as sender_name,
              u.first_name as sender_first_name,
              coalesce(array_agg(r.key) filter (where r.key is not null), '{}') as sender_roles
       from messages m
       join users u on u.id = m.sender_id
       left join user_roles ur on ur.user_id = u.id
       left join roles r on r.id = ur.role_id
       where m.conversation_id = $1
       group by m.id, u.id
       order by m.created_at asc`,
      [id]
    );

    // Mark as read for this user
    await q(
      'update conversation_participants set last_read_at = now() where conversation_id = $1 and user_id = $2',
      [id, req.uid]
    );

    return { ...convo, participants, messages };
  });

  // Start a new conversation
  app.post('/messages/conversations', U, async (req, reply) => {
    const b = z
      .object({
        recipientId: z.string().uuid('Choose a valid recipient.'),
        subject: z.string().trim().min(1, 'Enter a subject line.').default('General inquiry'),
        category: z.enum(['course', 'feedback', 'supervisor', 'support', 'general']).default('general'),
        courseId: z.string().uuid().nullish(),
        body: z.string().trim().min(1, 'Type your message.'),
      })
      .parse(req.body);

    if (b.recipientId === req.uid) {
      return reply.code(400).send({ error: 'You cannot message yourself.' });
    }

    const recipient = await one("select id, first_name, last_name from users where id = $1 and status = 'active'", [b.recipientId]);
    if (!recipient) return reply.code(404).send({ error: 'Recipient not found.' });

    const sender = await one("select first_name || ' ' || last_name as name from users where id = $1", [req.uid]);

    const convo = await tx(async (t) => {
      const [c] = await t(
        'insert into conversations(subject, category, course_id) values ($1,$2,$3) returning id',
        [b.subject, b.category, b.courseId || null]
      );
      await t('insert into conversation_participants(conversation_id, user_id) values ($1,$2), ($1,$3)', [
        c.id,
        req.uid,
        b.recipientId,
      ]);
      await t('insert into messages(conversation_id, sender_id, body) values ($1,$2,$3)', [
        c.id,
        req.uid,
        b.body,
      ]);
      return c;
    });

    // Notify the recipient
    await q(
      `insert into notifications(user_id, kind, title, body, link) values ($1, 'message', $2, $3, '/messages')`,
      [
        b.recipientId,
        `New message from ${sender?.name ?? 'a colleague'}`,
        `${b.subject}: "${b.body.slice(0, 80)}${b.body.length > 80 ? '...' : ''}"`,
      ]
    );

    return reply.code(201).send(convo);
  });

  // Post a message in an existing conversation
  app.post('/messages/conversations/:id/messages', U, async (req, reply) => {
    const { id } = req.params as any;
    const isMember = await one(
      'select 1 x from conversation_participants where conversation_id = $1 and user_id = $2',
      [id, req.uid]
    );
    if (!isMember) return reply.code(404).send({ error: 'Conversation not found.' });

    const b = z.object({ body: z.string().trim().min(1, 'Type a message.') }).parse(req.body);

    const sender = await one("select first_name || ' ' || last_name as name from users where id = $1", [req.uid]);
    const convo = await one('select subject from conversations where id = $1', [id]);

    const msg = await tx(async (t) => {
      const [m] = await t(
        'insert into messages(conversation_id, sender_id, body) values ($1,$2,$3) returning id, body, created_at, sender_id',
        [id, req.uid, b.body]
      );
      await t('update conversations set updated_at = now() where id = $1', [id]);
      await t('update conversation_participants set last_read_at = now() where conversation_id = $1 and user_id = $2', [
        id,
        req.uid,
      ]);
      return m;
    });

    // Notify other participants in the conversation
    const others = await q(
      'select user_id from conversation_participants where conversation_id = $1 and user_id != $2',
      [id, req.uid]
    );
    for (const other of others) {
      await q(
        `insert into notifications(user_id, kind, title, body, link) values ($1, 'message', $2, $3, '/messages')`,
        [
          other.userId,
          `New message from ${sender?.name ?? 'a colleague'}`,
          `${convo?.subject || 'Message'}: "${b.body.slice(0, 80)}${b.body.length > 80 ? '...' : ''}"`,
        ]
      );
    }

    return reply.code(201).send({
      ...msg,
      senderName: sender?.name,
      senderFirstName: sender?.name?.split(' ')[0],
    });
  });

  // List potential recipients for a new conversation (instructors, assessors, supervisors, admins, and peers)
  app.get('/messages/recipients', U, async (req) => {
    const rows = await q(
      `select u.id, u.first_name, u.last_name, u.email,
              coalesce(array_agg(r.key order by r.id) filter (where r.key is not null), '{}') as roles,
              (select g.name from memberships m join groups g on g.id = m.group_id where m.user_id = u.id and m.ends_on is null limit 1) as team
       from users u
       left join user_roles ur on ur.user_id = u.id
       left join roles r on r.id = ur.role_id
       where u.status = 'active' and u.id != $1
       group by u.id
       order by u.first_name, u.last_name`,
      [req.uid]
    );
    return rows;
  });
}
