import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { generateId, ACTIVE_REQUEST_TYPES, EMPLOYEE_REQUEST_STATUSES } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const type   = searchParams.get("type") ?? "";

  const requests = await prisma.employeeRequest.findMany({
    where: {
      // Admins/executives see every request; everyone else sees only their own.
      ...(isAdmin(user) ? {} : { email: { equals: user.email, mode: "insensitive" } }),
      ...(status && { status }),
      ...(type && { type }),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  if (!ACTIVE_REQUEST_TYPES.some(t => t.value === body.type)) {
    return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
  }
  if (!body.reason) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({ where: { email: user.email } });

  const request = await prisma.employeeRequest.create({
    data: {
      requestCode: generateId("REQ"),
      type:        body.type,
      name:        employee?.name ?? user.name ?? user.email,
      email:       user.email.toLowerCase(),
      role:        employee?.role ?? null,
      department:  employee?.department ?? "X",
      reason:      body.reason,
      dateNeeded:  body.dateNeeded ? new Date(body.dateNeeded) : null,
      notes:       body.notes ?? null,
      status:      "Pending",
      employeeId:  employee?.id ?? null,
    },
  });

  await logAudit(user.email, "request.create", "EmployeeRequest", request.id, {
    type: request.type, name: request.name,
  });

  return NextResponse.json(request, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = session.user as any;
  const { id, status, reviewNotes } = await req.json();

  if (!EMPLOYEE_REQUEST_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const request = await prisma.employeeRequest.update({
    where: { id },
    data: { status, reviewer: user.email, reviewNotes: reviewNotes ?? null },
  });

  await logAudit(user.email, "request.review", "EmployeeRequest", request.id, {
    type: request.type, name: request.name, status,
  });

  return NextResponse.json(request);
}
