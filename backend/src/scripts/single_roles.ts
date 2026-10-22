import { pool } from '../db';

(async () => {
  console.log('Enforcing strictly one role per seeded user...');

  // 1. Ana Lopez -> instructor only
  await pool.query(`
    delete from user_roles ur
    using users u, roles r
    where ur.user_id = u.id and ur.role_id = r.id
      and u.email = 'ana.lopez@credstone.com' and r.key <> 'instructor';
  `);

  // 2. Ravi Patel -> training_owner only
  await pool.query(`
    delete from user_roles ur
    using users u, roles r
    where ur.user_id = u.id and ur.role_id = r.id
      and u.email = 'ravi.patel@credstone.com' and r.key <> 'training_owner';
  `);

  // 3. Supervisors -> supervisor only
  await pool.query(`
    delete from user_roles ur
    using users u, roles r
    where ur.user_id = u.id and ur.role_id = r.id
      and u.email in ('priya.shah@credstone.com', 'marcus.reid@credstone.com', 'dana.cole@credstone.com')
      and r.key <> 'supervisor';
  `);

  // Query and print all core users
  const res = await pool.query(`
    select u.first_name, u.last_name, u.email, coalesce(array_agg(r.key), '{}') as roles
    from users u
    left join user_roles ur on ur.user_id = u.id
    left join roles r on r.id = ur.role_id
    where u.email in (
      'admin@credstone.com',
      'ana.lopez@credstone.com',
      'ravi.patel@credstone.com',
      'priya.shah@credstone.com',
      'marcus.reid@credstone.com',
      'dana.cole@credstone.com',
      'sam.morgan@credstone.com',
      'jamie.doe@credstone.com',
      'taylor.kim@credstone.com'
    )
    group by u.id, u.first_name, u.last_name, u.email
    order by u.first_name;
  `);

  console.table(res.rows);
  console.log('Seeded users updated successfully with strictly one role.');
  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
