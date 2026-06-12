import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creatorId = new URL(req.url).searchParams.get("creatorId");
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  const notes = await prisma.teamNote.findMany({
    where: { creatorId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user;

  const body = await req.json();
  const { creatorId, content } = body;

  if (!creatorId || !content?.trim()) {
    return NextResponse.json({ error: "creatorId and content are required." }, { status: 400 });
  }

  const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
  if (!creator) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

  const note = await prisma.teamNote.create({
    data: {
      creatorId,
      content: content.trim(),
      authorEmail: user.email,
      authorName: user.name ?? user.email,
    },
  });

  await logAudit(user.email, "team-note.create", "TeamNote", note.id, {
    creatorName: creator.creatorName,
    creatorCode: creator.creatorCode,
  });

  return NextResponse.json(note, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content is required." }, { status: 400 });

  const existing = await prisma.teamNote.findUnique({ where: { id }, include: { creator: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.authorEmail.toLowerCase() !== user.email.toLowerCase() && !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const note = await prisma.teamNote.update({
    where: { id },
    data: { content: content.trim(), editedAt: new Date() },
  });

  await logAudit(user.email, "team-note.update", "TeamNote", note.id, {
    creatorName: existing.creator.creatorName,
    creatorCode: existing.creator.creatorCode,
  });

  return NextResponse.json(note);
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { id } = await req.json();

  const existing = await prisma.teamNote.findUnique({ where: { id }, include: { creator: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.authorEmail.toLowerCase() !== user.email.toLowerCase() && !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.teamNote.delete({ where: { id } });

  await logAudit(user.email, "team-note.delete", "TeamNote", id, {
    creatorName: existing.creator.creatorName,
    creatorCode: existing.creator.creatorCode,
  });

  return NextResponse.json({ success: true });
}
