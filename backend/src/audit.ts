import { q } from './db';

export const audit = (actor: string | null, action: string, entity: string, entityId: string | null, detail: any = {}) =>
  q('insert into audit_log(actor_id, action, entity, entity_id, detail) values ($1,$2,$3,$4,$5)', [actor, action, entity, entityId, JSON.stringify(detail)]);

export const notify = (userId: string, kind: string, title: string, body: string | null = null, link: string | null = null) =>
  q('insert into notifications(user_id, kind, title, body, link) values ($1,$2,$3,$4,$5)', [userId, kind, title, body, link]);

export const notifyRole = (roleKey: string, kind: string, title: string, body: string | null = null, link: string | null = null) =>
  q(
    `insert into notifications(user_id, kind, title, body, link)
     select u.id, $2, $3, $4, $5 from users u
     join user_roles ur on ur.user_id = u.id join roles r on r.id = ur.role_id
     where r.key = $1 and u.status = 'active'`,
    [roleKey, kind, title, body, link]
  );

/** Email is a stub: swap the body for SMTP or a provider SDK. Links are printed to the API log in development. */
export function sendMail(to: string, subject: string, text: string) {
  console.log(`[mail] to=${to} subject="${subject}"\n${text}\n`);
}
