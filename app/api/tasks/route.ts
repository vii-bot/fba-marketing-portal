import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { TASK_STATUSES } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const date       = searchParams.get("date") ?? "";
  const status     = searchParams.get("status") ?? "";
  const category   = searchParams.get("category") ?? "";
  const department = searchParams.get("department") ?? "";
  const email      = searchParams.get("email") ?? "";

  const admin = isAdmin(user);

  const tasks = await prisma.task.findMany({
    where: {
      ...(admin
        ? { ...(email && { email: { equals: email, mode: "insensitive" } }) }
        : { email: { equals: user.email, mode: "insensitive" } }),
      ...(date && { date: new Date(date) }),
      ...(status && { status }),
      ...(category && { category }),
      ...(admin && department && { department }),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const body = await req.json();

  if (!body.taskName || !body.category || !body.date) {
    return NextResponse.json({ error: "Task name, category, and date are required." }, { status: 400 });
  }

  const category = body.category === "Other" ? body.customCategory : body.category;
  if (!category) {
    return NextResponse.json({ error: "Please specify the task category." }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({ where: { email: user.email.toLowerCase() } });

  const task = await prisma.task.create({
    data: {
      email: user.email.toLowerCase(),
      name: employee?.name ?? user.name ?? user.email,
      department: employee?.department ?? "X",
      date: new Date(body.date),
      taskName: body.taskName,
      category,
      notes: body.notes ?? null,
      status: "Pending",
      employeeId: employee?.id ?? null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  const body = await req.json();

  const existing = await prisma.task.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.email.toLowerCase() !== user.email.toLowerCase() && !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};

  if (body.taskName !== undefined) data.taskName = body.taskName;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.category !== undefined) {
    data.category = body.category === "Other" ? body.customCategory : body.category;
  }

  if (body.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    data.status = body.status;
    const now = new Date();

    if (body.status === "In Progress" && !existing.startTime) {
      data.startTime = now;
    }

    if (body.status === "Finished") {
      const startTime = existing.startTime ?? now;
      const finishTime = existing.finishTime ?? now;
      if (!existing.startTime) data.startTime = startTime;
      data.finishTime = finishTime;
      data.totalMinutes = Math.round((finishTime.getTime() - startTime.getTime()) / 60000);
    }
  }

  const task = await prisma.task.update({ where: { id: body.id }, data });
  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.email.toLowerCase() !== user.email.toLowerCase() && !isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.status === "Finished" && !isAdmin(user)) {
    return NextResponse.json({ error: "Finished tasks can't be deleted." }, { status: 400 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
