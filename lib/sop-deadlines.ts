// Shared SOP acknowledgement-deadline logic (bugs.md Phase 3).
// Computes the effective deadline for a given SOP + employee combination,
// and whether it's currently overdue.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SOPDeadlineFields {
  deadlineType: string;            // None | Fixed | Relative
  deadlineDate: Date | string | null;
  deadlineDays: number | null;
  deadlineBasis: string | null;    // Publish | Assignment
  createdAt: Date | string;
}

export interface DeadlineResult {
  deadline: Date | null;
  isOverdue: boolean;
}

// `employeeCreatedAt` anchors "Assignment"-based relative deadlines — the date
// the employee record was created is used as a proxy for when they were
// assigned access to this content (e.g. for new hires).
export function getSOPDeadline(
  sop: SOPDeadlineFields,
  employeeCreatedAt: Date | string | null,
  acked: boolean,
  exempted: boolean
): DeadlineResult {
  let deadline: Date | null = null;

  if (sop.deadlineType === "Fixed" && sop.deadlineDate) {
    deadline = new Date(sop.deadlineDate);
  } else if (sop.deadlineType === "Relative" && sop.deadlineDays != null) {
    const basisDate = sop.deadlineBasis === "Assignment" && employeeCreatedAt
      ? new Date(employeeCreatedAt)
      : new Date(sop.createdAt);
    deadline = new Date(basisDate.getTime() + sop.deadlineDays * DAY_MS);
  }

  const isOverdue = !!deadline && !acked && !exempted && deadline.getTime() < Date.now();
  return { deadline, isOverdue };
}
