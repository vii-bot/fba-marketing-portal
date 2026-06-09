import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateId, getQuarter } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search  = searchParams.get("search") ?? "";
  const type    = searchParams.get("type") ?? "";
  const status  = searchParams.get("status") ?? "";
  const quarter = searchParams.get("quarter") ?? "";
  const year    = searchParams.get("year") ?? "";
  const email   = searchParams.get("email") ?? "";

  const strikes = await prisma.strike.findMany({
    where: {
      ...(search  && { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] }),
      ...(type    && { type }),
      ...(status  && { status }),
      ...(quarter && { quarter }),
      ...(year    && { year: parseInt(year) }),
      ...(email   && { email: { equals: email, mode: "insensitive" } }),
    },
    include: { appeal: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(strikes);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const incidentDate = new Date(body.incidentDate);

  const strike = await prisma.strike.create({
    data: {
      strikeCode:   generateId("STK"),
      name:         body.name,
      email:        body.email.toLowerCase(),
      role:         body.role,
      department:   body.department ?? "FBA X Department",
      type:         body.type,
      level:        body.level,
      incidentDate,
      submitter:    body.submitter,
      reason:       body.reason,
      impact:       body.impact ?? null,
      action:       body.action ?? null,
      evidence:     body.evidence ?? null,
      status:       body.status ?? "Active",
      notes:        body.notes ?? null,
      requireAck:   body.requireAck ?? false,
      quarter:      getQuarter(incidentDate),
      year:         incidentDate.getFullYear(),
    },
  });

  return NextResponse.json(strike, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...data } = body;

  const strike = await prisma.strike.update({
    where: { id },
    data: {
      ...data,
      ...(data.incidentDate && { incidentDate: new Date(data.incidentDate) }),
    },
  });

  return NextResponse.json(strike);
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.strike.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
