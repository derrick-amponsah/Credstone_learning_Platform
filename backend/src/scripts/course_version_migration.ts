import { pool } from '../db';

(async () => {
  console.log('Running Course Versioning & Rubric Database Migrations...');
  await pool.query(`
    -- 1. Ensure rubric_criteria table exists and has proper columns
    CREATE TABLE IF NOT EXISTS rubric_criteria (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      position INT NOT NULL DEFAULT 0,
      title TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE rubric_criteria ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

    -- 2. Create course_versions snapshot table
    CREATE TABLE IF NOT EXISTS course_versions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      title TEXT NOT NULL,
      objective TEXT,
      task_prompt TEXT,
      snapshot JSONB NOT NULL DEFAULT '{}',
      approved_by UUID REFERENCES users(id),
      approved_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 3. Ensure courses table has requires_practical and task_prompt
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS requires_practical BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS task_prompt TEXT;
  `);
  console.log('Course versioning & rubric migrations applied successfully.');
  await pool.end();
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
