// Derived login/setup status for the Employee DB — computed from the
// linked User account and any outstanding InviteToken, no schema needed.
export type EmployeeLoginStatus =
  | "Login Active"
  | "Profile Setup Pending"
  | "Invite Sent"
  | "Invite Expired"
  | "Permissions Pending";

export interface EmployeeStatusInput {
  user?: { profileComplete: boolean } | null;
  inviteToken?: { expiresAt: string | Date; usedAt: string | Date | null } | null;
}

export function getEmployeeStatus(employee: EmployeeStatusInput): EmployeeLoginStatus {
  if (employee.user) {
    return employee.user.profileComplete ? "Login Active" : "Profile Setup Pending";
  }
  if (employee.inviteToken && !employee.inviteToken.usedAt) {
    const expired = new Date(employee.inviteToken.expiresAt).getTime() < Date.now();
    return expired ? "Invite Expired" : "Invite Sent";
  }
  return "Permissions Pending";
}
