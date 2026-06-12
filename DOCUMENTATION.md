# FBA Marketing Portal — Platform Documentation

_Internal reference doc. Snapshot of what currently exists in the app, for planning new work (see `bugs.md` for the upcoming feature list). Not part of the website — repo file only._

---

## 1. Overview

Internal operations portal for Fatbear Agency. Used by:
- **Employees / "page runners"** — daily ops, schedules, attendance, creator management, training
- **Department heads / managers** — team oversight within their department
- **Admins / executives** — full platform access (HR, strikes, LMS, payroll, destructive tools)

## 2. Tech Stack

| Technology   | Version | Purpose                       |
|--------------|---------|--------------------------------|
| Next.js      | ^15.x   | App Router, server components |
| React        | ^19.x   | UI                             |
| Tailwind CSS | ^3.4    | Styling                        |
| Better Auth  | ^1.2    | Auth (email/password sessions) |
| Prisma       | ^6.0    | ORM                            |
| PostgreSQL   | (Neon)  | Database                       |

See `SETUP.md` for local setup instructions.

---

## 3. Authentication & Roles

All users authenticate via email/password (`signIn.email()`). Sessions last 7 days, refreshed every 24h. Every page under `app/(app)/` is gated by `app/(app)/layout.tsx`:
- No session → redirect `/login`
- `profileComplete === false` → redirect `/setup`

### New user (invited employee)
1. Admin creates an **Employee** record (`POST /api/employees`) — HR record with job-title `role`, `department`, `access` flags (incl. `superAdmin`), schedule, etc.
2. Admin generates an invite (`POST /api/invite`) — 7-day `InviteToken` tied to the employee's email.
3. New hire opens `/accept-invite?token=...`, sets a password → calls Better Auth's `/api/auth/sign-up/email` directly, creating the `User` record. `User.role` defaults to `"employee"`, `department` defaults to `null` (both `input: false`, can't be set by the client).
4. Invite marked used → redirect `/setup` → `SetupForm` collects display name + Discord username, sets `profileComplete: true` → redirect `/dashboard`.

### Existing employees
- `/login` → `signIn.email()` → `/dashboard`. `User.role` (e.g. `"employee"`, or a job-title role) drives Sidebar nav and `lib/permissions.ts` checks (`isExecutive`, `isDepartmentManager`, `canViewDepartment`, etc.).

### Admins
- Same `/login` flow — **no separate admin login**.
- "Admin" = `User.role === "admin"`. Set when `POST /api/employees` is called with `access.superAdmin: true` — syncs `prisma.user.updateMany({ where: { email }, data: { role: "admin" } })` **if a linked User account already exists**.
- `isAdmin()` also treats anyone with `role` in `EXECUTIVE_ROLES` (currently `["Marketing Executive"]`) as admin-equivalent.

### ⚠️ Known gap
The only sync from `Employee` → `User` writes `role` as `"admin"` or `"employee"` only. There's no path that copies `Employee.role` (e.g. `"Department Head"`, `"Account Manager"`) or `Employee.department` onto the `User` record — so `isDepartmentManager` / `isExecutive` / `canViewDepartment` checks against `session.user.role` / `session.user.department` won't reflect those job titles unless set directly in the DB.

---

## 4. Data Model (Prisma)

| Domain | Models |
|---|---|
| **Auth** (Better Auth) | `User`, `Session`, `Account`, `Verification` |
| **HR** | `Employee`, `InviteToken` |
| **Strikes** | `Strike`, `Appeal` |
| **Attendance** | `AttendanceRequest` |
| **Creator Management** | `Creator`, `Highlight` |
| **LMS — SOPs** | `SOP`, `SOPAcknowledgement`, `SOPView`, `Assessment`, `Question`, `AssessmentAttempt` |
| **LMS — Training pages** | `ModuleAcknowledgement` |
| **Notifications / Audit** | `Notification`, `AuditLog` |
| **Legacy LMS** (superseded by `ModuleAcknowledgement`, kept for back-compat) | `LearningProgress`, `Quiz`, `QuizResult`, `PracticalMilestone`, `Readiness` |

Notable fields:
- `Creator.signedPlatforms: String[]` — tags for marketing platforms signed (X, Instagram, Reddit)
- `Creator.assignedPageRunners: String[]` — which employees are assigned
- `SOP.blocks: Json` — Notion-style structured content (null = legacy text-only SOP)
- `SOP.tier` — Introductory / Intermediate / Advanced / Upskill
- `AttendanceRequest.type` — OT / WeekendOT / DayOff(Leave) / Offset

---

## 5. Employee-Facing Pages

### Dashboard (`/dashboard`)
- Personalized landing page. Employees see: active strikes & pending requests stats, quick links (Resource Portal, Strike Record, Submit Request), recent learning activity.
- Admins see a different view (see §6).

### My Schedule (`/schedule`)
- Hub linking to: Team Schedule (`/training/team-schedule`), OT request, Leave request, and My Requests (OT history).

### My Requests (`/my-requests`)
- Personal attendance request history (email-based lookup).
- Shows OT usage this week (max 6h, resets Sunday) and Offset usage this month (max 2), with remaining balances.
- Filterable table of all requests: type (OT / Weekend OT / Leave/DayOff / Offset), date, hours, reason, status (Pending/Approved/Rejected), submitted date.
- **No generic "Request" system yet** — only attendance requests exist (see §7).

### My Strikes (`/my-strikes`)
- Personal strike record (email-based lookup).
- Active strikes this quarter (count, level, type, date, reason, corrective action) + full history table across quarters.
- Embedded appeal form (strike code, explanation, optional evidence URL). UI references a 5-day appeal window.

### Attendance / Submit Request (`/attendance`)
Tabbed form for 4 request types, all writing to `AttendanceRequest`:
1. **Overtime (OT)** — date, hours (max 6/week), reason, expected tasks, optional creator codes; live balance check.
2. **Weekend OT** — date, hours (0.5–12), reason, deliverables; submission deadline Fri 4PM CST, approved window 7AM–7PM CST.
3. **Leave** — type (PTO/Sick/Emergency/Other), start/end dates, reason, coverage notes, auto-fetched dept manager; min. 1-week notice.
4. **Offset** — missed date, makeup date (within 7 days), reason; max 2/month, live balance check.

### Notifications (`/notifications`)
- Notification center for: `NewSOP`, `SOPUpdated`, `AssessmentRequired`, `CertificationEarned`, `StrikeIssued`.
- Mark individual/all as read; links to related content.

### Profile (`/profile`)
- Self-service: edit display name + Discord username.
- View-only: email, role, department, start date, status, account created date, contract PDF link.
- Personal weekly schedule (shift codes per day) and tool-access grid (sheets, dropbox, infloww, xbots, linkme, beacons, website, notion, multilogin) if set by admin.

### Resource Portal / LMS (`/resource-portal`, `/resource-portal/[id]`)
- Tiered curriculum: Introductory → Intermediate → Advanced → Upskill, unlocked sequentially at 100% completion of prior tier.
- Per-tier progress bars, certification badges at 100%.
- Content filtered by employee's role/department via `canViewSOP`. Admins/executives see all tiers unlocked.
- SOP detail page renders Notion-style `blocks`, tracks acknowledgement (and re-acknowledgement on version bumps).

### My Creators (`/my-creators`)
- Creator roster management. Fields per creator:
  - Identity: name, code, status (Active/Paused/etc.), priority (Low/Medium/High), `needsMedia`, `needsReview`
  - **Signed Platforms** tags (X / Instagram / Reddit) — what marketing efforts they've signed with
  - Assigned page runners
  - Niche, Assets, Accounts (platform/account type/username/URL — no follower counts), Strategy (caption tone, do's/don'ts, inspirations)
  - Highlights feed (top posts: platform, link, likes/views/comments/reposts/bookmarks, notes)
- Non-admins ("page runners") see a read/contribute view scoped to their assignments; admins get full edit access.

### Training (`/training/...`)
- `/training/payroll` — payroll schedule (5th & 20th), PayPal payout, OT pay structure, discrepancy process.
- `/training/team-schedule` — full team's weekly shift grid (from Employee.schedule), shift-code legend, coverage process notes.
- `/training/[...slug]` — catch-all, redirects everything else to `/resource-portal` (legacy training URLs).

---

## 6. Admin-Facing Pages

All under `/admin/...`, gated to `role === "admin"` (department heads get scoped access where noted).

### Admin Dashboard (`/admin`)
- Hub linking to Strikes, Attendance, Employee DB, LMS, Danger Zone. Shows org-wide stats (active strikes, pending appeals/requests, active employees) and an audit log feed.

### Employees (`/admin/employees`)
- Full employee CRUD: search/filter by name, email, department, role, status.
- Add/Edit modal — **Info** (name, email, role, dept, start date, status, Discord, notes), **Schedule** (per-day shift code), **Access** (Super Admin toggle + tool-access grid).
- New employee → offers an invite link (7-day expiry).
- Saving syncs `User.role` to `"admin"`/`"employee"` based on `access.superAdmin`.

### Attendance Admin (`/admin/attendance`)
- Approve/reject pending requests (review modal requires reviewer name; notes required for rejection).
- Stats: OT/Weekend OT hours approved, days off approved, offsets approved.

### Attendance Summary / Payroll (`/admin/attendance/summary`)
- Pay-period view (1st–15th / 16th–end), filterable by year/month/period.
- Stats: total OT hours, employees with OT, request count, avg hours/employee.
- Per-employee breakdown + full request list — for payroll/accounting export.

### Strikes
- **Dashboard** (`/admin/strikes`) — quarter stats (Active/Pending/Appealed/Resolved, Compliance/Attendance breakdowns), termination-risk list, recent submissions, quick links.
- **Database** (`/admin/strikes/database`) — search/filter/edit/delete all strikes (type, level, status, incident date, reason, corrective action, notes).
- **Profiles** (`/admin/strikes/profiles`) — per-employee strike history & risk coloring (First Warning → On Strike → Final Warning → For Evaluation → Terminated).
- **Submit** (`/admin/strikes/submit`) — new strike form (employee info, type/level, incident details, optional SOP reference for Compliance strikes, require-acknowledgement toggle).
- **Appeals** (`/admin/strikes/appeals`) — review pending appeals, approve (strike → Resolved) or reject (strike → Active), with reviewer name + notes.

### LMS Admin (`/admin/lms`)
- **SOPs tab** — list/filter by tier & department; edit, publish/unpublish, duplicate, bump version (forces re-acknowledgement), archive.
- **Progress tab** — every employee's SOP completion (done/total + %).
- **Assessments tab** — placeholder ("coming soon").
- Department heads: scoped to their own department's SOPs only.

### SOP Builder (`/admin/lms/sop-builder/[id]`)
- Metadata form: title, type (SOP/Course), category, department (locked for dept heads), tier, status (Draft/Published), estimated minutes, role-access multi-select, required-acknowledgement toggle.
- Notion-style **block editor** (paragraph, heading, image, video, callout, checklist, quiz, etc.) with **Preview** mode.
- **AI Generation** — modal that drafts SOP blocks from a prompt via Claude API.

### Danger Zone (`/admin/danger-zone`)
- Destructive, double-confirmed DB wipes via `DELETE /api/admin/clear?action=...`: clear strikes+appeals, appeals only, attendance, all of the above, or employees only.

---

## 7. Request System Status

**Implemented today:**
- Attendance requests only — OT, Weekend OT, Leave/DayOff, Offset (`AttendanceRequest` model), with submission, balance checks, and admin approve/reject.

**Planned, not yet built** (per `bugs.md`):
- Generic "Request" system (COE, Payslip, and future types — leave/OT/schedule/HR/payroll/equipment requests) with admin status pipeline (Pending/Processing/Completed/Rejected).
- Taskboard / daily time tracking with admin efficiency dashboard.
- SOP deadline + per-employee exemption system, with admin visibility (acknowledged / not yet / overdue / exempted) and employee search.

These will likely need either a new generic `Request` model (polymorphic by `type`) or extending the existing `AttendanceRequest` pattern — current attendance implementation is the closest existing reference for the new request types.

---

## 8. Key API Routes

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/auth/[...all]` | * | Better Auth handler (sign-in/up, session) |
| `/api/invite` | GET/POST/PATCH | Validate, create, consume invite tokens |
| `/api/profile` | GET/PATCH | Current user's profile (User + Employee) |
| `/api/employees` | GET/POST/DELETE | Employee CRUD, syncs `User.role` |
| `/api/attendance` | GET/POST/PATCH | Submit/list/approve attendance requests |
| `/api/strikes` | GET/POST/PATCH/DELETE | Strike CRUD |
| `/api/appeals` | GET/POST/PATCH | Submit/review appeals |
| `/api/creators` | GET/POST/... | Creator CRUD |
| `/api/sops` | GET/POST/PATCH/DELETE | SOP CRUD, versioning, duplication |
| `/api/sops/generate` | POST | AI-generate SOP draft (Claude API) |
| `/api/acknowledgements`, `/api/sop-acknowledgements` | GET/POST | Track SOP/module acknowledgements |
| `/api/progress` | GET/POST | Legacy learning progress tracking |
| `/api/notifications` | GET/PATCH | Fetch / mark-read notifications |
| `/api/admin/clear` | DELETE | Destructive DB wipes (Danger Zone) |

---

## 9. Other Notes

- Sidebar (`components/layout/Sidebar.tsx`) nav adapts to `role`: "Admin" section (Admin Dashboard, LMS Dashboard) only shown when `role === "admin"`. Notifications/Profile/Logout are pinned to the bottom of the sidebar.
- Legacy LMS models (`LearningProgress`, `Quiz`, `QuizResult`, `PracticalMilestone`, `Readiness`) are kept for back-compat but superseded by `ModuleAcknowledgement` + `SOPAcknowledgement`/`SOPView`.
- `SOPView` exists specifically to track "viewed" distinct from "acknowledged" without disturbing the acknowledgement model's semantics.
