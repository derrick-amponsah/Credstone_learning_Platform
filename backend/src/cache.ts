import { config } from './config';
import { q, one } from './db';

export type UserAuth = {
  id: string;
  status: string;
  roles: string[];
};

// Fast reads of user status and roles together. Uses Redis when REDIS_URL is set, otherwise an in-process map.
let redis: any = null;
if (config.redisUrl) {
  const Redis = require('ioredis');
  redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
  redis.on('error', (e: any) => console.error('redis', e.message));
}
const mem = new Map<string, { v: UserAuth; exp: number }>();
const key = (id: string) => `userAuth:${id}`;

export async function getUserAuth(userId: string): Promise<UserAuth | null> {
  const k = key(userId);
  try {
    if (redis) {
      const hit = await redis.get(k);
      if (hit) return JSON.parse(hit);
    } else {
      const m = mem.get(k);
      if (m && m.exp > Date.now()) return m.v;
    }
  } catch {}

  const u = await one('select id, status from users where id = $1', [userId]);
  if (!u) return null;

  const rows = await q('select r.key from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = $1', [userId]);
  const roles = rows.map((r) => r.key);
  const data: UserAuth = { id: u.id, status: u.status, roles };

  try {
    if (redis) await redis.set(k, JSON.stringify(data), 'EX', 60);
    else mem.set(k, { v: data, exp: Date.now() + 60_000 });
  } catch {}

  return data;
}

export async function getRoles(userId: string): Promise<string[]> {
  const auth = await getUserAuth(userId);
  return auth?.roles ?? [];
}

export async function dropUser(userId: string) {
  mem.delete(key(userId));
  try { if (redis) await redis.del(key(userId)); } catch {}
}

export const dropRoles = dropUser;
