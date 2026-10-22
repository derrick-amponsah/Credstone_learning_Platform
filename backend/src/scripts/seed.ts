import bcrypt from 'bcrypt';
import { q, one, pool } from '../db';
import { config } from '../config';

const d = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const ts = (n: number) => new Date(Date.now() + n * 864e5).toISOString();

const ROLES: [string, string, string][] = [
  ['learner', 'Learner', 'Learns, practises and submits evidence.'],
  ['instructor', 'Content instructor', 'Drafts lessons, assessments and rubrics in the Content Studio.'],
  ['training_owner', 'Training owner', 'Approves versions and monitors effectiveness.'],
  ['assessor', 'Assessor', 'Grades practical work against a rubric.'],
  ['supervisor', 'Supervisor', 'Sees their own team and records observations.'],
  ['admin', 'Platform administrator', 'Manages access, groups and retention. Does not approve content or grade work.'],
];

let hash = '';
async function user(first: string, last: string, email: string, roles: string[], o: any = {}) {
  const u = await one(
    `insert into users(first_name, last_name, email, employee_id, password_hash, status, source, level, prefs, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
    [first, last, email, o.emp ?? null, hash, o.status ?? 'active', o.source ?? 'seed', o.level ?? null, JSON.stringify(o.status === 'pending' ? {} : { onboarded: true }), o.created ?? ts(-200)]
  );
  for (const r of roles) await q('insert into user_roles(user_id, role_id) select $1, id from roles where key = $2', [u.id, r]);
  return u.id as string;
}
async function group(name: string, kind: string, source: string, checked: string | null, sup?: string) {
  const g = await one('insert into groups(name, kind, source, last_checked_on) values ($1,$2,$3,$4) returning id', [name, kind, source, checked]);
  if (sup) await q('insert into supervisor_assignments(supervisor_id, group_id) values ($1,$2)', [sup, g.id]);
  return g.id as string;
}
const join = (u: string, g: string) => q('insert into memberships(user_id, group_id) values ($1,$2)', [u, g]);

async function course(code: string, title: string, o: any, lessons: string[] = []) {
  const c = await one(
    `insert into courses(code, title, kind, summary, objective, level, hours, category, icon, status, version, author_id, prerequisite_id, requires_practical, requires_observation, task_prompt, observation_items, published_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) returning id`,
    [code, title, o.kind ?? 'course', o.summary ?? title, o.objective ?? '', o.level ?? 'Beginner', o.hours ?? 1, o.category ?? 'Other', o.icon ?? 'book', o.status ?? 'published', o.version ?? '1.0', o.author ?? null, o.pre ?? null, !!o.practical, !!o.observation, o.task ?? null, JSON.stringify(o.items ?? []), o.status === 'draft' ? null : ts(-120)]
  );
  for (const [i, t] of lessons.entries())
    await q(`insert into lessons(course_id, position, title, minutes, kind, transcript, source_ref, status) values ($1,$2,$3,$4,$5,$6,$7,'ready')`, [c.id, i + 1, t, [5, 12, 10, 15, 10, 5][i] ?? 8, i % 2 ? 'Video and reading' : 'Video', `Transcript for "${t}". Listening is not waiting for your turn to talk. Notice what the other person is feeling, repeat the point back in your own words, and ask one question before you respond.`, 'Course material v1']);
  return c.id as string;
}
async function quiz(courseId: string, items: [string, string, string[], string][]) {
  for (const [i, [prompt, expl, opts, right]] of items.entries()) {
    const qn = await one('insert into questions(course_id, position, prompt, explanation) values ($1,$2,$3,$4) returning id', [courseId, i + 1, prompt, expl]);
    for (const [j, t] of opts.entries()) await q('insert into options(question_id, label, text, is_correct) values ($1,$2,$3,$4)', [qn.id, 'ABCD'[j], t, t === right]);
  }
}
async function enrol(u: string, c: string, o: any = {}) {
  await q(`insert into enrolments(user_id, course_id, required, due_on, status, progress, created_at, updated_at, completed_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict do nothing`,
    [u, c, !!o.required, o.due ?? null, o.status ?? 'in_progress', o.progress ?? 0, o.created ?? ts(-30), o.updated ?? ts(-1), o.status === 'completed' ? (o.completedAt ?? ts(-5)) : null]);
}
async function doLessons(u: string, c: string, n: number) {
  const ls = await q('select id from lessons where course_id = $1 order by position limit $2', [c, n]);
  for (const l of ls) await q('insert into lesson_progress(user_id, lesson_id, completed) values ($1,$2,true)', [u, l.id]);
  const t = await one('select count(*)::int n from lessons where course_id = $1', [c]);
  await q('update enrolments set progress = $3 where user_id = $1 and course_id = $2', [u, c, t.n ? Math.round((100 * ls.length) / t.n) : 0]);
}
const pass = (u: string, c: string) => q('insert into attempts(user_id, course_id, score, passed) values ($1,$2,92,true)', [u, c]);
async function submission(u: string, c: string, status: string, excerpt: string) {
  return one(`insert into submissions(user_id, course_id, file_name, notes, excerpt, status, submitted_at) values ($1,$2,'feedback-conversation.docx','Draft opening for the conversation.',$3,$4,$5) returning id`, [u, c, excerpt, status, ts(-1)]);
}
const cred = (u: string, c: string, title: string, code: string, issued: number, valid: number) =>
  q('insert into credentials(user_id, course_id, title, code, issued_on, valid_until) values ($1,$2,$3,$4,$5,$6)', [u, c, title, code, d(issued), d(valid)]);

(async () => {
  hash = await bcrypt.hash(config.seedPassword, 10);
  await q('truncate roles, users, groups, courses, notifications, audit_log, retention_policies, app_settings, impact_metrics, calendar_events, conversations, conversation_participants, messages restart identity cascade');
  for (const [k, n, desc] of ROLES) await q('insert into roles(key, name, description) values ($1,$2,$3)', [k, n, desc]);

  // People
  const admin = await user('Alex', 'Admin', 'admin@credstone.com', ['admin']);
  const derrick = await user('Derrick', 'Amponsah', 'derrick@credstone.com', ['admin']);
  const jamie = await user('Jamie', 'Doe', 'jamie.doe@credstone.com', ['learner'], { emp: 'CT-20418', level: 'Just starting' });
  const priya = await user('Priya', 'Shah', 'priya.shah@credstone.com', ['supervisor']);
  const marcus = await user('Marcus', 'Reid', 'marcus.reid@credstone.com', ['supervisor']);
  const dana = await user('Dana', 'Cole', 'dana.cole@credstone.com', ['supervisor']);
  const ana = await user('Ana', 'Lopez', 'ana.lopez@credstone.com', ['instructor']);
  const ravi = await user('Ravi', 'Patel', 'ravi.patel@credstone.com', ['training_owner']);
  const sam = await user('Sam', 'Morgan', 'sam.morgan@credstone.com', ['assessor']);
  const pending = await user('Taylor', 'Kim', 'taylor.kim@credstone.com', [], { status: 'pending', source: 'signup', emp: 'CT-30551', created: ts(0) });
  const L: string[] = [];
  for (const c of 'ABCDEFGHIJKLM') L.push(await user('Learner', c, `learner.${c.toLowerCase()}@credstone.com`, ['learner']));

  // Teams
  const teamA = await group('Team A', 'group', 'Spreadsheet import', d(-5), priya);
  const teamB = await group('Team B', 'group', 'Entered by hand', d(-60), marcus);
  const teamC = await group('Team C', 'group', 'Spreadsheet import', null);
  const ops = await group('Operations', 'group', 'Spreadsheet import', d(-3), dana);
  const june = await group('New joiners, June', 'cohort', 'Spreadsheet import', d(-3));
  for (const u of [jamie, ...L.slice(0, 8)]) await join(u, teamA);
  for (const u of L.slice(8, 10)) await join(u, teamB);
  await join(L[10], teamC);
  for (const u of L.slice(11)) await join(u, ops);
  for (const u of [L[8], L[9], L[10]]) await join(u, june);
  await q("insert into app_settings values ('membership_owner', $1::jsonb)", [JSON.stringify(ravi)]);

  // Courses
  const wb = await course('WB', 'Workplace Basics', { hours: 1 }, ['Welcome', 'How we work']);
  const ec = await course('EC', 'Effective Communication', {
    category: 'Leadership', hours: 3, icon: 'users', pre: wb, practical: true, observation: true,
    objective: 'Give clear, respectful feedback in a difficult conversation and agree a next step.',
    task: 'Write the opening two minutes of a conversation with a teammate whose reports keep arriving late. Show how you would describe the problem, its effect, and a next step.',
    items: ['Describes what happened without blaming', 'Explains the effect on the team', 'Asks what help is needed', 'Agrees a clear next step and date'],
  }, ['Introduction', 'Communicating with Impact', 'Active Listening', 'Handling Difficult Conversations', 'Written Communication', 'Course Summary']);
  await quiz(ec, [
    ['What is the first step of active listening?', 'Listening starts with attention on the other person.', ['Plan your reply', 'Give the speaker your full attention', 'Interrupt to clarify', 'Check your phone'], 'Give the speaker your full attention'],
    ['Which approach is most effective when giving feedback in a difficult conversation?', 'Specific, objective feedback focused on a solution keeps the talk constructive.', ["Focus on the person's weaknesses", 'Be specific, objective and solution-focused', 'Avoid the conversation if possible', 'Use a general, non-specific message'], 'Be specific, objective and solution-focused'],
    ['Why ask a question before suggesting a change?', 'It keeps the conversation two-way.', ['It delays the conversation', 'It keeps the conversation two-way', 'It avoids giving feedback', 'It shows who is in charge'], 'It keeps the conversation two-way'],
    ['Which opening line describes behaviour, not the person?', 'Behaviour can be observed and changed.', ['You are always late', 'The report arrived on Thursday for the third time', 'You do not care', 'Your attitude is a problem'], 'The report arrived on Thursday for the third time'],
    ['What should end a difficult conversation?', 'A clear next step and a date.', ['A joke', 'A clear next step and date', 'Silence', 'A complaint'], 'A clear next step and date'],
  ]);
  await q('insert into rubric_criteria(course_id, position, text) values ($1,1,$2),($1,2,$3),($1,3,$4)', [ec, 'Describes the behaviour, not the person', 'States the effect on others', 'Agrees a clear next step']);
  const fb = (well: string[], work: string[]) => ({ well, work });
  await q('insert into scenarios(course_id, position, title, body, options, best_key, feedback) values ($1,1,$2,$3,$4,$5,$6)', [ec, "A teammate's late report",
    'Sam has handed in the weekly report late three times this month. The team now waits on it before they can start. You have five minutes with Sam this afternoon. What do you do?',
    JSON.stringify([{ key: 'A', text: 'Tell Sam the report was late again and ask for an explanation.' }, { key: 'B', text: 'Describe what you saw, say how it affected the team, and ask what support Sam needs.' }, { key: 'C', text: 'Say nothing this time and hope the next report arrives earlier.' }]), 'B',
    JSON.stringify({ A: fb(['You raised the issue promptly.'], ['Describe the effect on the team, not only the lateness.', 'Ask what help Sam needs before asking for an explanation.']), B: fb(['You stuck to facts instead of judging Sam.', 'You named the effect on the team.', 'You asked a question, which keeps the talk two-way.'], ['Agree a clear next step and date before you finish.', 'Check how Sam heard the message, in their own words.']), C: fb(['You stayed calm.'], ['The pattern will continue if nobody raises it.', 'Name what you saw and agree a next step.']) })]);
  for (const [i, [t, b]] of ([['A quiet team member', 'A teammate rarely speaks in meetings. You want their view. What do you do?'], ['Pushback on a plan', 'A colleague disagrees with your plan in front of the team. How do you respond?']] as string[][]).entries())
    await q('insert into scenarios(course_id, position, title, body, options, best_key, feedback) values ($1,$2,$3,$4,$5,$6,$7)', [ec, i + 2, t, b,
      JSON.stringify([{ key: 'A', text: 'Ask an open question and listen to the answer.' }, { key: 'B', text: 'Move on without comment.' }, { key: 'C', text: 'Tell them to speak up.' }]), 'A',
      JSON.stringify({ A: fb(['You invited their view.'], ['Follow up in private if needed.']), B: fb(['You kept the meeting moving.'], ['You missed a chance to include them.']), C: fb(['You were direct.'], ['Pressure can close people down.']) })]);

  const dp = await course('DP', 'Data Privacy and Security', { hours: 2, category: 'Compliance', icon: 'lock' }, ['Why privacy matters', 'Handling personal data', 'Reporting a breach']);
  await quiz(dp, [['Who should you tell first about a suspected data breach?', 'Report promptly through the agreed route.', ['A friend', 'Your security contact', 'Nobody', 'A customer'], 'Your security contact']]);
  const cf = await course('CF', 'Cloud Fundamentals', { hours: 4, category: 'Technical Skills', icon: 'cloud' }, ['What is the cloud?', 'Storage and compute']);
  const py = await course('PY', 'Intro to Python Scripting', { hours: 6, category: 'Technical Skills', icon: 'code' }, ['Hello, Python', 'Variables and loops']);
  const xl = await course('XL', 'Working with Data in Excel', { hours: 3, level: 'Intermediate', category: 'Technical Skills', icon: 'chart' }, ['Tables and filters', 'Formulas']);
  const hs = await course('HS', 'Health & Safety Essentials', { hours: 3, category: 'Compliance', icon: 'shield' }, ['Spotting hazards', 'Emergency steps']);
  const dpa = await course('DPA', 'Data Privacy Awareness', { hours: 1, category: 'Compliance', icon: 'lock' }, ['Awareness basics']);
  const ca = await course('CA', 'Cybersecurity Awareness', { kind: 'path', hours: 3, category: 'Compliance', icon: 'shield' });
  for (const [i, t] of ['Phishing Basics', 'Passwords and MFA', 'Reporting Incidents'].entries()) { const c = await course('CY' + i, t, { category: 'Compliance', icon: 'shield' }, [t]); await q('insert into path_courses values ($1,$2,$3)', [ca, c, i + 1]); }
  const lf = await course('LF', 'Leadership Fundamentals', { kind: 'path', hours: 6, category: 'Leadership', icon: 'route' });
  await q('insert into path_courses values ($1,$2,1)', [lf, ec]);
  for (const [i, t] of ['Coaching Conversations', 'Delegation Basics', 'Running Team Meetings'].entries()) { const c = await course('LD' + i, t, { category: 'Leadership', icon: 'users' }, [t]); await q('insert into path_courses values ($1,$2,$3)', [lf, c, i + 2]); }

  // Drafts in the Content Studio
  const fbk = await course('GF', 'Leadership: Giving Feedback', { status: 'draft', version: '0.3', author: ana, category: 'Leadership', objective: 'Give feedback that describes behaviour, states its effect and agrees a next step.' });
  for (const [i, t, s] of [[1, 'Why feedback matters', 'Feedback SOP v3, p. 2'], [2, 'The three-part message', 'Feedback SOP v3, p. 4'], [3, 'Handling pushback', null]] as any[])
    await q('insert into lessons(course_id, position, title, source_ref, status) values ($1,$2,$3,$4,$5)', [fbk, i, t, s, s ? 'ready' : 'needs_source']);
  for (const n of ['Feedback SOP v3.pdf', 'Manager guide.pdf', 'Team handbook.docx']) await q('insert into source_materials(course_id, name, uploaded_by) values ($1,$2,$3)', [fbk, n, ana]);
  for (const [i, p, s] of [[1, 'Which opening line describes behaviour, not the person?', 'Feedback SOP v3, p. 4'], [2, 'Why do we ask a question before suggesting a change?', 'Manager guide, p. 12']] as any[]) {
    const qn = await one('insert into questions(course_id, position, prompt, source_ref, ai_drafted) values ($1,$2,$3,$4,true) returning id', [fbk, i, p, s]);
    for (const [j, t] of ['Option A', 'Option B', 'Option C'].entries()) await q('insert into options(question_id, label, text, is_correct) values ($1,$2,$3,$4)', [qn.id, 'ABC'[j], t, j === 1]);
  }
  await q('insert into course_comments(course_id, author_id, body) values ($1,$2,$3)', [fbk, ana, 'Lesson 3 now links to the Manager guide, chapter 2.']);
  for (const t of ['Data Privacy Training', 'Customer Service Excellence', 'Safety Induction']) await course('DR', t, { status: 'draft', version: '0.1', author: ana });

  // Learning history
  await enrol(jamie, ec, { required: true, due: d(10) }); await doLessons(jamie, ec, 2);
  await enrol(jamie, dp, { required: true, due: d(-30), progress: 20 });
  await enrol(jamie, lf, { required: true, due: d(30), status: 'assigned', created: ts(-1) });
  await enrol(jamie, hs, { status: 'completed', progress: 100, created: ts(-160) });
  await enrol(jamie, dpa, { status: 'completed', progress: 100, created: ts(-240) });
  await enrol(jamie, ca, { status: 'completed', progress: 100, created: ts(-710) });
  await cred(jamie, hs, 'Health & Safety Essentials', 'CT-HS-04817', -160, 570);
  await cred(jamie, dpa, 'Data Privacy Awareness', 'CT-DPA-03112', -230, 500);
  await cred(jamie, ca, 'Cybersecurity Awareness', 'CT-CA-01990', -710, 20);
  await cred(jamie, wb, 'Workplace Basics', 'CT-WB-00455', -300, 430);
  const js = await submission(jamie, ec, 'met', 'I noticed the report came in on Thursday for the third time this month. Because of that the team started a day late.');
  await q("insert into reviews(submission_id, reviewer_id, ratings, feedback, outcome) select $1, $2, jsonb_object_agg(id, 'meets'), 'Clear structure and a calm tone. Next time, add one specific example before you suggest a change.', 'met' from rubric_criteria where course_id = $3", [js.id, sam, ec]);

  const [A, B, C, D, E, F, G, H] = L;
  await enrol(A, ec, { status: 'completed', progress: 100 }); await doLessons(A, ec, 6); await pass(A, ec); await submission(A, ec, 'met', 'Opening for the conversation.');
  await q('insert into observations(learner_id, supervisor_id, course_id, ratings, notes) values ($1,$2,$3,$4,$5)', [A, priya, ec, JSON.stringify(['observed', 'observed', 'observed', 'partly']), 'Good follow-up.']);
  await cred(A, ec, 'Effective Communication', 'CT-EC-07001', -20, 700);
  await enrol(B, ec, { required: true, due: d(5) }); await doLessons(B, ec, 6); await pass(B, ec); await submission(B, ec, 'met', 'Opening for the conversation.');
  await enrol(C, dp, { required: true, due: d(-12), progress: 20 });
  await enrol(D, ec, { required: true, due: d(14) }); await doLessons(D, ec, 4); await submission(D, ec, 'submitted', 'I noticed the report came in on Thursday for the third time this month. Because of that the team started a day late. Can you tell me what would help?');
  for (const u of [E, F, H]) { await enrol(u, ec, { required: true, due: d(14) }); await doLessons(u, ec, 3); await submission(u, ec, 'submitted', 'Draft opening of the conversation about late reports.'); }
  await enrol(G, ec, { required: true, due: d(20) }); await doLessons(G, ec, 1);
  // Spread of history for the training overview
  const pool2 = [cf, py, xl, hs];
  for (const [i, u] of L.entries()) for (const [k, c] of pool2.entries()) {
    if ((i + k) % 3 === 0) continue;
    const created = -(20 + ((i * 17 + k * 41) % 150));
    const done = (i + k) % 2 === 0;
    await enrol(u, c, { status: done ? 'completed' : 'in_progress', progress: done ? 100 : 40, created: ts(created), updated: ts(created + 10), completedAt: ts(created + 12) });
  }

  // Notifications
  const n = (u: string, kind: string, title: string, body: string, link: string, read = false, ago = 0) =>
    q('insert into notifications(user_id, kind, title, body, link, read, created_at) values ($1,$2,$3,$4,$5,$6,$7)', [u, kind, title, body, link, read, new Date(Date.now() - ago * 60000).toISOString()]);
  await n(jamie, 'feedback', 'Feedback ready on your practical task', 'Sam Morgan left written feedback', `/courses/${ec}/task`, false, 10);
  await n(jamie, 'reminder', 'Data Privacy and Security is overdue', 'Required course', `/courses/${dp}`, false, 60);
  await n(jamie, 'assigned', 'You have been assigned Leadership Fundamentals', 'Assigned by Ravi Patel', `/courses/${lf}`, false, 120);
  await n(jamie, 'reminder', 'Knowledge check due Thursday', 'Effective Communication', `/courses/${ec}/quiz`, true, 1440);
  await n(jamie, 'credential', 'Your credential is ready to download', 'Health & Safety Essentials', '/credentials', true, 4320);
  await n(admin, 'signup', 'New sign-up waiting for a role', 'Taylor Kim (taylor.kim@credstone.com) signed up. Assign a role to let them in.', '/admin/users?status=pending', false, 5);
  await q("insert into audit_log(actor_id, action, entity, entity_id, detail) values ($1::uuid,'user.signup','user',$1::text,'{}')", [pending]);
  await q("insert into audit_log(actor_id, action, entity, detail) values ($1::uuid,'groups.import','group','{\"rows\":24,\"updated\":22,\"needsReview\":2}')", [admin]);

  for (const [t, m, note] of [['Learner evidence', 36, 'After the course ends'], ['Practice attempts', 6, 'Not shown to supervisors'], ['Audit log', 84, 'Approvals, grades, credentials, evidence views'], ['Rejected sign-ups', 3, 'Removed after review']] as any[])
    await q('insert into retention_policies values ($1,$2,$3)', [t, m, note]);
  for (const [l, b, v] of [['Higher confidence', 'near-term survey', 24], ['Better application', 'on-the-job feedback', 18], ['Faster time to proficiency', 'average', 16]] as any[])
    await q('insert into impact_metrics(label, basis, value_pct) values ($1,$2,$3)', [l, b, v]);

  // Calendar events
  await q(
    `insert into calendar_events(user_id, title, description, event_type, starts_at, ends_at, link, course_id) values
     ($1, 'Focus Study: Workplace Basics Review', 'Self-directed study block for completing Workplace Basics modules', 'study', now() + interval '1 day 2 hours', now() + interval '1 day 3 hours', '/courses/' || $2, $2::uuid),
     ($1, 'Effective Communication Live Practice Workshop', 'Interactive practice cohort workshop with peers and instructors', 'session', now() + interval '3 days 4 hours', now() + interval '3 days 5 hours 30 minutes', '/courses/' || $3, $3::uuid),
     ($1, '1:1 Observational Coaching with Priya Shah', 'Observation checklist follow-up and feedback review', 'observation', now() + interval '5 days 1 hour', now() + interval '5 days 2 hours', '/team', $3::uuid),
     ($1, 'Team A Monthly Learning Sync', 'Monthly cross-team learning alignment and progress sharing', 'session', now() + interval '8 days 5 hours', now() + interval '8 days 6 hours', '/team', null)`,
    [jamie, wb, ec]
  );

  // Conversations & Messages
  const startConvo = async (u1: string, u2: string, subject: string, cat: string, msgs: [string, string, number][]) => {
    const c = await one('insert into conversations(subject, category, updated_at) values ($1,$2, now() - ($3 || \' minutes\')::interval) returning id', [subject, cat, msgs[msgs.length - 1][2]]);
    await q('insert into conversation_participants(conversation_id, user_id, last_read_at) values ($1,$2, now()), ($1,$3, now() - interval \'1 hour\')', [c.id, u1, u2]);
    for (const [sender, body, minsAgo] of msgs) {
      await q('insert into messages(conversation_id, sender_id, body, created_at) values ($1,$2,$3, now() - ($4 || \' minutes\')::interval)', [c.id, sender, body, minsAgo]);
    }
  };

  await startConvo(jamie, sam, 'Feedback on Practical Task - Effective Communication', 'feedback', [
    [sam, 'Hi Jamie, I have reviewed your practical task submission for Effective Communication. Great start on the active listening section! Before I can sign this off, please expand on how you handled the follow-up question.', 180],
    [jamie, 'Thanks Sam! I appreciate the thorough feedback. I will revise that section and submit an updated excerpt by Wednesday.', 120],
    [sam, 'Sounds great. Looking forward to reviewing the update.', 15]
  ]);

  await startConvo(jamie, priya, 'Team A Learning Objectives for Q4', 'supervisor', [
    [priya, 'Hello Jamie, checking in on your onboarding roadmap. You are making steady progress on Workplace Basics. Let us schedule 15 minutes next week to review your observational checklist.', 300],
    [jamie, 'Hi Priya, that works for me! Thursday morning would be ideal if your calendar is open.', 240],
    [priya, 'Perfect, I have added a calendar invite for Thursday at 11:00 AM.', 60]
  ]);

  await startConvo(jamie, ana, 'Question regarding Lesson 2 in Workplace Basics', 'course', [
    [jamie, 'Hi Ana, could you clarify the distinction in Lesson 2 between informal and formal feedback channels in our company policies?', 500],
    [ana, 'Hi Jamie! Glad you asked. Informal channels refer to peer check-ins and direct notes, whereas formal channels require the logged submission workflow in Credstone. Let me know if you would like additional reading materials!', 360]
  ]);

  await startConvo(jamie, admin, 'Welcome to Credstone Learning', 'support', [
    [admin, 'Welcome to the platform! If you encounter any technical issues or need access to specialized training paths, feel free to reply directly here.', 1440]
  ]);

  console.log(`Seeded. Every demo user's password is: ${config.seedPassword}`);
  console.log('admin@credstone.com, jamie.doe@credstone.com, priya.shah@credstone.com (supervisor), ana.lopez@credstone.com (instructor), ravi.patel@credstone.com (training owner), sam.morgan@credstone.com (assessor)');
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
