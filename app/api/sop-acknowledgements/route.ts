import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST { sopId } — acknowledge the current version of a SOP
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sopId } = await req.json();
  const email = session.user.email;

  const sop = await prisma.sOP.findUnique({ where: { id: sopId } });
  if (!sop) return NextResponse.json({ error: "SOP not found" }, { status: 404 });

  const ack = await prisma.sOPAcknowledgement.upsert({
    where: { sopId_email_version: { sopId, email, version: sop.version } },
    create: { sopId, email, version: sop.version },
    update: { acknowledgedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { actor: email, action: "sop.acknowledge", entityType: "SOP", entityId: sopId, metadata: { version: sop.version } },
  });

  return NextResponse.json(ack);
}

// PATCH { sopId } — record that the current user viewed this SOP (distinct from acknowledging it)
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sopId } = await req.json();
  const email = session.user.email;

  const view = await prisma.sOPView.upsert({
    where:  { sopId_email: { sopId, email } },
    create: { sopId, email },
    update: { viewedAt: new Date() },
  });

  return NextResponse.json(view);
}

// GET ?email=xxx — all SOP acknowledgements for a user
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") ?? session.user.email;

  const acks = await prisma.sOPAcknowledgement.findMany({
    where: { email },
    include: { sop: { select: { id: true, title: true, tier: true, version: true, isRequired: true } } },
    orderBy: { acknowledgedAt: "desc" },
  });

  return NextResponse.json(acks);
}
