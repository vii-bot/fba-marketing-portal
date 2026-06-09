import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET  ?email=xxx               → all module acknowledgements for a user
// POST { moduleId, email? }     → acknowledge a training module
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") ?? session.user.email;

  const acks = await prisma.moduleAcknowledgement.findMany({
    where: { email },
    orderBy: { acknowledgedAt: "desc" },
  });

  return NextResponse.json(acks);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId, version = 1 } = await req.json();
  const email = session.user.email;

  // Upsert — if already acknowledged update timestamp
  const ack = await prisma.moduleAcknowledgement.upsert({
    where: { email_moduleId: { email, moduleId } },
    create: { email, moduleId, version, acknowledgedAt: new Date() },
    update: { version, acknowledgedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { actor: email, action: "module.acknowledge", entityType: "Module", entityId: moduleId },
  });

  return NextResponse.json(ack);
}
