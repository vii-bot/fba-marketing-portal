import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isDepartmentManager, canManageCreatorReports, type PermUser } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { REPORT_STATUSES } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any as PermUser;

  const { searchParams } = new URL(req.url);
  const creatorId       = searchParams.get("creatorId") ?? "";
  const accountUsername = searchParams.get("accountUsername") ?? "";
  const department      = searchParams.get("department") ?? "";
  const reportType      = searchParams.get("reportType") ?? "";
  const status          = searchParams.get("status") ?? "";
  const submittedBy     = searchParams.get("submittedBy") ?? "";
  const from            = searchParams.get("from") ?? "";
  const to              = searchParams.get("to") ?? "";

  const admin = isAdmin(user);
  const manager = isDepartmentManager(user);

  let scopeFilter: Prisma.CreatorReportWhereInput = {};
  if (!admin) {
    if (manager && user.role !== "Account Manager") {
      scopeFilter = { department: user.department ?? "__none__" };
    } else if (!manager) {
      const assigned = await prisma.creator.findMany({
        where: { assignedPageRunners: { has: user.email } },
        select: { id: true },
      });
      scopeFilter = {
        OR: [
          { creatorId: { in: assigned.map(c => c.id) } },
          { submittedBy: { equals: user.email, mode: "insensitive" } },
        ],
      };
    }
    // Account Managers (manager && role === "Account Manager") see everything, like admins.
  }

  const reports = await prisma.creatorReport.findMany({
    where: {
      ...scopeFilter,
      ...(creatorId && { creatorId }),
      ...(accountUsername && { accountUsername }),
      ...(department && { department }),
      ...(reportType && { reportType }),
      ...(status && { status }),
      ...(submittedBy && { submittedBy: { equals: submittedBy, mode: "insensitive" } }),
      ...((from || to) && {
        submittedAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
        },
      }),
    },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const body = await req.json();
  const { creatorId, accountUsername, department, reportType, followerCount, summary } = body;

  if (!creatorId || !accountUsername || !department || !reportType) {
    return NextResponse.json({ error: "Creator, account, department, and report type are required." }, { status: 400 });
  }

  const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
  if (!creator) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

  const status = body.status === "Draft" ? "Draft" : "Submitted";

  const report = await prisma.creatorReport.create({
    data: {
      creatorId,
      creatorCode: creator.creatorCode,
      creatorName: creator.creatorName,
      accountUsername,
      department,
      reportType,
      status,
      followerCount: followerCount === undefined || followerCount === null || followerCount === "" ? null : parseInt(followerCount) || 0,
      followerChange: body.followerChange || null,
      summary: summary || null,
      highlights: (body.highlights ?? []) as Prisma.InputJsonValue,
      metrics: (body.metrics ?? null) as Prisma.InputJsonValue,
      trafficNotes: body.trafficNotes || null,
      whatsWorking: body.whatsWorking || null,
      whatsNotWorking: body.whatsNotWorking || null,
      needsTesting: body.needsTesting || null,
      actionItems: body.actionItems || null,
      recommendedFocus: body.recommendedFocus || null,
      additionalNotes: body.additionalNotes || null,
      links: (body.links ?? []) as Prisma.InputJsonValue,
      submittedBy: user.email,
      submittedByName: user.name ?? user.email,
    },
  });

  if (status === "Submitted") {
    await logAudit(user.email, "creator-report.create", "CreatorReport", report.id, {
      creatorName: creator.creatorName,
      accountUsername,
      reportType,
      department,
    });
  }

  return NextResponse.json(report, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any as PermUser;

  const body = await req.json();
  const existing = await prisma.creatorReport.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = existing.submittedBy.toLowerCase() === user.email.toLowerCase();
  const isReviewer = canManageCreatorReports(user) &&
    (isAdmin(user) || user.role === "Account Manager" || existing.department === user.department);

  if (!isOwner && !isReviewer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};

  if (isOwner && ["Draft", "Needs Revision"].includes(existing.status)) {
    const editable = [
      "accountUsername", "followerCount", "followerChange", "summary", "trafficNotes",
      "whatsWorking", "whatsNotWorking", "needsTesting", "actionItems", "recommendedFocus", "additionalNotes",
    ] as const;
    for (const key of editable) {
      if (body[key] !== undefined) {
        data[key] = key === "followerCount"
          ? (body[key] === null || body[key] === "" ? null : parseInt(body[key]) || 0)
          : body[key];
      }
    }
    if (body.highlights !== undefined) data.highlights = body.highlights as Prisma.InputJsonValue;
    if (body.metrics !== undefined) data.metrics = body.metrics as Prisma.InputJsonValue;
    if (body.links !== undefined) data.links = body.links as Prisma.InputJsonValue;
    if (body.status === "Draft" || body.status === "Submitted") data.status = body.status;
  }

  let reviewChanged = false;
  if (isReviewer) {
    if (body.status !== undefined && REPORT_STATUSES.includes(body.status) && body.status !== data.status) {
      data.status = body.status;
      data.reviewedBy = user.email;
      data.reviewedAt = new Date();
      reviewChanged = true;
    }
    if (body.reviewerNotes !== undefined) { data.reviewerNotes = body.reviewerNotes; reviewChanged = true; }
    if (body.relayed !== undefined) { data.relayed = !!body.relayed; reviewChanged = true; }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const report = await prisma.creatorReport.update({ where: { id: body.id }, data });

  if (reviewChanged) {
    await logAudit(user.email, "creator-report.review", "CreatorReport", report.id, {
      creatorName: existing.creatorName,
      accountUsername: existing.accountUsername,
      status: report.status,
      relayed: report.relayed,
    });
  }

  return NextResponse.json(report);
}
