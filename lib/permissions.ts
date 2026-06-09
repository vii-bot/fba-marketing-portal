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
