import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creatorId = new URL(req.url).searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  const highlights = await prisma.highlight.findMany({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(highlights);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { creatorId, platform, postLink, accountUsername, likes, reposts, views, comments, bookmarks, notes, submittedBy } = body;

  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  const highlight = await prisma.highlight.create({
    data: {
      creatorId,
      platform:        platform ?? "X",
      postLink:        postLink ?? null,
      accountUsername: accountUsername ?? null,
      likes:     parseInt(likes     ?? "0") || 0,
      reposts:   parseInt(reposts   ?? "0") || 0,
      views:     parseInt(views     ?? "0") || 0,
      comments:  parseInt(comments  ?? "0") || 0,
      bookmarks: parseInt(bookmarks ?? "0") || 0,
      notes:       notes       ?? null,
      submittedBy: submittedBy ?? session.user.email,
    },
  });

  return NextResponse.json(highlight, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.highlight.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
