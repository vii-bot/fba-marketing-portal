// Seeds the Internal Documentation CMS (DocPage) with an initial set of
// admin/developer-facing pages, per bugs.md Phase 13's suggested list.
// Safe to re-run — pages are upserted by slug.
//
// Usage: npm run seed-docs
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SEED_AUTHOR = "system@fatbearagency.com";
const SEED_AUTHOR_NAME = "System";

let blockCounter = 0;
function blockId() {
  return `block-seed-${Date.now()}-${blockCounter++}`;
}

function heading(text) {
  return { id: blockId(), type: "heading", content: text };
}
function paragraph(text) {
  return { id: blockId(), type: "paragraph", content: text };
}
function checklist(items) {
  return { id: blockId(), type: "checklist", content: items };
}
function callout(style, text) {
  return { id: blockId(), type: "callout", content: { style, text } };
}

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PAGES = [
  {
    title: "App Overview",
    category: "App Overview",
    tags: ["overview", "getting-started"],
    blocks: [
      heading("What is the FBA Marketing Portal?"),
      paragraph(
        "The FBA Marketing Portal is Fatbear Agency's internal operations platform. It combines an employee dashboard, a Learning Management System (LMS) / Resource Portal, an Admin Dashboard for HR and operations workflows, and a Creator Reports system for tracking the social media accounts (\"creators\") the agency manages."
      ),
      heading("Departments"),
      paragraph(
        "The platform recognizes the following departments (lib/utils.ts → DEPARTMENTS): Executives, Account Managers, Talent Acquisition, Editing Team, Instagram, Reddit, X. New employees are assigned to one of the ACTIVE_DEPARTMENTS — Instagram, X, Reddit — while the other departments remain for historical/legacy employee records."
      ),
      heading("Major Modules"),
      checklist([
        "Dashboard (/dashboard) — personalized landing page with quick links and recent activity",
        "My Schedule (/schedule) — weekly shift schedule, shift times shown in the viewer's local timezone",
        "My Taskboard (/tasks) — daily task/time logging",
        "My Creators (/my-creators) — list of social accounts the employee manages",
        "Resource Portal (/resource-portal) — employee-facing SOPs, courses, and acknowledgments (LMS)",
        "My Requests (/requests) — submit COE and other employee requests, view attendance/leave requests",
        "Admin Dashboard (/admin) — Employee Database, LMS management, Employee Requests, Taskboard admin, Contractor Change Requests, Creator Reports, Strikes, Attendance, Internal Documentation",
      ]),
      heading("Technical Stack"),
      paragraph(
        "Built with Next.js 15 (App Router, Server + Client Components), Prisma ORM against a PostgreSQL database hosted on Neon, and Better Auth for authentication/session management. Styling uses Tailwind CSS with a shared dark UI design system (cards, buttons, and form inputs defined as reusable classes)."
      ),
      callout(
        "info",
        "This Internal Documentation area is for admins/developers — it is separate from the employee-facing Resource Portal/LMS. See \"Resource Portal Overview\" and \"SOP CMS Overview\" for that system."
      ),
    ],
  },
  {
    title: "Login & Invite Flow",
    category: "Authentication & Access",
    tags: ["auth", "invite", "onboarding"],
    blocks: [
      heading("Authentication"),
      paragraph(
        "Authentication is handled by Better Auth (lib/auth.ts) using email/password credentials. Sessions are stored server-side (Session model) and read via auth.api.getSession({ headers }) in API routes and server components."
      ),
      heading("New Hire Setup Flow"),
      checklist([
        "An admin creates an Employee record in the Employee Database (/admin/employees) with the new hire's name, email, role, and department.",
        "The admin generates an invite for that email — an InviteToken record is created with a unique token and expiry.",
        "The invite link (/accept-invite?token=...) is sent to the new hire.",
        "The new hire opens the link, sets a password, and a User account is created/linked by matching email to the Employee record.",
        "After accepting, the new hire is guided through Setup (SetupForm) to confirm/complete their profile.",
        "On future visits, the user logs in at /login and is routed based on their role (admin → /admin or /dashboard, employee → /dashboard).",
      ]),
      heading("Login Flow"),
      paragraph(
        "/login posts credentials to Better Auth, which validates against the User/Account tables and issues a session cookie. Sidebar and page-level checks read session.user.role and session.user.department to decide what navigation and data the signed-in user can see."
      ),
      callout(
        "warning",
        "User (login) and Employee (HR record) are separate models linked by email. If an employee's email changes in the Employee Database, their User login record's email must also be updated — otherwise login and the Employee profile fall out of sync. See the Known Issues page."
      ),
    ],
  },
  {
    title: "Role & Permission Structure",
    category: "Authentication & Access",
    tags: ["roles", "permissions", "access-control"],
    blocks: [
      heading("Role Categories"),
      paragraph(
        "lib/utils.ts defines two role groupings used throughout the permission layer:"
      ),
      checklist([
        "EXECUTIVE_ROLES = [\"Marketing Executive\"] — platform-wide (cross-department) visibility",
        "MANAGER_ROLES = [\"Department Head\", \"Department Manager\", \"Account Manager\"] — manage their own department",
        "role === \"admin\" — the Better Auth \"admin\" role, treated as full access alongside Executives",
        "Other roles (regular employees, \"TA/Payroll Manager\", etc.) — scoped to their own records/department only",
      ]),
      heading("Core Permission Helpers (lib/permissions.ts)"),
      paragraph(
        "All access checks should go through these helpers rather than inlining role-string comparisons in pages/API routes:"
      ),
      checklist([
        "isExecutive(user) / isDepartmentManager(user) / isAdmin(user) — base role classification",
        "canViewDepartment / canManageDepartment — department-scoped access",
        "canViewResource / canEditResource — Resource Portal item visibility & edit rights",
        "canViewEmployee / canViewEmployeeDatabase — Employee Database access",
        "canManageLMS / canManageSOP / canViewSOP — LMS & SOP CMS access",
        "canSubmitStrike, canApproveOT, canApproveLeave — Attendance/Strikes workflows",
        "canManageContractors — Contractor Change Requests (Admin, Dept managers, TA/Payroll Manager)",
        "canManageCreatorReports — Creator Reports dashboard",
        "canAccessInternalDocs / canManageInternalDocs — Internal Documentation CMS",
      ]),
      heading("Department Scoping Pattern"),
      paragraph(
        "Most admin pages follow the same pattern: Admins and Executives (isAdmin) see data across all departments; Department Heads/Managers/Account Managers (isDepartmentManager) see only records where record.department === user.department; regular employees see only their own records (matched by email)."
      ),
      callout(
        "info",
        "Internal Documentation visibility uses an additional per-page DocPage.visibility[] array — Department Heads/Managers can open /admin/internal-docs, but only see Published pages whose visibility list includes their role. Admins/Executives always see everything."
      ),
    ],
  },
  {
    title: "Resource Portal Overview",
    category: "Feature Documentation",
    featureArea: "Resource Portal / LMS",
    tags: ["lms", "resource-portal", "training"],
    blocks: [
      heading("Purpose"),
      paragraph(
        "The Resource Portal (/resource-portal) is the employee-facing training library: SOPs and Courses organized by department and LMS tier, with progress tracking and acknowledgments."
      ),
      heading("LMS Tiers"),
      paragraph(
        "Courses/SOPs are grouped into LMS_TIERS: Introductory → Intermediate → Advanced → Upskill. TIER_PREREQUISITES requires each tier to be 100% complete before the next unlocks (Intermediate needs Introductory, Advanced needs Intermediate)."
      ),
      heading("Visibility Rules (canViewSOP)"),
      checklist([
        "Executives see all SOPs/courses regardless of status.",
        "Everyone else only sees content with status \"Published\".",
        "The SOP's department must be \"All Departments\" or match the employee's department.",
        "If the SOP specifies roles[], the employee's role must be included.",
      ]),
      heading("Progress & Acknowledgment Tracking"),
      paragraph(
        "Several models track an employee's interaction with content: SOPView (viewed), SOPAcknowledgement / ModuleAcknowledgement (acknowledged/signed off), LearningProgress (overall tier progress), Quiz/QuizResult and Assessment/Question/AssessmentAttempt (graded quizzes), and PracticalMilestone/Readiness for hands-on milestones."
      ),
      callout(
        "info",
        "SOPExemption lets admins exempt specific employees from specific SOP deadlines — used by the compliance view in the admin LMS dashboard."
      ),
    ],
  },
  {
    title: "SOP CMS Overview",
    category: "Feature Documentation",
    featureArea: "SOP CMS",
    tags: ["lms", "sop-builder", "content"],
    blocks: [
      heading("Purpose"),
      paragraph(
        "The SOP Builder (/admin/lms/sop-builder) is the admin authoring tool for SOP and Course content (the SOP model). It uses a Notion-style block editor so content is structured data, not freeform HTML."
      ),
      heading("Block Content System (lib/sop-blocks.ts)"),
      paragraph(
        "SOP.blocks (and now DocPage.blocks) store an array of SOPBlock objects: { id, type, content }. Supported block types (BLOCK_TYPES):"
      ),
      checklist([
        "heading — section title (string)",
        "paragraph — plain text content (string)",
        "checklist — step-by-step list (string[])",
        "image — { url, caption }",
        "video — { title, url, description, thumbnail }",
        "file — { name, url, description } downloadable attachment",
        "callout — { style: info|warning|success, text }",
        "divider — visual section break",
        "embed — { url, label } external link/embed",
        "quiz — { question, options, answer }[] acknowledgement quiz",
      ]),
      heading("Shared Components"),
      paragraph(
        "components/lms/sop-builder/BlockEditor.tsx (authoring UI — add/reorder/edit/delete blocks) and BlockRenderer.tsx (read-only/interactive display) are fully generic — they take blocks: SOPBlock[] and have no SOP-specific logic. The Internal Documentation CMS (DocPage.blocks) reuses both components unmodified."
      ),
      heading("Permissions"),
      paragraph(
        "canManageLMS(user) gates the LMS admin dashboard; canManageSOP(user, sopDepartment) gates editing a specific SOP (Admin/Executive can edit any, Department Heads/Managers/Account Managers only their own department's SOPs, or \"All Departments\" SOPs)."
      ),
    ],
  },
  {
    title: "Employee Database Overview",
    category: "Feature Documentation",
    featureArea: "Employee Database",
    tags: ["employees", "hr", "schedule"],
    blocks: [
      heading("Purpose"),
      paragraph(
        "The Employee Database (/admin/employees) is the central HR record for staff: name, email, role, department, hire date, and weekly shift schedule."
      ),
      heading("Access"),
      paragraph(
        "canViewEmployeeDatabase(user) = isAdmin(user) || isDepartmentManager(user). Admins/Executives can browse all departments; Department Heads/Managers/Account Managers can browse only their own department's employees. Regular employees have no access to this page (they see their own info via /profile and /schedule)."
      ),
      heading("Shift Schedule"),
      paragraph(
        "Employee.schedule is a JSON map of day → shift code, using the codes defined in SCHEDULE_SHIFTS (lib/utils.ts): 12AM, 10PM, 9PM, 4PM, or OFF. SHIFT_START_UTC_HOUR maps each code to its UTC start hour (codes are defined in US Central Standard Time); the My Schedule page (ScheduleTable component) converts these to the viewer's local time for display."
      ),
      callout(
        "warning",
        "Email is the join key between Employee and User (login) records. Editing an employee's email here does not retroactively update an existing User login — coordinate both when an employee's email changes (see Known Issues)."
      ),
    ],
  },
  {
    title: "Contractor Change Request Flow",
    category: "Workflow Documentation",
    featureArea: "Contractor Change Requests",
    tags: ["contractors", "workflow", "approvals"],
    blocks: [
      heading("Purpose"),
      paragraph(
        "The ContractorChangeRequest model and /admin/contractor-requests dashboard let authorized staff submit and track requested changes to a contractor's engagement — e.g. rate changes, schedule changes, or termination — with conditional form sections depending on the change type and an effective/compensation date."
      ),
      heading("Who Can Submit / Manage"),
      paragraph(
        "canManageContractors(user) = isAdmin(user) || isDepartmentManager(user) || user.role === \"TA/Payroll Manager\". This covers Admin, Executive, Department Head/Manager/Account Manager, and the TA/Payroll Manager role (an HR/payroll role outside the normal department-management chain)."
      ),
      heading("Flow"),
      checklist([
        "Requester opens the Contractor Change Request form and selects a change type — the form shows only the fields relevant to that type, including an effective/compensation date where applicable.",
        "Submitting creates a ContractorChangeRequest with status \"Pending\" and is recorded in the audit log.",
        "The request appears on /admin/contractor-requests for reviewers (same canManageContractors access).",
        "A reviewer approves or rejects the request; the status update is audit-logged.",
      ]),
      callout(
        "info",
        "Comp-date logic: the effective date on a request determines when the change should apply for payroll purposes — it does not automatically modify the Employee record."
      ),
    ],
  },
  {
    title: "Employee Requests Flow",
    category: "Workflow Documentation",
    featureArea: "Employee Requests",
    tags: ["requests", "coe", "workflow"],
    blocks: [
      heading("Purpose"),
      paragraph(
        "The EmployeeRequest model is a general-purpose request system for employee-initiated paperwork. The first supported request type is COE (Certificate of Employment)."
      ),
      heading("Employee Side"),
      paragraph(
        "Employees submit requests from /requests (My Requests). Each request records the requester, request type, and any type-specific details, and starts with status \"Pending\"."
      ),
      heading("Admin Pipeline (/admin/requests)"),
      paragraph("Admins view requests grouped by status and move them through the pipeline:"),
      checklist([
        "Pending — newly submitted, not yet reviewed",
        "Processing — being worked on",
        "Completed — fulfilled",
        "Rejected — declined, with a reason",
      ]),
      callout(
        "info",
        "The system is designed to be extensible — additional request types beyond COE can be added alongside the existing pipeline without changing the underlying model shape."
      ),
    ],
  },
  {
    title: "Taskboard Flow",
    category: "Workflow Documentation",
    featureArea: "Taskboard",
    tags: ["taskboard", "time-tracking"],
    blocks: [
      heading("Purpose"),
      paragraph(
        "The Task model and Taskboard support daily time/task logging for employees, with an admin-side efficiency view."
      ),
      heading("Employee Side (/tasks)"),
      paragraph(
        "Employees log tasks for the day — what they worked on and time spent — building a running record of daily activity."
      ),
      heading("Admin Side (/admin/tasks)"),
      paragraph(
        "Admins/managers view logged tasks across employees, with an efficiency dashboard and an export to .txt for offline review or payroll cross-checks."
      ),
      callout(
        "info",
        "Taskboard data ties into the Attendance \"Hardware / Task Completion\" policy on the Attendance page: incomplete tasks for the day may require additional attendance even outside core hours, regardless of hardware limitations."
      ),
    ],
  },
  {
    title: "Creator Reports Flow",
    category: "Workflow Documentation",
    featureArea: "Creator Reports",
    tags: ["creators", "reports", "page-runners"],
    blocks: [
      heading("Purpose"),
      paragraph(
        "Creator, CreatorAccount, Highlight, TeamNote, and CreatorReport models together track the social accounts (\"creators\") the agency manages and the recurring reports Page Runners file on them."
      ),
      heading("Report Types & Statuses"),
      paragraph(
        "REPORT_TYPES = [\"Internal Report\", \"Creator Report\"]. REPORT_STATUSES = [\"Draft\", \"Submitted\", \"Needs Revision\", \"Approved for Creator\", \"Sent to Creator\", \"Archived\"] — a report moves through this pipeline as Page Runners draft it and managers/Account Managers review and approve it for the creator."
      ),
      heading("Weekly Cadence"),
      paragraph(
        "getWeekRange() (lib/utils.ts) computes the Monday–Sunday week containing a given date. Page Runners report weekly, Monday through Wednesday, on the prior week — used by the Creator Reports dashboard to flag \"reports due\" and \"missing weekly reports\"."
      ),
      heading("Team Notes"),
      paragraph(
        "TeamNote provides a running activity log/note thread per creator — a lighter-weight, ongoing record distinct from the formal weekly CreatorReport submissions."
      ),
      heading("Access"),
      paragraph(
        "canManageCreatorReports(user) = isAdmin(user) || isDepartmentManager(user). The Creator Reports dashboard (/admin/creator-reports) applies further per-role scoping: Department Heads/Managers see their own department, Account Managers see Internal + Creator reports platform-wide, Admin/Executive see everything."
      ),
      callout(
        "info",
        "My Creators (/my-creators) is the employee-facing list of creators an employee personally manages — separate from the admin Creator Reports dashboard."
      ),
    ],
  },
  {
    title: "Known Issues",
    category: "Known Issues",
    tags: ["known-issues", "tech-debt"],
    blocks: [
      heading("Purpose of This Page"),
      paragraph(
        "This page tracks known issues and technical debt that haven't been resolved yet. Add new entries as separate pages in the \"Known Issues\" category with Priority, Status, and Affected Feature set so they can be filtered and tracked individually."
      ),
      heading("Currently Known Issues"),
      checklist([
        "User (login) and Employee (HR record) are linked by email but not automatically kept in sync — changing an employee's email in the Employee Database does not update their existing User login record.",
        "Legacy creator statuses (\"New\", \"Testing\", \"Replacing Account\") remain on older Creator records for filtering/history, but the Add/Edit form only offers Active/Paused/Inactive/Dropped for new entries going forward.",
        "Offset attendance requests were retired — the Offset tab and balance tracking were removed, but historical Offset records remain visible (purple badge) in admin and employee attendance views for record-keeping.",
        "The Notion-style block editor (SOP CMS and Internal Documentation) does not yet support table or code blocks, despite bugs.md listing these as \"if possible\" requirements.",
      ]),
      callout(
        "warning",
        "Resolving the User/Employee email-sync issue would likely require either a shared update path (one form updates both records) or a background reconciliation check — worth scoping carefully since it touches authentication."
      ),
    ],
  },
  {
    title: "Roadmap",
    category: "Roadmap",
    tags: ["roadmap", "planned"],
    blocks: [
      heading("Purpose of This Page"),
      paragraph(
        "This page collects ideas for future development. Add new entries as separate pages in the \"Roadmap\" category with Priority, Status, Target Date, and Affected Feature set so they can be filtered and tracked individually."
      ),
      heading("Ideas for Future Development"),
      checklist([
        "Code and table block types for the shared block editor (SOP CMS + Internal Documentation), to satisfy the original \"tables, if possible\" / \"code blocks\" CMS requirements.",
        "A shared update path (or background sync check) for keeping Employee and User email addresses in sync.",
        "Automated reminders/notifications as SOP deadlines approach, building on the existing SOPExemption model.",
        "Self-service password reset flow for employees.",
        "Expanded export options (CSV/PDF) for additional report types beyond what's currently exportable.",
      ]),
      callout(
        "info",
        "This list is a starting point, not a commitment — prioritize based on actual pain points reported by department heads and admins."
      ),
    ],
  },
];

async function main() {
  for (const p of PAGES) {
    const slug = slugify(p.title);
    const data = {
      title: p.title,
      slug,
      category: p.category,
      tags: p.tags ?? [],
      status: "Published",
      visibility: p.visibility ?? [],
      blocks: p.blocks,
      priority: p.priority ?? null,
      itemStatus: p.itemStatus ?? null,
      changeType: p.changeType ?? null,
      featureArea: p.featureArea ?? null,
      targetDate: p.targetDate ? new Date(p.targetDate) : null,
      createdBy: SEED_AUTHOR,
      createdByName: SEED_AUTHOR_NAME,
    };

    const page = await prisma.docPage.upsert({
      where: { slug },
      update: {
        ...data,
        updatedBy: SEED_AUTHOR,
        updatedByName: SEED_AUTHOR_NAME,
      },
      create: data,
    });

    console.log(`✓ ${page.category} — ${page.title} (${page.slug})`);
  }

  console.log(`\nSeeded ${PAGES.length} internal documentation pages.\n`);
}

main()
  .catch((e) => {
    console.error("\n✗ Error:", e.message, "\n");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
