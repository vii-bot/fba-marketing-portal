import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateId, getQuarter, getWeekRange } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

interface CreatorAccount { platform: string; accountType: string; username: string; url: string }

// Page Runners must submit a "Creator Report" Mon-Wed each week. Returns the
// most recently *completed* Mon-Wed window: this week's if today is Thu-Sun,
// otherwise last week's (since this week's window isn't over yet).
function getCompletedMonWedWindow(now: Date = new Date()): { weekStart: Date; windowEnd: Date } {
  const { start: thisWeekStart } = getWeekRange(now);
  const day = now.getDay(); // 0 = Sunday
  const weekStart = new Date(thisWeekStart);
  if (day >= 1 && day <= 3) weekStart.setDate(weekStart.getDate() - 7); // Mon-Wed: use last week
  const windowEnd = new Date(weekStart);
  windowEnd.setDate(windowEnd.getDate() + 3); // Thursday 00:00 (exclusive)
  return { weekStart, windowEnd };
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { weekStart, windowEnd } = getCompletedMonWedWindow();

  const [creators, reports] = await Promise.all([
    prisma.creator.findMany({ where: { archived: false } }),
    prisma.creatorReport.findMany({
      where: { reportType: "Creator Report", submittedAt: { gte: weekStart, lt: windowEnd } },
      select: { creatorId: true, accountUsername: true },
    }),
  ]);
  const reportedSet = new Set(reports.map(r => `${r.creatorId}::${r.accountUsername}`));

  let checked = 0, strikesIssued = 0, alreadyLogged = 0;

  for (const creator of creators) {
    const accounts: CreatorAccount[] = Array.isArray(creator.accounts) ? (creator.accounts as unknown as CreatorAccount[]) : [];
    for (const account of accounts) {
      checked++;
      if (reportedSet.has(`${creator.id}::${account.username}`)) continue;

      const existingLog = await prisma.complianceStrikeLog.findUnique({
        where: { creatorId_accountUsername_weekStart: { creatorId: creator.id, accountUsername: account.username, weekStart } },
      });
      if (existingLog) { alreadyLogged++; continue; }

      let strikeId: string | null = null;
      for (const email of creator.assignedPageRunners) {
        const employee = await prisma.employee.findUnique({ where: { email } });
        if (!employee) continue;

        const incidentDate = new Date(weekStart);
        const strike = await prisma.strike.create({
          data: {
            strikeCode:   generateId("STK"),
            name:         employee.name,
            email:        employee.email.toLowerCase(),
            role:         employee.role,
            department:   employee.department,
            type:         "Compliance",
            level:        "First Warning",
            incidentDate,
            submitter:    session.user.email,
            reason:       `Missed mandatory weekly Creator Report for ${creator.creatorName} (@${account.username}) — due Mon-Wed of the week starting ${weekStart.toLocaleDateString()}.`,
            status:       "Active",
            quarter:      getQuarter(incidentDate),
            year:         incidentDate.getFullYear(),
            employeeId:   employee.id,
          },
        });
        strikeId = strike.id;
        strikesIssued++;

        await logAudit(session.user.email, "strike.create", "Strike", strike.id, {
          name: strike.name, type: strike.type, level: strike.level, reason: "weekly-creator-report-compliance",
        });
      }

      await prisma.complianceStrikeLog.create({
        data: { creatorId: creator.id, accountUsername: account.username, weekStart, strikeId },
      });
    }
  }

  await logAudit(session.user.email, "creator-report.compliance-check", "CreatorReport", undefined, {
    weekStart: weekStart.toISOString(), checked, strikesIssued, alreadyLogged,
  });

  return NextResponse.json({ checked, strikesIssued, alreadyLogged, weekStart: weekStart.toISOString() });
}
