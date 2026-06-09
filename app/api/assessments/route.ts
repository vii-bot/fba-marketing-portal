import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageLMS } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id       = searchParams.get("id");
  const email    = searchParams.get("email") ?? session.user.email;

  if (id) {
    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        questions: true,
        attempts: { where: { email }, orderBy: { completedAt: "desc" }, take: 5 },
      },
    });
    return NextResponse.json(assessment);
  }

  const assessments = await prisma.assessment.findMany({
    include: { attempts: { where: { email } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assessments);
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const body = await req.json();

  // Submit an attempt
  if (body.action === "submit") {
    const { assessmentId, answers } = body;

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { questions: true },
    });
    if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let correct = 0;
    for (const q of assessment.questions) {
      if (q.type === "ShortAnswer") continue; // short answers are manually graded
      const userAnswer = answers[q.id];
      if (userAnswer === q.correctAnswer) correct++;
    }

    const gradeable = assessment.questions.filter(q => q.type !== "ShortAnswer").length;
    const score = gradeable > 0 ? Math.round((correct / gradeable) * 100) : 0;
    const passed = score >= assessment.passingScore;

    const attempt = await prisma.assessmentAttempt.create({
      data: { assessmentId, email: user.email, answers, score, passed },
    });

    if (passed) {
      await prisma.notification.create({
        data: {
          email:   user.email,
          type:    "CertificationEarned",
          message: `You passed "${assessment.title}" with ${score}%!`,
          href:    "/resource-portal",
        },
      });
    }

    await prisma.auditLog.create({
      data: { actor: user.email, action: "assessment.submit", entityType: "Assessment", entityId: assessmentId, metadata: { score, passed } },
    });

    return NextResponse.json({ score, passed, attempt });
  }

  // Create assessment (admin only)
  if (!canManageLMS(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { sopId, moduleId, title, tier, passingScore, questions } = body;

  const assessment = await prisma.assessment.create({
    data: {
      sopId:        sopId ?? undefined,
      moduleId:     moduleId ?? undefined,
      title,
      tier,
      passingScore: passingScore ?? 70,
      questions: {
        create: (questions ?? []).map((q: any) => ({
          type:          q.type,
          text:          q.text,
          options:       q.options ?? null,
          correctAnswer: q.correctAnswer ?? null,
        })),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(assessment, { status: 201 });
}
