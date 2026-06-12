import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageSOP } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id         = searchParams.get("id") ?? undefined;
  const tier       = searchParams.get("tier") ?? undefined;
  const dept       = searchParams.get("department") ?? undefined;
  const archived   = searchParams.get("archived") === "true";

  const user = session.user as any;

  const sops = await prisma.sOP.findMany({
    where: {
      ...(id ? { id } : { isArchived: archived }),
      ...(tier ? { tier } : {}),
      // filter by dept if not executive
      ...(dept ? { department: dept } : {}),
    },
    include: { acknowledgements: { where: { email: user.email } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sops);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  // Clone an existing SOP — always lands as a Draft for review before publishing
  if (body.duplicateOf) {
    const source = await prisma.sOP.findUnique({ where: { id: body.duplicateOf } });
    if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canManageSOP(user, source.department)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clone = await prisma.sOP.create({
      data: {
        title:            `${source.title} (Copy)`,
        category:         source.category,
        content:          source.content,
        contentType:      source.contentType,
        tier:             source.tier,
        version:          1,
        isRequired:       source.isRequired,
        department:       source.department,
        roles:            source.roles,
        status:           "Draft",
        blocks:           source.blocks ?? undefined,
        estimatedMinutes: source.estimatedMinutes,
        deadlineType:     source.deadlineType,
        deadlineDate:     source.deadlineDate,
        deadlineDays:     source.deadlineDays,
        deadlineBasis:    source.deadlineBasis,
        createdBy:        user.email,
      },
    });

    await prisma.auditLog.create({
      data: { actor: user.email, action: "sop.duplicate", entityType: "SOP", entityId: clone.id, metadata: { sourceId: source.id, title: clone.title } },
    });

    return NextResponse.json(clone, { status: 201 });
  }

  if (!canManageSOP(user, body.department ?? "All Departments")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sop = await prisma.sOP.create({
    data: {
      title:            body.title,
      category:         body.category ?? "General",
      content:          body.content ?? "",
      contentType:      body.contentType ?? "SOP",
      tier:             body.tier,
      version:          1,
      isRequired:       body.isRequired ?? true,
      department:       body.department ?? "All Departments",
      roles:            Array.isArray(body.roles) ? body.roles : [],
      status:           body.status ?? "Published",
      blocks:           body.blocks ?? undefined,
      estimatedMinutes: body.estimatedMinutes ?? null,
      deadlineType:     body.deadlineType ?? "None",
      deadlineDate:     body.deadlineType === "Fixed" ? (body.deadlineDate ?? null) : null,
      deadlineDays:     body.deadlineType === "Relative" ? (body.deadlineDays ?? null) : null,
      deadlineBasis:    body.deadlineType === "Relative" ? (body.deadlineBasis ?? "Publish") : null,
      createdBy:        user.email,
    },
  });

  // Notify all users in this department — only for content that's actually live
  if (sop.status === "Published") {
    await notifyNewSOP(sop.id, sop.title, sop.department);
  }

  await prisma.auditLog.create({
    data: { actor: user.email, action: "sop.create", entityType: "SOP", entityId: sop.id, metadata: { title: sop.title } },
  });

  return NextResponse.json(sop, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { id, bumpVersion, ...data } = await req.json();

  const existing = await prisma.sOP.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManageSOP(user, existing.department)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newVersion = bumpVersion ? existing.version + 1 : existing.version;

  const sop = await prisma.sOP.update({
    where: { id },
    data: { ...data, version: newVersion, updatedAt: new Date() },
  });

  if (bumpVersion) {
    // Notify users that SOP was updated and they need to re-acknowledge
    await notifySOPUpdated(sop.id, sop.title, sop.department);
  } else if (existing.status !== "Published" && sop.status === "Published") {
    // Newly published — let the department know it's available
    await notifyNewSOP(sop.id, sop.title, sop.department);
  }

  // Track deadline-rule changes separately for the audit trail (bugs.md Phase 3)
  const DEADLINE_FIELDS = ["deadlineType", "deadlineDate", "deadlineDays", "deadlineBasis"] as const;
  const deadlineChange: Record<string, { from: any; to: any }> = {};
  for (const f of DEADLINE_FIELDS) {
    if (f in data && JSON.stringify((existing as any)[f]) !== JSON.stringify((sop as any)[f])) {
      deadlineChange[f] = { from: (existing as any)[f], to: (sop as any)[f] };
    }
  }

  await prisma.auditLog.create({
    data: {
      actor: user.email, action: "sop.update", entityType: "SOP", entityId: sop.id,
      metadata: {
        title: sop.title, bumpVersion, status: sop.status,
        ...(Object.keys(deadlineChange).length > 0 && { deadlineChange }),
      },
    },
  });

  return NextResponse.json(sop);
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { id } = await req.json();

  const existing = await prisma.sOP.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManageSOP(user, existing.department)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.sOP.update({ where: { id }, data: { isArchived: true } });
  return NextResponse.json({ success: true });
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function notifyNewSOP(sopId: string, title: string, department: string) {
  const employees = await prisma.employee.findMany({
    where: department === "All Departments" ? {} : { department },
    select: { email: true },
  });
  if (employees.length === 0) return;
  await prisma.notification.createMany({
    data: employees.map(e => ({
      email:   e.email,
      type:    "NewSOP",
      message: `New SOP added: "${title}" — acknowledgement required`,
      href:    `/resource-portal?sop=${sopId}`,
    })),
    skipDuplicates: true,
  });
}

async function notifySOPUpdated(sopId: string, title: string, department: string) {
  const employees = await prisma.employee.findMany({
    where: department === "All Departments" ? {} : { department },
    select: { email: true },
  });
  if (employees.length === 0) return;
  await prisma.notification.createMany({
    data: employees.map(e => ({
      email:   e.email,
      type:    "SOPUpdated",
      message: `SOP updated: "${title}" — re-acknowledgement required`,
      href:    `/resource-portal?sop=${sopId}`,
    })),
    skipDuplicates: true,
  });
}
