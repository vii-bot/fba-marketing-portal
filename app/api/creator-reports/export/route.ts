import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { canManageCreatorReports, type PermUser } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Logs a Creator Reports export (bugs.md Phase 10 audit requirement). The
// CSV itself is generated client-side from the already-fetched/filtered
// report list — this endpoint just records who exported what.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any as PermUser;

  if (!canManageCreatorReports(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { filters, count, format } = await req.json();

  await logAudit(user.email, "creator-report.export", "CreatorReport", undefined, {
    filters, count, format: format ?? "CSV",
  });

  return NextResponse.json({ success: true });
}
