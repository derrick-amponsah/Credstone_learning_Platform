import fs from 'fs';
import path from 'path';
import { pool } from '../db';

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema is up to date.');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
