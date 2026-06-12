import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";

  const admin = isAdmin(session.user as any);
  const email = session.user.email;

  const creators = await prisma.creator.findMany({
    where: {
      archived,
      ...(!admin && { assignedPageRunners: { has: email } }),
    },
    include: { highlights: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(creators);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  try {
    const creator = await prisma.creator.create({
      data: {
        creatorCode:         body.creatorCode,
        creatorName:         body.creatorName,
        status:              body.status ?? "Active",
        priority:            body.priority ?? "Medium",
        needsMedia:          body.needsMedia ?? false,
        needsReview:         body.needsReview ?? false,
        assignedPageRunners: body.assignedPageRunners ?? [],
        uploadsFolder:       body.uploadsFolder ?? null,
        mediaFolder:         body.mediaFolder ?? null,
        signedPlatforms:     body.signedPlatforms ?? [],
        overview:            body.overview ?? null,
        niche:               body.niche ?? null,
        assets:              body.assets ?? null,
        accounts:            body.accounts ?? null,
        strategy:            body.strategy ?? null,
        archived:            body.archived ?? false,
      },
    });
    return NextResponse.json(creator, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "A creator with that Creator Code already exists. Please use a unique code." }, { status: 409 });
    }
    console.error("[POST /api/creators]", e?.message);
    return NextResponse.json({ error: "Database error. Please try again." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, notes, ...data } = await req.json();

  const creator = await prisma.creator.update({ where: { id }, data });
  return NextResponse.json(creator);
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdmin(session.user as any)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, permanent } = await req.json();

  if (permanent) {
    await prisma.creator.delete({ where: { id } });
  } else {
    await prisma.creator.update({ where: { id }, data: { archived: true } });
  }

  return NextResponse.json({ success: true });
}
