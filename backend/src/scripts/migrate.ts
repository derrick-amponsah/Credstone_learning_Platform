import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { pool } from '../db';

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema is up to date.');

  // Bootstrap initial production platform admin if env vars are provided and no admin exists yet
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
  if (adminEmail && adminPassword) {
    const existing = await pool.query('select id from users where email = $1', [adminEmail]);
    if (existing.rowCount === 0) {
      const hash = await bcrypt.hash(adminPassword, 10);
      const res = await pool.query(
        "insert into users(first_name, last_name, email, password_hash, status, source) values ('Platform', 'Admin', $1, $2, 'active', 'admin_issued') returning id",
        [adminEmail, hash]
      );
      await pool.query(
        "insert into user_roles(user_id, role_id) select $1, id from roles where key = 'admin'",
        [res.rows[0].id]
      );
      console.log(`Initial platform admin created for ${adminEmail}.`);
    }
  }

  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });

