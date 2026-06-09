# FBA X Platform — Setup Guide

## Prerequisites

- **Node.js 20+** — [Download](https://nodejs.org/)
- **PostgreSQL** — local or hosted (e.g. Supabase, Neon, Railway)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Generate with: `openssl rand -hex 32`
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` for local dev

### 3. Set Up Database

Push the Prisma schema to your database:

```bash
npm run db:push
```

Or run migrations:

```bash
npm run db:migrate
```

Generate the Prisma client:

```bash
npm run db:generate
```

### 4. Create the First Admin User

After the database is set up, register your first user via the app UI (`/login`), then manually set them as admin in the database:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'your@email.com';
```

Or use Prisma Studio:

```bash
npm run db:studio
```

### 5. Start the Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Tech Stack

| Technology   | Version  | Purpose                     |
|-------------|----------|-----------------------------|
| Next.js     | ^15.3    | React framework (App Router) |
| React       | ^19.0    | UI library                  |
| Tailwind CSS| ^3.4     | Styling                     |
| Better Auth | ^1.2     | Authentication              |
| Prisma      | ^6.0     | ORM                         |
| PostgreSQL  | any      | Database                    |

---

## Project Structure

```
app/
├── (auth)/login/        — Login page
├── (app)/               — Authenticated pages
│   ├── dashboard/       — User dashboard
│   ├── attendance/      — Submit OT/day-off/offset requests
│   ├── my-requests/     — View your request history
│   ├── my-strikes/      — View your strike record
│   ├── my-creators/     — Creator management
│   ├── resource-portal/ — Learning portal
│   ├── schedule/        — Operations/schedule
│   ├── admin/           — Admin-only pages
│   │   ├── strikes/     — Strike dashboard, database, profiles, appeals
│   │   ├── attendance/  — Attendance admin, payroll summary
│   │   ├── employees/   — Employee database
│   │   └── danger-zone/ — Destructive DB actions
│   └── training/        — All training modules
├── api/                 — API routes
│   ├── auth/[...all]/   — Better Auth handler
│   ├── strikes/         — Strike CRUD
│   ├── appeals/         — Appeal management
│   ├── attendance/      — Attendance request management
│   ├── employees/       — Employee CRUD
│   ├── creators/        — Creator management
│   └── progress/        — Learning progress tracking
components/
├── layout/
│   ├── Sidebar.tsx      — Navigation sidebar
│   └── TrainingPage.tsx — Auto-tracks page completion
└── ui/
    ├── Badge.tsx        — Status badges
    └── Modal.tsx        — Reusable modal
lib/
├── auth.ts              — Better Auth config
├── auth-client.ts       — Client-side auth hooks
├── prisma.ts            — Prisma client singleton
└── utils.ts             — Utilities, constants, types
prisma/
└── schema.prisma        — Full database schema
```

---

## User Roles

| Role          | Access                                          |
|--------------|--------------------------------------------------|
| `admin`      | Full access — all admin tools, all training     |
| `page-runner`| Core + page runner training + attendance        |
| `engager`    | Core + engager training + attendance            |
| `flagtester` | Core + flagtester training + attendance         |

To set a user's role, update the `role` field in the `User` table.

---

## Notes

- Better Auth uses email/password authentication
- All strike, attendance, and employee data is stored in PostgreSQL
- Learning progress is tracked per-user per-page automatically when training pages are visited
- The Danger Zone page requires admin role and irreversibly deletes database records
