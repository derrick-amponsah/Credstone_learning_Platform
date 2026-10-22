# Credstone Learning

An enterprise-grade, high-performance Learning Management and Compliance Credentialing Platform built with **Fastify (TypeScript)**, **PostgreSQL**, **Redis**, and **Next.js 14**.

Credstone Learning delivers end-to-end learning workflows—from document-based course authoring and video streaming to rubric-based practical assessments, immutable version governance, and cryptographically verifiable digital credentials.

---

## Key Highlights

- **Sub-55ms p95 Latency**: Engineered for speed with Fastify, native PostgreSQL queries, and an active Redis permission cache (verified by automated load testing).
- **Strict Role-Based Governance**: Six distinct personas with enforced separation of concerns—content instructors cannot approve courses, training owners cannot alter drafts, and enrolment is reserved exclusively for learners.
- **Tri-Factor Competency Verification**: Validates real-world skills through 1) Timed knowledge checks with server-enforced passing scores, 2) Assessor evaluations against multi-item rubrics, and 3) Supervisor on-the-job observational checklists.
- **Learner-Only Catalogue & Enrolment**: Enrolment and catalogue browsing are strictly guarded for learners (`app.role('learner')`). Instructors, training owners, supervisors, and assessors have focused, decluttered operational workspaces with zero audit contamination.
- **Integrated S3 Object Storage (MinIO)**: S3-compatible media and document storage included out-of-the-box via Docker Compose, eliminating reliance on paid AWS cloud storage for local development and self-hosted deployments.
- **Rich Course Studio**: Supports PDF/DOCX source document ingestion, measurable objective validation, hand-crafted quiz generation, and dual-format lessons (direct video upload with HTTP 206 range-based streaming or document reading guides).
- **Dynamic Prerequisite Chaining**: Enforces foundational learning by locking courses, lessons, and quizzes until prerequisite credentials or completions are verified.
- **Practical Assessment & Rubric Engine**: Multi-criterion rubric grading for on-the-job tasks with formative feedback and pass/resubmit workflows.
- **Immutable Course Versioning**: Publishing a course takes an immutable JSONB snapshot of lessons, quiz questions, and rubric criteria to ensure active learners are unaffected by ongoing draft revisions.
- **Verifiable Credentials & Active Renewal**: Digital certificate generation with public validation URLs (`/verify/:code`) and self-service compliance renewal flows.
- **Enterprise Security**: Native Bcrypt (cost 10), HTTP security headers (`DENY`, `nosniff`), rate limiting, dual-path user onboarding, and an immutable audit trail.

---

## Competitive Comparison (Credstone vs. Coursera vs. Udemy)

| Capability / Dimension | **Credstone Learning** | **Coursera (Enterprise)** | **Udemy (Business)** |
| :--- | :--- | :--- | :--- |
| **Primary Focus** | **Regulated workplace competency & compliance** | Academic degrees, theoretical upskilling | Broad skill libraries, hobby/software tutorials |
| **Governance & Role Separation** | **Strict 6-Role RBAC**: Content author cannot approve courses; assessor cannot edit content; admin cannot alter grades | Single Instructor / Admin model. No formal conflict-of-interest segregation | No separation. Anyone with creator access publishes directly |
| **Competency Verification** | **Tri-Factor Model**: Timed quizzes + Assessor rubric grading + Supervisor on-the-job observation | Quizzes + Peer-to-peer grading (unreliable & prone to gaming) | Passive video progress bar + optional multiple-choice quiz |
| **Course Approval Workflow** | **Two-Man Rule (Maker-Checker)**: Instructor drafts &rarr; Training Owner audits checklist & approves before publish | Instructor publishes directly or via university partner review | Individual instructor publishes to open marketplace |
| **Enrolment Governance** | **Learners only**: Non-learners cannot enrol, preventing audit contamination | Anyone can enrol and browse | Open consumer marketplace model |
| **Supervisory Oversight** | **Direct on-the-job observation checklists** & RFC-4180 audit exports | Aggregate usage dashboards only (minutes watched) | Aggregate minutes watched and course start metrics |
| **Data Sovereignty & Privacy** | **Private deployment (Docker / MinIO / PostgreSQL)**. 100% customer-owned data, zero third-party leak | Multi-tenant US public cloud SaaS (vendor lock-in) | Multi-tenant public cloud SaaS (vendor lock-in) |
| **Cost Model** | **Self-hosted / Private Enterprise**: Zero per-seat recurring license tax | **Expensive**: ~$400/user/year recurring enterprise fee | **Recurring**: ~$360/user/year recurring subscription |
| **Audit & Retention Policies** | **Configurable retention engine**: Purges practice data after 6 months; preserves compliance logs for 7 years | Static system logs with limited export retention | Basic activity history |

---

## Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 14 Frontend                   │
│   (App Router, TypeScript, Custom Design Tokens, CSS)   │
│                 Runs on http://localhost:3000          │
└───────────────────────────┬────────────────────────────┘
                            │ API Requests
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Fastify Backend API                   │
│     (TypeScript, JWT, Role Middleware, Security Headers)│
│                 Runs on http://localhost:4000          │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     PostgreSQL 14+        │ │    Redis (Role Cache)     │
│ (28 Relational Tables,    │ │ (60s TTL, In-process      │
│  JSONB Snapshots, UUIDs)  │ │  memory map fallback)     │
└───────────────────────────┘ └───────────────────────────┘
               │
               ▼
┌───────────────────────────┐
│ Local Disk / S3 Storage   │
│ (HTTP 206 Range Streaming)│
└───────────────────────────┘
```

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | Next.js 14.2, React 18, TypeScript | App Router architecture with custom design tokens (`tokens.css`, `screens.css`) |
| **Typography** | `@fontsource/inter`, `@fontsource/newsreader` | Self-hosted webfonts |
| **Backend API** | Fastify 4.28, TypeScript 5, Node.js 20+ | Low-overhead HTTP engine with schema validation |
| **Database** | PostgreSQL 14+, `pg` (node-postgres) | Relational persistence with UUID primary keys and JSONB snapshots |
| **Caching** | Redis / In-Process Memory Map | Role permission cache with automatic memory fallback |
| **Authentication** | `@fastify/jwt`, `@fastify/cookie` | Stateless JWT stored in secure `HttpOnly`, `SameSite: Lax` cookies |
| **Validation** | Zod 3.23 | Strict runtime validation for request bodies, credentials, and parameters |
| **Storage & Media** | MinIO / AWS S3 / Local Disk, `@fastify/multipart` | S3-compatible storage with HTTP 206 partial range streaming for videos |

---

## Role-Based Access Control (RBAC)

The platform enforces six distinct user roles across backend route guards and frontend navigation:

| Role Key | Role Name | Primary Responsibilities |
|---|---|---|
| `instructor` | Content Instructor | Authors courses, uploads source materials, configures video lessons/transcripts, builds quizzes, and defines practical task rubrics. *Cannot approve courses or enrol.* |
| `training_owner` | Training Owner | Conducts quality and compliance reviews in a dedicated Approvals queue, publishes approved courses, and inspects version snapshots. *Cannot author courses or enrol.* |
| `learner` | Learner | **Exclusive enrolment privileges**: Enrolls in courses, streams lessons, completes quizzes, submits practical assignments, and tracks/renews credentials. |
| `assessor` | Assessor | Grades practical assignments against course rubrics and provides structured feedback with Met / Resubmit decisions. *Cannot edit courses or enrol.* |
| `supervisor` | Supervisor | Monitors team compliance and readiness dashboards, logs on-the-job observations, and exports RFC-4180 CSV reports. *Cannot self-enrol.* |
| `admin` | Administrator | Approves self-signups, issues direct credentials, assigns roles, sets data retention policies, and reviews the system audit trail. |

### Two-Path Identity Onboarding

1. **Self Sign-Up with Admin Approval**: Public users register at `/signup`. Accounts are created with `pending` status. Administrators receive a notification, review the request on `/admin/users`, assign roles and teams, and approve access.
2. **Direct Administrator Issuance**: Administrators can create active accounts directly at `/admin/users/issue`, assigning designated roles and generating one-time temporary passwords with forced password resets on initial login (`/change-password`).

---

## Core Platform Features

### 1. Course Authoring Studio (`/studio`)
- **Document Ingestion**: Uploads PDF, PPTX, DOCX, and TXT files as foundational reference materials.
- **Objective Formulation**: Real-time evaluation of measurable criteria to prevent vague learning objectives.
- **Lesson Editor & Video Streaming**: Modal-based lesson configuration with direct video file uploads (.mp4, .webm, .mov) served via HTTP 206 range requests for smooth seeking, alongside synchronized transcripts.
- **Manual Question Builder**: Hand-crafted 4-option multiple choice questions with correct-answer indicators and explanation notes.
- **Practical Task & Rubrics**: Configuration interface for practical scenario prompts and multi-item rubric criteria.

### 2. Course Approvals & Governance (`/approvals`)
- **Dedicated Review Interface**: Exclusively accessible to Training Owners; authoring controls are strictly hidden.
- **Pre-Flight Validation**: Automatic checklist auditing the objective, lesson content, media availability, quiz questions, and rubric.
- **Immutable Version Snapshots**: Approving a course serializes the entire course state into `course_versions` (JSONB) and activates the version for learning.

### 3. Learner Hub & Digital Credentials (`/catalogue`, `/credentials`)
- **Interactive Player**: Custom media player with range streaming, captioned transcripts, and progress persistence.
- **Instant Quiz Feedback**: Real-time scoring against server-side answer keys with formative rationales.
- **Credential Verification**: Automated issuance of unique credential codes (`CRD-XXXXXX`) with public verification at `/verify/:code`.
- **Compliance Renewal**: Self-service renewal workflow allowing learners to re-enroll and re-certify for expiring qualifications.

### 4. Assessor Review Suite (`/review`)
- Centralized queue of pending learner practical submissions.
- Criterion-by-criterion assessment against the course rubric with Met / Resubmit outcome recording.

### 5. Supervisor Team Hub & Analytics (`/team`, `/training`)
- Live team readiness metrics showing Compliant, In-Progress, and Overdue personnel.
- RFC-4180 compliant CSV export for both team-level progress and organization-wide compliance reporting.

### 6. Security & Audit Logging (`/admin/*`)
- Fastify rate limiting with localhost allowlist.
- Enterprise security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
- Immutable audit log tracking authentication events, role changes, course approvals, and credential operations.

---

## Quickstart with Docker & MinIO (Recommended)

The entire platform—including PostgreSQL 16, Redis 7, MinIO S3 Object Storage, Fastify API, and Next.js frontend—can be launched with a single command:

```bash
docker compose up -d --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **MinIO S3 Console**: [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Pass: `minioadmin`)
- **MinIO S3 API Endpoint**: `http://localhost:9000` (Bucket `credstone-uploads` created automatically)

To populate the database with default accounts and sample courses inside Docker:
```bash
docker compose exec api node dist/scripts/seed.js
```

---

## Manual Local Setup

### Prerequisites

- **Node.js**: Version 20.0 or higher
- **PostgreSQL**: Version 14 or higher
- **Redis** *(Optional)*: Version 6 or higher (falls back to an in-process cache map if omitted)
- **MinIO or S3** *(Optional)*: Defaults to local `./uploads` folder if `STORAGE_DRIVER=local`

---

### Installation & Local Setup

#### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/your-org/credstone_learning.git
cd credstone_learning
```

#### 2. Backend Configuration & Database Setup
```bash
cd backend
cp .env.example .env
npm install

# Apply database migrations
npm run migrate

# (Optional) Run schema enhancement migrations
npx tsx src/scripts/ensure_columns.ts
npx tsx src/scripts/course_version_migration.ts

# Populate demo data
npm run seed

# Start API server (runs on http://localhost:4000)
npm run dev
```

#### 3. Frontend Configuration & Setup
```bash
cd ../frontend
cp .env.example .env
npm install

# Start web client (runs on http://localhost:3000)
npm run dev
```

---

### Docker Deployment

To launch the full stack with containerized PostgreSQL and Redis:

```bash
docker compose up -d --build
docker compose exec api node dist/scripts/seed.js
# Open http://localhost:3000 in your browser
```

---

## Seeded Demo Accounts

The database seed provides pre-configured accounts representing each system role.

**Master Password for all demo accounts:** `Credstone#2025!`

| Email | Persona / Role | Key Features to Test |
|---|---|---|
| `ana.lopez@credstone.com` | Content Instructor | Content Studio, video upload, question builder, rubric creation |
| `ravi.patel@credstone.com` | Training Owner | Course Approvals dashboard, pre-flight checklist, version snapshots |
| `jamie.doe@credstone.com` | Learner | Catalogue, video player with transcript, quiz, credential renewal |
| `sam.morgan@credstone.com` | Assessor | Practical review queue, rubric evaluation, formative feedback |
| `priya.shah@credstone.com` | Supervisor | Team readiness tracking, observation logging, CSV export |
| `admin@credstone.com` | Administrator | User role assignments, retention policies, immutable audit trail |
| `taylor.kim@credstone.com` | Pending Sign-up | Demonstrates self-signup awaiting administrator approval |

*Users with multiple roles can switch perspectives via the **View as** option in the avatar menu.*

---

## Performance Benchmarks

Automated load testing against the PostgreSQL backend and cache layer confirms high-throughput responsiveness:

| Endpoint Tested | Metric Measured | Result | SLA Target |
|---|---|---|---|
| `/health` | Server & DB Health | **46 ms** (p95) | < 200 ms |
| Authenticated Route | Redis Permission Cache | **54 ms** (p95) | < 200 ms |
| `/catalogue` | PostgreSQL Course Query | **36 ms** (p95) | < 200 ms |

To run the benchmark suite locally:
```bash
cd backend
npm run benchmark
```

---

## Production Roadmap & Cloud Integration

The platform is designed to run self-contained locally, while offering clean adapter interfaces for enterprise cloud services:

| Component | Current Implementation | Production Target | Integration Details |
|---|---|---|---|
| **Document AI** | Structured template generator | OpenAI / Claude / Gemini API | Integrates RAG document summarization and quiz generation from uploaded files. |
| **Email Delivery** | Console logging stub (`sendMail`) | SendGrid / Resend / AWS SES | Automated dispatch for 7-day/2-day assignment reminders and supervisor notifications. |
| **Object Storage** | Local filesystem (`./uploads`) | AWS S3 / Cloudflare R2 | S3-compatible cloud storage adapter for distributed media hosting. |
| **Video CDN** | HTTP 206 Range Streaming | Cloudflare Stream / Mux | Adaptive bitrate streaming (HLS/DASH) for bandwidth-constrained environments. |
| **Job Queue** | In-process execution | BullMQ + Redis | Background worker processes for heavy document parsing and bulk data exports. |
| **Malware Scan** | Extension & MIME validation | ClamAV / VirusTotal | Automated virus scanning pipeline on incoming file uploads. |

---

## Repository Structure

```
credstone_learning/
├── backend/
│   ├── db/
│   │   └── schema.sql                # Authoritative PostgreSQL schema (35 tables)
│   ├── src/
│   │   ├── routes/                   # Fastify modular route handlers (auth, studio, learner, etc.)
│   │   ├── scripts/                  # Seed, migration, and performance benchmark scripts
│   │   ├── auth.ts                   # JWT & RBAC permission verification
│   │   ├── config.ts                 # Typed environment configuration
│   │   ├── db.ts                     # PostgreSQL pool & query utilities
│   │   └── server.ts                 # Fastify server initialization & security plugins
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js 14 App Router pages (studio, catalogue, review, etc.)
│   │   ├── components/               # Shared Shell layout and custom UI component kit
│   │   ├── lib/                      # API client, session management, and utilities
│   │   └── styles/                   # Design system tokens and layout styles
│   └── package.json
├── docker-compose.yml                # Docker Compose orchestration
├── PRESENTATION_GUIDE.md             # Demonstration script & persona walkthrough
└── PROJECT_DOCUMENTATION.md          # Comprehensive technical documentation & implementation recipes
```

---
