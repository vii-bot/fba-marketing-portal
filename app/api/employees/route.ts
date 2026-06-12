import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { isAdmin, isDepartmentManager, canViewEmployeeDatabase } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as any;
  if (!session || !canViewEmployeeDatabase(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const role   = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";

  // Department Heads/Managers/Account Managers only see their own department;
  // Admins/Executives see across all departments.
  const deptScope = !isAdmin(user) && isDepartmentManager(user)
    ? { department: user.department ?? "__none__" }
    : {};

  const employees = await prisma.employee.findMany({
    where: {
      ...deptScope,
      ...(search && { OR: [
        { name:       { contains: search, mode: "insensitive" } },
        { email:      { contains: search, mode: "insensitive" } },
        { role:       { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
      ] }),
      ...(role   && { role }),
      ...(status && { status }),
    },
    include: {
      user: { select: { profileComplete: true } },
      inviteToken: { select: { expiresAt: true, usedAt: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email = body.email.toLowerCase();
  const department = body.department ?? "X";
  const authRole = body.access?.superAdmin ? "admin" : body.role;

  const existing = await prisma.employee.findUnique({ where: { email } });

  const employee = await prisma.employee.upsert({
    where: { email },
    create: {
      name:       body.name,
      email,
      role:       body.role,
      department,
      startDate:  body.startDate ? new Date(body.startDate) : null,
      status:     body.status ?? "Active",
      notes:      body.notes ?? null,
      schedule:   body.schedule ?? null,
      access:     body.access ?? null,
    },
    update: {
      name:       body.name,
      role:       body.role,
      department,
      startDate:  body.startDate ? new Date(body.startDate) : null,
      status:     body.status ?? "Active",
      notes:      body.notes ?? null,
      schedule:   body.schedule ?? null,
      access:     body.access ?? null,
    },
  });

  // Sync role/department onto the linked User account if one exists
  await prisma.user.updateMany({
    where: { email },
    data:  { role: authRole, department },
  });

  await logAudit(
    session.user.email,
    existing ? "employee.update" : "employee.create",
    "Employee",
    employee.id,
    existing
      ? {
          name: employee.name,
          changes: {
            ...(existing.role !== employee.role && { role: { from: existing.role, to: employee.role } }),
            ...(existing.department !== employee.department && { department: { from: existing.department, to: employee.department } }),
            ...(existing.status !== employee.status && { status: { from: existing.status, to: employee.status } }),
            ...(JSON.stringify(existing.access) !== JSON.stringify(employee.access) && { access: { from: existing.access, to: employee.access } }),
          },
        }
      : { name: employee.name, role: employee.role, department: employee.department }
  );

  return NextResponse.json(employee, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  const employee = await prisma.employee.delete({ where: { id } });

  await logAudit(session.user.email, "employee.delete", "Employee", employee.id, {
    name: employee.name,
    email: employee.email,
  });

  return NextResponse.json({ success: true });
}
