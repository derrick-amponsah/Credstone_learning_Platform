-- Credstone Learning: PostgreSQL schema (phase 1 subset of the 39-table design)
create extension if not exists pgcrypto;

create table if not exists roles (
  id serial primary key,
  key text unique not null,
  name text not null,
  description text not null default ''
);

insert into roles(key, name, description) values
  ('learner', 'Learner', 'Learns, practises and submits evidence.'),
  ('instructor', 'Content instructor', 'Drafts lessons, assessments and rubrics in the Content Studio.'),
  ('training_owner', 'Training owner', 'Approves versions and monitors effectiveness.'),
  ('assessor', 'Assessor', 'Grades practical work against a rubric.'),
  ('supervisor', 'Supervisor', 'Sees their own team and records observations.'),
  ('admin', 'Platform administrator', 'Manages access, groups and retention. Does not approve content or grade work.')
on conflict (key) do nothing;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  employee_id text,
  password_hash text not null,
  -- pending: signed up, waiting for an administrator to assign a role
  status text not null default 'pending' check (status in ('pending','active','rejected','suspended')),
  -- signup: self sign-up approved by an admin. admin_issued: admin created the account and issued sign-in credentials.
  source text not null default 'signup' check (source in ('signup','admin_issued','seed')),
  must_change_password boolean not null default false,
  level text,
  prefs jsonb not null default '{}',
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id int not null references roles(id),
  granted_by uuid references users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists password_resets (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kind text not null default 'group' check (kind in ('group','cohort')),
  source text not null default 'Entered by hand',
  last_checked_on date,
  created_at timestamptz not null default now()
);
-- Dated records keep history instead of being overwritten
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date
);
create index if not exists memberships_active on memberships(group_id) where ends_on is null;
create table if not exists supervisor_assignments (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references users(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  code text,
  title text not null,
  kind text not null default 'course' check (kind in ('course','path')),
  summary text,
  objective text,
  level text not null default 'Beginner',
  hours numeric not null default 1,
  category text not null default 'Other',
  icon text not null default 'book',
  status text not null default 'draft' check (status in ('draft','in_review','published')),
  version text not null default '0.1',
  author_id uuid references users(id),
  prerequisite_id uuid references courses(id),
  pass_mark int not null default 80,
  quiz_time_limit_minutes int not null default 10,
  requires_practical boolean not null default false,
  requires_observation boolean not null default false,
  task_prompt text,
  observation_items jsonb not null default '[]',
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists path_courses (
  path_id uuid not null references courses(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  position int not null,
  primary key (path_id, course_id)
);
create table if not exists lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  position int not null,
  title text not null,
  minutes int not null default 5,
  kind text not null default 'Video',
  transcript text,
  video_url text,
  document_url text,
  source_ref text,
  status text not null default 'empty' check (status in ('ready','needs_source','empty'))
);
create table if not exists source_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  file_key text,
  approved boolean not null default true,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);
create table if not exists course_comments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  author_id uuid not null references users(id),
  body text not null,
  resolved boolean not null default false,
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  position int not null default 0,
  prompt text not null,
  explanation text,
  source_ref text,
  ai_drafted boolean not null default false,
  accepted_by uuid references users(id),
  accepted_at timestamptz
);
create table if not exists options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label text not null,
  text text not null,
  is_correct boolean not null default false
);
create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  position int not null,
  title text not null,
  body text not null,
  options jsonb not null,
  best_key text not null,
  feedback jsonb not null
);
create table if not exists rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  position int not null default 0,
  title text not null default '',
  text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  version text not null,
  title text not null,
  objective text,
  task_prompt text,
  snapshot jsonb not null default '{}',
  approved_by uuid references users(id),
  approved_at timestamptz not null default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  audiences jsonb not null,
  due_on date,
  required boolean not null default true,
  remind boolean not null default true,
  assigned_by uuid references users(id),
  created_at timestamptz not null default now()
);
create table if not exists enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  required boolean not null default false,
  due_on date,
  status text not null default 'assigned' check (status in ('assigned','in_progress','completed')),
  progress int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);
create table if not exists lesson_progress (
  user_id uuid not null references users(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed boolean not null default false,
  position_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create table if not exists saved_courses (
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  primary key (user_id, course_id)
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  score int not null,
  passed boolean not null,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  file_name text,
  file_key text,
  link text,
  notes text,
  excerpt text,
  status text not null default 'draft' check (status in ('draft','submitted','met','resubmit')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  reviewer_id uuid not null references users(id),
  ratings jsonb not null,
  feedback text not null,
  outcome text not null check (outcome in ('met','resubmit')),
  created_at timestamptz not null default now()
);
create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references users(id) on delete cascade,
  supervisor_id uuid not null references users(id),
  course_id uuid not null references courses(id) on delete cascade,
  ratings jsonb not null,
  notes text,
  follow_up_on date,
  created_at timestamptz not null default now()
);
create table if not exists credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  course_id uuid not null references courses(id),
  title text not null,
  code text unique not null,
  issued_on date not null default current_date,
  valid_until date not null,
  status text not null default 'valid' check (status in ('valid','revoked')),
  issuance text not null default 'criteria'
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on notifications(user_id, created_at desc);

create table if not exists audit_log (
  id bigserial primary key,
  actor_id uuid,
  action text not null,
  entity text,
  entity_id text,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table if not exists retention_policies (
  data_type text primary key,
  months int not null,
  note text
);
create table if not exists app_settings (
  key text primary key,
  value jsonb not null
);
create table if not exists impact_metrics (
  id serial primary key,
  label text not null,
  basis text not null,
  value_pct int not null
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null default '',
  event_type text not null check (event_type in ('deadline','session','observation','study','credential')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  link text,
  course_id uuid references courses(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists calendar_events_user on calendar_events(user_id, starts_at);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'General',
  category text not null default 'general' check (category in ('course','feedback','supervisor','support','general')),
  course_id uuid references courses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_participants_user on conversation_participants(user_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text not null,
  attachments jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation on messages(conversation_id, created_at asc);

