import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSOP } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// GET ?sopId=xxx — list deadline exemptions for a SOP
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

  const exemptions = await prisma.sOPExemption.findMany({ where: { sopId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(exemptions);
}

// POST { sopId, email, reason? } — exempt an employee from this SOP's deadline
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { sopId, email, reason } = await req.json();

  const sop = await prisma.sOP.findUnique({ where: { id: sopId } });
  if (!sop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageSOP(user, sop.department)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const exemption = await prisma.sOPExemption.upsert({
    where: { sopId_email: { sopId, email: email.toLowerCase() } },
    create: { sopId, email: email.toLowerCase(), reason: reason || null, grantedBy: user.email },
    update: { reason: reason || null, grantedBy: user.email },
  });

  await logAudit(user.email, "sop.exempt", "SOP", sopId, {
    sopTitle: sop.title, exemptedEmail: exemption.email, reason: exemption.reason,
  });

  return NextResponse.json(exemption, { status: 201 });
}

// DELETE { id } — remove a deadline exemption
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { id } = await req.json();

  const exemption = await prisma.sOPExemption.findUnique({ where: { id }, include: { sop: true } });
  if (!exemption) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canManageSOP(user, exemption.sop.department)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.sOPExemption.delete({ where: { id } });

  await logAudit(user.email, "sop.unexempt", "SOP", exemption.sopId, {
    sopTitle: exemption.sop.title, exemptedEmail: exemption.email,
  });

  return NextResponse.json({ success: true });
}
