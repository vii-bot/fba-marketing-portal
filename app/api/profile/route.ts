import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET → current user's profile (merged User + Employee)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  return NextResponse.json(user);
}

// PATCH { profilePicture?, bannerImage?, discordUsername?, name? }
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["discordUsername", "name", "profileComplete"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.user.update({ where: { id: session.user.id }, data });

  // Sync name/discord to Employee record if it exists
  if (body.name || body.discordUsername) {
    await prisma.employee.updateMany({
      where: { email: session.user.email },
      data: {
        ...(body.name            ? { name: body.name } : {}),
        ...(body.discordUsername ? { discordUsername: body.discordUsername } : {}),
      },
    });
  }

  await prisma.auditLog.create({
    data: { actor: session.user.email, action: "profile.update", entityType: "User", entityId: session.user.id },
  });

  return NextResponse.json(updated);
}
