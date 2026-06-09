import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const role   = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";

  const employees = await prisma.employee.findMany({
    where: {
      ...(search && { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] }),
      ...(role   && { role }),
      ...(status && { status }),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email = body.email.toLowerCase();
  const authRole = body.access?.superAdmin ? "admin" : "employee";

  const employee = await prisma.employee.upsert({
    where: { email },
    create: {
      name:       body.name,
      email,
      role:       body.role,
      department: body.department ?? "FBA X Department",
      startDate:  body.startDate ? new Date(body.startDate) : null,
      status:     body.status ?? "Active",
      notes:      body.notes ?? null,
      schedule:   body.schedule ?? null,
      access:     body.access ?? null,
    },
    update: {
      name:       body.name,
      role:       body.role,
      department: body.department ?? "FBA X Department",
      startDate:  body.startDate ? new Date(body.startDate) : null,
      status:     body.status ?? "Active",
      notes:      body.notes ?? null,
      schedule:   body.schedule ?? null,
      access:     body.access ?? null,
    },
  });

  // Sync auth role on the linked User account if one exists
  await prisma.user.updateMany({
    where: { email },
    data:  { role: authRole },
  });

  return NextResponse.json(employee, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
