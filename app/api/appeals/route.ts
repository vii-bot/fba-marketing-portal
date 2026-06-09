import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const email  = searchParams.get("email") ?? "";

  const appeals = await prisma.appeal.findMany({
    where: {
      ...(status && { status }),
      ...(email  && { email: { equals: email, mode: "insensitive" } }),
    },
    include: { strike: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(appeals);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const strike = await prisma.strike.findUnique({ where: { strikeCode: body.strikeCode } });
  if (!strike) return NextResponse.json({ error: "Strike not found" }, { status: 404 });

  const existing = await prisma.appeal.findUnique({ where: { strikeId: strike.id } });
  if (existing) return NextResponse.json({ error: "Appeal already submitted" }, { status: 409 });

  const appeal = await prisma.appeal.create({
    data: {
      strikeId:    strike.id,
      email:       body.email.toLowerCase(),
      explanation: body.explanation,
      evidence:    body.evidence ?? null,
      status:      "Pending",
    },
  });

  await prisma.strike.update({ where: { id: strike.id }, data: { status: "Appealed" } });

  return NextResponse.json(appeal, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status, reviewer, reviewNotes } = await req.json();

  const appeal = await prisma.appeal.update({
    where: { id },
    data: { status, reviewer, reviewNotes },
  });

  if (status === "Approved") {
    await prisma.strike.update({ where: { id: appeal.strikeId }, data: { status: "Resolved" } });
  } else if (status === "Rejected") {
    await prisma.strike.update({ where: { id: appeal.strikeId }, data: { status: "Active" } });
  }

  return NextResponse.json(appeal);
}
