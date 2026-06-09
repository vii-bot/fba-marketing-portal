import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageDepartment } from "@/lib/permissions";
import crypto from "crypto";

// POST { employeeId } — generate invite link for an employee
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { employeeId } = await req.json();

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  if (!canManageDepartment(user, employee.department)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email: employee.email } });
  if (existingUser) return NextResponse.json({ error: "User already has an account" }, { status: 409 });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.inviteToken.upsert({
    where: { employeeId: employee.id },
    create: { token, email: employee.email, employeeId: employee.id, expiresAt },
    update: { token, expiresAt, usedAt: null },
  });

  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

  await prisma.auditLog.create({
    data: { actor: user.email, action: "invite.create", entityType: "Employee", entityId: employeeId, metadata: { invitedEmail: employee.email } },
  });

  return NextResponse.json({ inviteUrl, expiresAt });
}

// PATCH { token } — mark invite as used
export async function PATCH(req: NextRequest) {
  const { token } = await req.json();
  await prisma.inviteToken.update({ where: { token }, data: { usedAt: new Date() } }).catch(() => {});
  return NextResponse.json({ success: true });
}

// GET ?token=xxx — validate invite token
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { employee: true },
  });

  if (!invite) return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Invite expired" }, { status: 410 });

  return NextResponse.json({
    email:    invite.email,
    name:     invite.employee.name,
    role:     invite.employee.role,
    department: invite.employee.department,
  });
}
