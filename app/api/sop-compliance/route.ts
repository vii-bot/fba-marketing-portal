import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSOP, canViewSOP } from "@/lib/permissions";
import { getSOPDeadline } from "@/lib/sop-deadlines";

// GET ?sopId=xxx — per-employee acknowledgement/deadline status for a SOP
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sopId = searchParams.get("sopId");
  if (!sopId) return NextResponse.json({ error: "sopId required" }, { status: 400 });

  const sop = await prisma.sOP.findUnique({ where: { id: sopId } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageSOP(session.user as any, sop.department)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [employees, acks, exemptions] = await Promise.all([
    prisma.employee.findMany({
      select: { id: true, name: true, email: true, role: true, department: true, createdAt: true },
    }),
    prisma.sOPAcknowledgement.findMany({ where: { sopId, version: sop.version } }),
    prisma.sOPExemption.findMany({ where: { sopId } }),
  ]);

  const ackSet = new Set(acks.map(a => a.email));
  const exemptMap = new Map(exemptions.map(e => [e.email, e]));

  const rows = employees
    .filter(e => canViewSOP(e, sop))
    .map(e => {
      const acked = ackSet.has(e.email);
      const exemption = exemptMap.get(e.email);
      const { deadline, isOverdue } = getSOPDeadline(sop, e.createdAt, acked, !!exemption);

      let status: "Acknowledged" | "Exempted" | "Overdue" | "Not Acknowledged";
      if (acked) status = "Acknowledged";
      else if (exemption) status = "Exempted";
      else if (isOverdue) status = "Overdue";
      else status = "Not Acknowledged";

      return {
        id: e.id,
        name: e.name,
        email: e.email,
        role: e.role,
        department: e.department,
        status,
        deadline,
        exemptionId: exemption?.id ?? null,
        exemptionReason: exemption?.reason ?? null,
      };
    });

  return NextResponse.json({
    sop: {
      id: sop.id,
      title: sop.title,
      contentType: sop.contentType,
      deadlineType: sop.deadlineType,
      deadlineDate: sop.deadlineDate,
      deadlineDays: sop.deadlineDays,
      deadlineBasis: sop.deadlineBasis,
      version: sop.version,
    },
    rows,
  });
}
