import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageId } = await req.json();

  await prisma.learningProgress.upsert({
    where: { email_pageId: { email: session.user.email, pageId } },
    create: { email: session.user.email, pageId },
    update: {},
  });

  return NextResponse.json({ success: true });
}
