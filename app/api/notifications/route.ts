import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = session.user.email;

  const notifications = await prisma.notification.findMany({
    where: { email },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json(notifications);
}

// PATCH { id?, markAll?: true } → mark as read
export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, markAll } = await req.json();
  const email = session.user.email;

  if (markAll) {
    await prisma.notification.updateMany({ where: { email, isRead: false }, data: { isRead: true } });
  } else if (id) {
    await prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  return NextResponse.json({ success: true });
}
