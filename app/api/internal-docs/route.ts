import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessInternalDocs, canManageInternalDocs, type PermUser } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { DOC_STATUSES, slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any as PermUser;
  if (!canAccessInternalDocs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = canManageInternalDocs(user);

  const { searchParams } = new URL(req.url);
  const category    = searchParams.get("category") ?? "";
  const status      = searchParams.get("status") ?? "";
  const featureArea = searchParams.get("featureArea") ?? "";
  const priority    = searchParams.get("priority") ?? "";
  const tag         = searchParams.get("tag") ?? "";
  const search      = (searchParams.get("search") ?? "").trim().toLowerCase();

  const pages = await prisma.docPage.findMany({
    where: {
      ...(admin ? {} : { status: "Published", visibility: { has: user.role } }),
      ...(category && { category }),
      ...(status && admin && { status }),
      ...(featureArea && { featureArea }),
      ...(priority && { priority }),
      ...(tag && { tags: { has: tag } }),
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  const filtered = search
    ? pages.filter(p => {
        const haystack = [p.title, p.category, ...(p.tags ?? []), JSON.stringify(p.blocks ?? "")].join(" ").toLowerCase();
        return haystack.includes(search);
      })
    : pages;

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!canManageInternalDocs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const title = (body.title ?? "").trim();
  const category = body.category ?? "";
  if (!title || !category) {
    return NextResponse.json({ error: "Title and category are required." }, { status: 400 });
  }

  let slug = slugify(body.slug?.trim() || title);
  if (!slug) slug = `doc-${Date.now()}`;
  let candidate = slug;
  let n = 1;
  while (await prisma.docPage.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${++n}`;
  }

  const page = await prisma.docPage.create({
    data: {
      title,
      slug: candidate,
      category,
      tags: body.tags ?? [],
      status: body.status === "Published" ? "Published" : "Draft",
      visibility: body.visibility ?? [],
      blocks: (body.blocks ?? []) as Prisma.InputJsonValue,
      priority: body.priority || null,
      itemStatus: body.itemStatus || null,
      changeType: body.changeType || null,
      featureArea: body.featureArea || null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      createdBy: user.email,
      createdByName: user.name ?? user.email,
    },
  });

  await logAudit(user.email, "internal-doc.create", "DocPage", page.id, {
    title: page.title,
    category: page.category,
  });

  return NextResponse.json(page, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!canManageInternalDocs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const existing = await prisma.docPage.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.title !== undefined && body.title.trim()) data.title = body.title.trim();
  if (body.category !== undefined) data.category = body.category;
  if (body.tags !== undefined) data.tags = body.tags;
  if (body.visibility !== undefined) data.visibility = body.visibility;
  if (body.blocks !== undefined) data.blocks = body.blocks as Prisma.InputJsonValue;
  if (body.priority !== undefined) data.priority = body.priority || null;
  if (body.itemStatus !== undefined) data.itemStatus = body.itemStatus || null;
  if (body.changeType !== undefined) data.changeType = body.changeType || null;
  if (body.featureArea !== undefined) data.featureArea = body.featureArea || null;
  if (body.targetDate !== undefined) data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  if (body.status !== undefined && DOC_STATUSES.includes(body.status)) data.status = body.status;

  if (body.slug !== undefined) {
    const newSlug = slugify(body.slug);
    if (newSlug && newSlug !== existing.slug) {
      const conflict = await prisma.docPage.findUnique({ where: { slug: newSlug } });
      if (conflict) return NextResponse.json({ error: "Slug already in use." }, { status: 400 });
      data.slug = newSlug;
    }
  }

  data.updatedBy = user.email;
  data.updatedByName = user.name ?? user.email;

  const page = await prisma.docPage.update({ where: { id: body.id }, data });

  await logAudit(user.email, "internal-doc.update", "DocPage", page.id, {
    title: page.title,
    category: page.category,
    status: page.status,
  });

  return NextResponse.json(page);
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!canManageInternalDocs(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const existing = await prisma.docPage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.docPage.delete({ where: { id } });

  await logAudit(user.email, "internal-doc.delete", "DocPage", id, {
    title: existing.title,
    category: existing.category,
  });

  return NextResponse.json({ ok: true });
}
