// Reusable permission helpers — role + department based access control
// Use these everywhere instead of hardcoding role checks into pages.

import { EXECUTIVE_ROLES, MANAGER_ROLES } from "./utils";

export interface PermUser {
  role: string;
  department?: string | null;
  email: string;
}

// ── Role classification ───────────────────────────────────────────────────────

export function isExecutive(user: PermUser): boolean {
  return EXECUTIVE_ROLES.includes(user.role);
}

export function isDepartmentManager(user: PermUser): boolean {
  return MANAGER_ROLES.includes(user.role);
}

export function isAdmin(user: PermUser): boolean {
  // Legacy auth role — kept for Better Auth session compatibility
  return (user as any).role === "admin" || isExecutive(user);
}

// vii@fatbearagency.com always has full, platform-wide visibility on the
// Team Productivity Admin dashboard, regardless of role/department.
const SUPER_USER_EMAILS = ["vii@fatbearagency.com"];

export function isSuperUser(user: PermUser): boolean {
  return SUPER_USER_EMAILS.includes((user.email ?? "").toLowerCase());
}

// ── Department access ─────────────────────────────────────────────────────────

export function canViewDepartment(user: PermUser, department: string): boolean {
  if (isExecutive(user)) return true;
  if (isDepartmentManager(user)) return user.department === department;
  return user.department === department;
}

// ── Resource visibility ───────────────────────────────────────────────────────

export interface Resource {
  department: string;   // "All Departments" or a specific dept name
  roleVisibility?: string[];
}

export function canViewResource(user: PermUser, resource: Resource): boolean {
  if (isExecutive(user)) return true;
  if (resource.department === "All Departments") return true;
  if (user.department && resource.department === user.department) return true;
  return false;
}

export function canEditResource(user: PermUser, resource: Resource): boolean {
  if (isExecutive(user)) return true;
  if (!isDepartmentManager(user)) return false;
  if (resource.department === "All Departments") return true;
  return user.department === resource.department;
}

// ── Employee visibility ───────────────────────────────────────────────────────

export function canViewEmployee(
  viewer: PermUser,
  employee: { department: string; email: string }
): boolean {
  if (isExecutive(viewer)) return true;
  if (viewer.email === employee.email) return true;
  return canViewDepartment(viewer, employee.department);
}

// Admins/Executives can browse the full Employee Database across all
// departments; Department Heads/Managers can browse their own department's
// employees only. Account Managers and regular employees have no access.
export function canViewEmployeeDatabase(user: PermUser): boolean {
  return isAdmin(user) || isDepartmentManager(user);
}

// ── Department management ─────────────────────────────────────────────────────

export function canManageDepartment(user: PermUser, department: string): boolean {
  if (isExecutive(user)) return true;
  if (!isDepartmentManager(user)) return false;
  return user.department === department;
}

// ── LMS / SOP access ─────────────────────────────────────────────────────────

export function canManageLMS(user: PermUser): boolean {
  return (user as any).role === "admin" || isExecutive(user) || isDepartmentManager(user);
}

export function canManageSOP(user: PermUser, sopDepartment: string): boolean {
  if ((user as any).role === "admin" || isExecutive(user)) return true;
  if (!isDepartmentManager(user)) return false;
  if (sopDepartment === "All Departments") return true;
  return user.department === sopDepartment;
}

// Whether an employee should see a given SOP/course in their library.
// Executives see everything; everyone else only sees Published content that
// matches their department (or "All Departments") and, if roles are specified,
// their own role.
export function canViewSOP(
  user: PermUser & { role: string },
  sop: { department: string; roles: string[]; status: string }
): boolean {
  if (isExecutive(user)) return true;
  if (sop.status !== "Published") return false;
  if (sop.department !== "All Departments" && sop.department !== user.department) return false;
  if (sop.roles?.length && !sop.roles.includes(user.role)) return false;
  return true;
}

// ── Strike management ─────────────────────────────────────────────────────────

export function canSubmitStrike(user: PermUser): boolean {
  return isExecutive(user) || isDepartmentManager(user) || (user as any).role === "admin";
}

// ── Attendance approval ───────────────────────────────────────────────────────

export function canApproveOT(user: PermUser): boolean {
  // Only heads are allowed to approve OTs
  return isExecutive(user) || user.role === "Department Head";
}

export function canApproveLeave(user: PermUser): boolean {
  return isExecutive(user) || isDepartmentManager(user);
}

// ── Contractor Change Requests ────────────────────────────────────────────────

// Authorized roles for the FBA Contractor Change Request form (bugs.md
// Phase 6): Admin, Department Head, Department Manager, Executive, and
// TA/Payroll Manager (an HR/payroll role outside the normal MANAGER_ROLES
// department-management chain). Account Managers are scoped to Creators/
// Creator Reports only and do not get this.
export function canManageContractors(user: PermUser): boolean {
  return isAdmin(user) || isDepartmentManager(user) || user.role === "TA/Payroll Manager";
}

// ── Creator Reports ───────────────────────────────────────────────────────────

// Who sees the Creator Reports admin dashboard (bugs.md Phase 10): Admins/
// Executives (all departments), Department Heads/Managers (their own
// department), and Account Managers (Internal + Creator reports
// platform-wide). Account Managers are called out explicitly since they're
// no longer part of MANAGER_ROLES/isDepartmentManager — this is the one
// admin-tier area they retain access to (alongside My Creators). The
// dashboard's API route applies the per-role department/visibility scoping
// on top of this gate.
export function canManageCreatorReports(user: PermUser): boolean {
  return isAdmin(user) || isDepartmentManager(user) || user.role === "Account Manager";
}

// ── Internal Documentation CMS ────────────────────────────────────────────────

// Who can access the Internal Documentation area (bugs.md Phase 13):
// Admins/Executives always; Department Heads/Managers may open the area, but
// only see Published pages whose `visibility` includes their role ("if
// permission is granted" — granted per page via DocPage.visibility, not a
// blanket toggle). Account Managers and regular employees have no access.
export function canAccessInternalDocs(user: PermUser): boolean {
  return isAdmin(user) || isDepartmentManager(user);
}

// Who can manage the CMS itself — create/edit/publish/unpublish/archive/
// delete pages, and see Draft/Archived pages: Admins/Executives only.
export function canManageInternalDocs(user: PermUser): boolean {
  return isAdmin(user);
}
