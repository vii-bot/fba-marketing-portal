import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function getQuarter(date: Date): string {
  const m = date.getMonth();
  if (m < 3) return "Q1";
  if (m < 6) return "Q2";
  if (m < 9) return "Q3";
  return "Q4";
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Auth system roles (Better Auth + access control) ──────────────────────────

export const AUTH_ROLES = {
  EXECUTIVE:    "executive",      // Agency/Marketing/Account Executive
  DEPT_HEAD:    "department-head",
  DEPT_MANAGER: "department-manager",
  EMPLOYEE:     "employee",
} as const;

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES];

// Roles that have cross-department (platform-wide) visibility
export const EXECUTIVE_ROLES = [
  "Marketing Executive",
];

// Roles that manage their own department
export const MANAGER_ROLES = [
  "Department Head",
  "Department Manager",
  "Account Manager",
];

// ── Fatbear Agency official roles ─────────────────────────────────────────────

export const EMPLOYEE_ROLES = [
  "Marketing Executive",
  "Account Manager",
  "Department Head",
  "Department Manager",
  "TA/Payroll Manager",
  "Page Runner",
  "Page Runner Assistant",
  "Operations VA",
  "Engager",
  "Flagtester",
  "Editor",
];

// ── Fatbear Agency official departments ───────────────────────────────────────

export const DEPARTMENTS = [
  "Executives",
  "Account Managers",
  "Talent Acquisition",
  "Editing Team",
  "Instagram",
  "Reddit",
  "X",
];

// Departments currently in active operation — used for assigning new
// employees. DEPARTMENTS (above) remains the full list for filters so
// existing employees in legacy departments stay visible/searchable.
export const ACTIVE_DEPARTMENTS = ["Instagram", "X", "Reddit"];

// ── LMS tier system ───────────────────────────────────────────────────────────

export const LMS_TIERS = ["Introductory", "Intermediate", "Advanced", "Upskill"] as const;
export type LmsTier = (typeof LMS_TIERS)[number];

// Tier prerequisite chain — each tier requires the one before it to be 100%
export const TIER_PREREQUISITES: Partial<Record<LmsTier, LmsTier>> = {
  Intermediate: "Introductory",
  Advanced:     "Intermediate",
  Upskill:      "Advanced",
};

export const TIER_BADGES: Record<LmsTier, string> = {
  Introductory: "Introductory Certified",
  Intermediate: "Intermediate Certified",
  Advanced:     "Advanced Certified",
  Upskill:      "Upskill Certified",
};

export const TIER_COLORS: Record<LmsTier, string> = {
  Introductory: "text-emerald-400",
  Intermediate: "text-indigo-400",
  Advanced:     "text-amber-400",
  Upskill:      "text-rose-400",
};

// ── Schedule legends ──────────────────────────────────────────────────────────

export const SCHEDULE_SHIFTS = [
  { code: "12AM", label: "12AM – 8AM shift",   color: "text-indigo-400" },
  { code: "10PM", label: "10PM – 6AM shift",   color: "text-purple-400" },
  { code: "9PM",  label: "9PM – 5AM shift",    color: "text-sky-400" },
  { code: "4PM",  label: "4PM – 12AM shift",   color: "text-emerald-400" },
  { code: "OFF",  label: "Rest day",            color: "text-slate-500" },
] as const;

// Shift start times in UTC. Codes are defined in US Central Standard
// Time (UTC-6); used to render each employee's shift start in the
// viewer's local timezone.
export const SHIFT_START_UTC_HOUR: Record<string, number> = {
  "12AM": 6,   // 12:00 AM CST
  "10PM": 4,   // 10:00 PM CST (prev day)
  "9PM":  3,   // 9:00 PM CST (prev day)
  "4PM":  22,  // 4:00 PM CST
};

// ── Strike system ─────────────────────────────────────────────────────────────

export const STRIKE_TYPES = ["Compliance", "Attendance"];
export const STRIKE_LEVELS = [
  "First Warning",
  "On Strike",
  "Final Warning",
  "For Evaluation",
  "Terminated",
];
export const STRIKE_STATUSES = [
  "Active",
  "Pending Review",
  "Appealed",
  "Resolved",
  "Archived",
];

// ── Attendance ────────────────────────────────────────────────────────────────

export const ATTENDANCE_TYPES   = ["OT", "WeekendOT", "DayOff"];
export const ATTENDANCE_STATUSES = ["Pending", "Approved", "Rejected"];

// ── Employee Requests ─────────────────────────────────────────────────────────

// Registry of employee-facing request types (bugs.md Phase 5). Only `active`
// types are selectable when submitting a new request — the rest are reserved
// for future phases but kept here so labels stay resolvable everywhere.
export interface RequestTypeDef {
  value: string;
  label: string;
  active: boolean;
}

export const REQUEST_TYPES: RequestTypeDef[] = [
  { value: "COE",       label: "Certificate of Employment (COE)", active: true },
  { value: "Payslip",   label: "Payslip Request",                 active: false },
  { value: "Leave",     label: "Leave Request",                   active: false },
  { value: "OT",        label: "Overtime Request",                active: false },
  { value: "Schedule",  label: "Schedule Change Request",         active: false },
  { value: "HR",        label: "HR Concern",                      active: false },
  { value: "Payroll",   label: "Payroll Concern",                 active: false },
  { value: "Equipment", label: "Equipment / Tool Access Request",  active: false },
];

export const ACTIVE_REQUEST_TYPES = REQUEST_TYPES.filter(t => t.active);

export function requestTypeLabel(type: string): string {
  return REQUEST_TYPES.find(t => t.value === type)?.label ?? type;
}

export const EMPLOYEE_REQUEST_STATUSES = ["Pending", "Processing", "Completed", "Rejected"];

// ── Contractor Change Requests ────────────────────────────────────────────────

export const CONTRACTOR_REQUEST_TYPES = ["Termination", "Department Transfer", "Compensation Adjustment", "Hire"];
export const CONTRACTOR_REQUEST_STATUSES = ["Pending", "Approved", "Rejected", "Completed"];
export const COMPENSATION_TYPES = ["Hourly", "Salary / Flat Rate"];

// Departments offered in the Contractor Change Request form's "Department"
// field. Kept separate from DEPARTMENTS/ACTIVE_DEPARTMENTS so this list can
// grow independently — the form always offers an "Other" free-text fallback.
export const CONTRACTOR_REQUEST_DEPARTMENTS = ["Instagram", "X", "Reddit"];

// Wage changes must take effect on the first day of a pay period (the 1st or
// 16th). bugs.md Phase 6: a date selected mid-period is rolled forward to the
// next period start. `dateStr` and the return value are "YYYY-MM-DD".
export function adjustToPayPeriod(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDate();
  if (day === 1 || day === 16) return dateStr;
  if (day >= 2 && day <= 15) {
    d.setUTCDate(16);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
  }
  return d.toISOString().slice(0, 10);
}

// ── Taskboard / Time Tracking ─────────────────────────────────────────────────

export const TASK_STATUSES = ["Pending", "In Progress", "Finished"];

// Open-ended but controlled vocabulary so the admin efficiency dashboard can
// group/compare "per task type" — the form always offers an "Other" free-text
// fallback for anything not listed.
export const TASK_CATEGORIES = [
  "Content Creation",
  "Engagement",
  "Research",
  "Editing",
  "Quality Check",
  "Reporting / Admin",
  "Training",
  "Meeting",
  "Other",
];

export function formatMinutes(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null) return "—";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// "YYYY-MM-DD" for the browser's local date — used as the taskboard's "shift
// day" so the task list and end-of-shift export line up with what the
// employee sees, regardless of server timezone.
export function todayLocalDate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

// ── Creator Reports ───────────────────────────────────────────────────────────

export const REPORT_TYPES = ["Internal Report", "Creator Report"];
export const REPORT_STATUSES = ["Draft", "Submitted", "Needs Revision", "Approved for Creator", "Sent to Creator", "Archived"];

// Page Runners report weekly, Monday through Wednesday. Returns the
// Monday-Sunday range (as Date objects, local time) containing `date`, used
// to determine "reports due this week" / "missing weekly reports".
export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  return { start, end };
}

// ── Internal Documentation CMS ────────────────────────────────────────────────

export const DOC_CATEGORIES = [
  "App Overview",
  "System Architecture",
  "Authentication & Access",
  "Feature Documentation",
  "Workflow Documentation",
  "Database & Data Models",
  "API & Backend Notes",
  "Changelog",
  "Known Issues",
  "Roadmap",
];

export const DOC_STATUSES = ["Draft", "Published", "Archived"];

// Roles that can be granted per-page read access via DocPage.visibility, on
// top of the implicit Admin/Executive access (bugs.md Phase 13 "Department
// Head/Manager, if permission is granted").
export const DOC_VISIBILITY_ROLES = MANAGER_ROLES;

// Changelog entry types
export const DOC_CHANGE_TYPES = ["Added", "Changed", "Fixed", "Removed", "Planned"];

// Shared priority scale for Known Issues + Roadmap
export const DOC_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

// Known Issues status values
export const DOC_ISSUE_STATUSES = ["Open", "In Progress", "Resolved"];

// Roadmap status values
export const DOC_ROADMAP_STATUSES = ["Planned", "In Progress", "Completed", "On Hold"];

// Slugify a doc page title — lowercase, alphanumeric + hyphens only.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Legacy compat (still used in some pages) ──────────────────────────────────

export const ROLES = {
  ADMIN: "admin",
  PAGE_RUNNER: "page-runner",
  ENGAGER: "engager",
  FLAGTESTER: "flagtester",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  "page-runner": "Page Runner",
  engager: "Engager",
  flagtester: "Flagtester",
};
