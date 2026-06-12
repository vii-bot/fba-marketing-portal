import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const email  = searchParams.get("email") ?? "";
  const type   = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";
  const month  = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
  const year   = searchParams.get("year")  ? parseInt(searchParams.get("year")!)  : null;
  const period = searchParams.get("period") ? parseInt(searchParams.get("period")!) : null;

  let dateFilter = {};
  if (year && month) {
    const start = new Date(year, month - 1, period === 1 ? 1 : 16);
    const end   = period === 1
      ? new Date(year, month - 1, 15, 23, 59, 59)
      : new Date(year, month, 0, 23, 59, 59);
    dateFilter = { date: { gte: start, lte: end } };
  }

  const requests = await prisma.attendanceRequest.findMany({
    where: {
      ...(email  && { email: { equals: email, mode: "insensitive" } }),
      ...(type   && { type }),
      ...(status && { status }),
      ...dateFilter,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Offset requests are no longer accepted for new submissions; historical
  // records remain in the database and are still readable via GET.
  if (body.type === "Offset") {
    return NextResponse.json({ error: "Offset requests are no longer accepted." }, { status: 400 });
  }

  // Validate OT hours limit (max 6 per week)
  if (body.type === "OT" && body.hours) {
    const date = new Date(body.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const weekOT = await prisma.attendanceRequest.aggregate({
      where: {
        email: { equals: body.email, mode: "insensitive" },
        type: "OT",
        status: { in: ["Pending", "Approved"] },
        date: { gte: weekStart, lt: weekEnd },
      },
      _sum: { hours: true },
    });

    const used = weekOT._sum.hours ?? 0;
    if (used + body.hours > 6) {
      return NextResponse.json(
        { error: `OT limit exceeded. You have ${6 - used} hours remaining this week.` },
        { status: 400 }
      );
    }
  }

  const request = await prisma.attendanceRequest.create({
    data: {
      requestCode:  generateId("ATR"),
      type:         body.type,
      name:         body.name,
      email:        body.email.toLowerCase(),
      role:         body.role ?? null,
      department:   body.department ?? "FBA X Department",
      date:         new Date(body.date),
      hours:        body.hours ?? null,
      reason:       body.reason,
      tasks:        body.tasks ?? null,
      deliverables: body.deliverables ?? null,
      coverage:     body.coverage ?? null,
      codes:        body.codes ?? null,
      notes:        body.notes ?? null,
      makeupDate:   body.makeupDate ? new Date(body.makeupDate) : null,
      missedDate:   body.missedDate ? new Date(body.missedDate) : null,
      status:       "Pending",
    },
  });

  return NextResponse.json(request, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status, reviewer, reviewNotes } = await req.json();

  const request = await prisma.attendanceRequest.update({
    where: { id },
    data: { status, reviewer, reviewNotes },
  });

  await logAudit(session.user.email, "attendance.review", "AttendanceRequest", request.id, {
    name: request.name, type: request.type, status, reviewer,
  });

  return NextResponse.json(request);
}
