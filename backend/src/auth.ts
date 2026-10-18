import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { FastifyRequest } from 'fastify';
import { config } from './config';
import { getUserAuth } from './cache';

export const COOKIE = 'cs_token';

async function authenticate(req: FastifyRequest): Promise<{ code: number; msg: string } | null> {
  try {
    await req.jwtVerify();
  } catch {
    return { code: 401, msg: 'Sign in to continue.' };
  }
  const uid = (req.user as any).sub as string;
  const auth = await getUserAuth(uid);
  if (!auth || auth.status !== 'active') return { code: 403, msg: 'This account is not active.' };
  req.uid = auth.id;
  req.roles = auth.roles;
  return null;
}

export default fp(async (app) => {
  await app.register(cookie);
  await app.register(jwt, { secret: config.jwtSecret, cookie: { cookieName: COOKIE, signed: false }, sign: { expiresIn: '8h' } });
  app.decorateRequest('uid', '');
  app.decorateRequest('roles', null as any);
  /** preHandler: signed in, and (when roles are listed) holding at least one of them. */
  app.decorate('role', (...allowed: string[]) => async (req: any, reply: any) => {
    const err = await authenticate(req);
    if (err) return reply.code(err.code).send({ error: err.msg });
    if (allowed.length && !req.roles.some((r: string) => allowed.includes(r))) return reply.code(403).send({ error: 'You do not have access to this.' });
  });
});
