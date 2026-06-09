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

export const ATTENDANCE_TYPES   = ["OT", "WeekendOT", "DayOff", "Offset"];
export const ATTENDANCE_STATUSES = ["Pending", "Approved", "Rejected"];

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
