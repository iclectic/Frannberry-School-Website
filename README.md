# Frannberry Schools

A full-stack portal for the Frannberry trust: **Nursery**, **Primary**, and **Secondary**. The stack is a **NestJS** API, a **Next.js** portal, **Prisma**, **PostgreSQL**, **Redis**, and **MinIO**.

The build order is in [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md). Steps 1–4 are done. Steps 5–8 are later.

## Architecture

```
FRANNBERRY_SCHOOL/
├── backend/          # NestJS API (TypeScript)
├── frontend/         # Next.js App Router (TypeScript, Tailwind CSS)
├── scripts/          # Setup automation
└── docker-compose.yml
```

## Tech Stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Backend    | NestJS, Prisma ORM, Passport JWT, Socket.IO  |
| Frontend   | Next.js 14 (App Router), Tailwind CSS        |
| Database   | PostgreSQL 15                                 |
| Cache      | Redis 7                                       |
| Storage    | MinIO (S3-compatible)                         |
| Auth       | JWT + hashed refresh tokens, encrypted TOTP, backup codes |

## Prerequisites

- **Node.js** 18+
- **Docker** & **Docker Compose**
- **npm** 9+

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> && cd FRANNBERRY_SCHOOL

# 2. Run the setup script (starts Docker, installs deps, runs migrations & seed)
chmod +x scripts/setup.sh
./scripts/setup.sh

# 3. Start the backend
cd backend && npm run start:dev

# 4. Start the frontend (in a new terminal)
cd frontend && npm run dev
```

- **Backend API**: http://localhost:4000
- **Swagger Docs**: http://localhost:4000/api/docs
- **Frontend**: http://localhost:3000

## The three schools

| School    | Ages  | Key stages        | Pupils can sign in |
| --------- | ----- | ----------------- | ------------------ |
| Nursery   | 2–4   | EYFS              | No. Pupil record only |
| Primary   | 4–11  | EYFS, KS1, KS2    | Yes. Reception stays here and is still EYFS |
| Secondary | 11–18 | KS3, KS4, KS5     | Yes |

Each school has one headteacher (`HEAD`). That account is not the office `ADMIN` account. A class that pairs a school with a key stage it does not teach is rejected.

David Smith (`david.smith@example.com`) is the parent of Poppy (Nursery, no login), Isla (Primary), and Oliver (Secondary).

## Demo Credentials

Heads, office admins, and teachers must confirm an authenticator before the rest of the portal opens. That first session can only set up MFA or sign out, and those roles cannot turn MFA off. Parents, pupils, and other staff may turn it on if they want to. Five failed sign-ins lock an account for 15 minutes. A successful password reset clears the lock.

| Role    | Email                              | Password    |
| ------- | ---------------------------------- | ----------- |
| Admin   | admin@frannberry.school            | Admin123!   |
| Nursery head | helen.green@frannberry.school | Head123!    |
| Primary head | priya.shah@frannberry.school   | Head123!    |
| Secondary head | samuel.adeyemi@frannberry.school | Head123! |
| Teacher | j.williams@frannberry.school       | Teacher123! |
| Pupil   | oliver.smith@frannberry.school     | Student123! |
| Parent  | david.smith@example.com            | Parent123!  |
| Staff   | r.okonkwo@frannberry.school        | Staff123!   |

## Backend Modules

- **Auth** — Login, hashed refresh tokens, encrypted TOTP, eight single-use backup codes, sign-in lockout, password reset in its own table
- **School** — `GET /api/v1/school/phases` (public) and `GET /api/v1/school/me`
- **Users** — Profile retrieval, role-specific data
- **Admin** — User CRUD, class placement by school and key stage, terms, grading scales, invite codes
- **Assignments** — Create, update, publish, submit, grade
- **Results** — Record and view academic results per student/class/term
- **Messaging** — Contact rules, thread purpose/school/child, unread counts, and the London weekly allowance (`GET /api/v1/messaging/contacts`, `POST /api/v1/messaging/conversations`, `GET /api/v1/messaging/conversations/:id/allowance`)
- **Announcements** — Scoped announcements (school, class, role-based)
- **CMS** — Blog posts and gallery image management
- **File Storage** — Upload to MinIO with Prisma attachment records
- **Audit** — Tamper-evident audit trail for sensitive actions

## Frontend Pages

### Public Pages
- **/** — Home page naming Nursery, Primary, and Secondary
- **/about** — Mission, values, leadership, facilities
- **/admissions** — Application process and key dates
- **/blog** — News and blog posts (fetched from CMS API)
- **/gallery** — Photo gallery (fetched from CMS API)
- **/contact** — Contact information and enquiry form
- **/login** — Authentication with MFA support

### Portal Pages (authenticated)
- **/portal** — Role-specific dashboard with greeting, stats, announcements
- **/portal/announcements** — View all announcements
- **/portal/messages** — Real-time messaging with conversation list
- **/portal/assignments** — View/manage assignments (Teacher & Student)
- **/portal/results** — Academic results table
- **/portal/users** — User management with role filtering (Admin only)
- **/portal/classes** — Class overview with subjects and students (Admin only)

## Database Schema

Managed with Prisma. Key models:

- `User`, `TeacherProfile`, `StudentProfile`, `ParentProfile`, `StaffProfile`
- `AcademicSession`, `Term`, `Class`, `Subject`
- `Assignment`, `Submission`, `Result`, `GradingScale`
- `Announcement`, `Conversation`, `Message`
- `BlogPost`, `GalleryImage`, `FileAttachment`
- `AuditLog`, `InviteCode`

Run `npx prisma studio` from the `backend/` directory to explore the database visually.

## Environment Variables

Copy the example and adjust as needed:

```bash
cp backend/.env.example backend/.env
```

Key variables:

| Variable            | Default                                     |
| ------------------- | ------------------------------------------- |
| DATABASE_URL        | postgresql://frannberry:frannberry@localhost:5432/frannberry |
| JWT_SECRET          | super-secret-jwt-key-change-in-production   |
| MFA_ENCRYPTION_KEY  | change-me-mfa-encryption-key                |
| REDIS_URL           | redis://localhost:6379                       |
| S3_ENDPOINT         | http://localhost:9000                         |
| S3_ACCESS_KEY       | frannberry_minio                              |
| S3_SECRET_KEY       | frannberry_minio_secret                       |

## Scripts

| Command                         | Description                        |
| ------------------------------- | ---------------------------------- |
| `./scripts/setup.sh`            | Full environment setup             |
| `cd backend && npm run start:dev` | Start backend in dev mode        |
| `cd frontend && npm run dev`    | Start frontend in dev mode         |
| `cd backend && npx prisma studio` | Open Prisma database browser     |
| `cd backend && npx prisma db seed` | Re-seed the database            |
| `cd backend && npm test` | Phase, contact, allowance, and account-security tests |

## Licence

Private — Frannberry School.
