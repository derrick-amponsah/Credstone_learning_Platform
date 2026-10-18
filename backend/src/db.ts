import pg from 'pg';
import { config } from './config';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapRow = (r: any) => Object.fromEntries(Object.entries(r).map(([k, v]) => [camel(k), v]));

export type Q = (text: string, params?: any[]) => Promise<any[]>;
/** Run a query. Rows come back with camelCase keys (first_name -> firstName). */
export const q: Q = async (text, params = []) => (await pool.query(text, params)).rows.map(mapRow);
export const one = async (text: string, params: any[] = []) => (await q(text, params))[0] ?? null;

export async function tx<T>(fn: (t: Q) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const out = await fn(async (text, params = []) => (await c.query(text, params)).rows.map(mapRow));
    await c.query('commit');
    return out;
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
}
