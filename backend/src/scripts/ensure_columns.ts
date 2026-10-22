import { pool } from '../db';

(async () => {
  console.log('Ensuring database columns...');
  await pool.query(`
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS objective TEXT;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS task_prompt TEXT;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS observation_items JSONB NOT NULL DEFAULT '[]';
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS pass_mark INT NOT NULL DEFAULT 80;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS quiz_time_limit_minutes INT NOT NULL DEFAULT 10;
    ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisite_id UUID REFERENCES courses(id);
    
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS transcript TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS document_url TEXT;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS minutes INT NOT NULL DEFAULT 5;
    ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'empty';
    
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_ref TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_drafted BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id);
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

    ALTER TABLE course_comments ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE course_comments ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id);
    ALTER TABLE course_comments ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
  `);
  console.log('Columns verified and updated successfully.');
  await pool.end();
})().catch((err) => {
  console.error('Column update error:', err);
  process.exit(1);
});
