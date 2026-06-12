import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const action = new URL(req.url).searchParams.get("action");

  switch (action) {
    case "strikes":
      await prisma.appeal.deleteMany();
      await prisma.strike.deleteMany();
      break;
    case "appeals":
      await prisma.appeal.deleteMany();
      await prisma.strike.updateMany({ where: { status: "Appealed" }, data: { status: "Active" } });
      break;
    case "attendance":
      await prisma.attendanceRequest.deleteMany();
      break;
    case "employees":
      await prisma.employee.deleteMany();
      break;
    case "all":
      await prisma.appeal.deleteMany();
      await prisma.strike.deleteMany();
      await prisma.attendanceRequest.deleteMany();
      await prisma.employee.deleteMany();
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await logAudit(session.user.email, "admin.clear", "Database", undefined, { action });

  return NextResponse.json({ success: true });
}
