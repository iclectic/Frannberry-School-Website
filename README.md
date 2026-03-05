# Frannberry School Portal

A full-stack school management application with a **NestJS** backend, **Next.js** frontend, **PostgreSQL** database, **Redis** caching, and **MinIO** file storage.

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
| Auth       | JWT + Refresh Tokens, MFA (TOTP)             |

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

## Demo Credentials

| Role    | Email                          | Password     |
| ------- | ------------------------------ | ------------ |
| Admin   | admin@frannberry.school        | Admin123!    |
| Teacher | t.williams@frannberry.school   | Teacher123!  |
| Student | j.smith@frannberry.school      | Student123!  |
| Parent  | p.smith@frannberry.school      | Parent123!   |
| Staff   | s.jones@frannberry.school      | Staff123!    |

## Backend Modules

- **Auth** — Login, JWT access/refresh tokens, MFA (TOTP), logout
- **Users** — Profile retrieval, role-specific data
- **Admin** — User CRUD, class/subject management, terms, grading scales, invite codes
- **Assignments** — Create, update, publish, submit, grade
- **Results** — Record and view academic results per student/class/term
- **Messaging** — REST + WebSocket (Socket.IO) real-time conversations
- **Announcements** — Scoped announcements (school, class, role-based)
- **CMS** — Blog posts and gallery image management
- **File Storage** — Upload to MinIO with Prisma attachment records
- **Audit** — Tamper-evident audit trail for sensitive actions

## Frontend Pages

### Public Pages
- **/** — Home page with hero, stats, features
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

## Licence

Private — Frannberry School.
