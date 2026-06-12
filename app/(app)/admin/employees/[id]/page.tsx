import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isDepartmentManager, canViewSOP } from "@/lib/permissions";
import { getSOPDeadline } from "@/lib/sop-deadlines";
import {
  formatDate, SCHEDULE_SHIFTS, LMS_TIERS, TIER_COLORS, type LmsTier,
} from "@/lib/utils";
import { getEmployeeStatus } from "@/lib/employee-status";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const ATTENDANCE_TYPE_COLOR: Record<string, string> = {
  OT: "text-indigo-400", WeekendOT: "text-sky-400", DayOff: "text-emerald-400", Leave: "text-amber-400", Offset: "text-purple-400",
};

function calcTierProgress(
  tier: LmsTier,
  sops: { id: string; tier: string; isRequired: boolean }[],
  sopAcks: Set<string>
): number {
  const tierSops = sops.filter(s => s.tier === tier && s.isRequired);
  const total    = tierSops.length;
  if (total === 0) return 100;
  const done = tierSops.filter(s => sopAcks.has(s.id)).length;
  return Math.round((done / total) * 100);
}

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const viewer = session.user as any;
  if (!isAdmin(viewer) && !isDepartmentManager(viewer)) redirect("/dashboard");

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: { select: { profileComplete: true } },
      inviteToken: { select: { expiresAt: true, usedAt: true } },
    },
  });
  if (!employee) notFound();

  if (!isAdmin(viewer) && viewer.department !== employee.department) {
    redirect("/admin/employees");
  }

  const [creators, attendanceRequests, sopAckList, allSops, exemptions, strikes] = await Promise.all([
    prisma.creator.findMany({
      where: { assignedPageRunners: { has: employee.email } },
      select: { id: true, creatorCode: true, creatorName: true, status: true, priority: true },
      orderBy: { creatorName: "asc" },
    }),
    prisma.attendanceRequest.findMany({
      where: { email: employee.email },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.sOPAcknowledgement.findMany({ where: { email: employee.email } }),
    prisma.sOP.findMany({ where: { isArchived: false } }),
    prisma.sOPExemption.findMany({ where: { email: employee.email } }),
    isAdmin(viewer)
      ? prisma.strike.findMany({
          where: { OR: [{ employeeId: employee.id }, { email: employee.email }] },
          orderBy: { incidentDate: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // SOP/course progress, scoped to the target employee's role + department
  const empPerm = { role: employee.role, department: employee.department, email: employee.email };
  const sops = allSops.filter(s => canViewSOP(empPerm, s));
  const sopAcks = new Set(
    sopAckList
      .filter(a => { const sop = sops.find(s => s.id === a.sopId); return sop && a.version === sop.version; })
      .map(a => a.sopId)
  );
  const allReqSops = sops.filter(s => s.isRequired);
  const overallPct = allReqSops.length > 0
    ? Math.round((allReqSops.filter(s => sopAcks.has(s.id)).length / allReqSops.length) * 100)
    : 0;
  const tierProgress = Object.fromEntries(
    LMS_TIERS.map(tier => [tier, calcTierProgress(tier, sops, sopAcks)])
  ) as Record<LmsTier, number>;

  // Overdue SOP/course acknowledgement deadlines (bugs.md Phase 3)
  const exemptSet = new Set(exemptions.map(e => e.sopId));
  const overdueSops = sops
    .map(sop => ({ sop, ...getSOPDeadline(sop, employee.createdAt, sopAcks.has(sop.id), exemptSet.has(sop.id)) }))
    .filter(d => d.isOverdue);

  const schedule = employee.schedule as Record<string, string> | null;
  const loginStatus = getEmployeeStatus(employee);

  const otHours = attendanceRequests
    .filter(r => (r.type === "OT" || r.type === "WeekendOT") && r.status === "Approved")
    .reduce((sum, r) => sum + (r.hours ?? 0), 0);
  const pendingCount = attendanceRequests.filter(r => r.status === "Pending").length;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="module-header rounded-2xl p-8 mb-6">
        <Link href="/admin/employees" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition mb-4">
          <ArrowLeft size={13} /> Back to Employee Database
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Employee Profile</p>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>{employee.name}</h2>
            <p className="text-sm text-slate-400 opacity-70">{employee.role} · {employee.department}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge label={employee.status} />
            <Badge label={loginStatus} />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          {/* SOP / Course Progress */}
          <div className="card rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-200 text-sm">SOP / Course Progress</h4>
              <span className="text-xl font-bold text-indigo-300">{overallPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden mb-4">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${overallPct}%` }} />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {LMS_TIERS.map(tier => (
                <div key={tier} className="text-center">
                  <p className={`text-xs uppercase tracking-widest mb-0.5 ${TIER_COLORS[tier]}`}>{tier}</p>
                  <p className="text-lg font-bold text-slate-200">{tierProgress[tier]}%</p>
                </div>
              ))}
            </div>

            {overdueSops.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700/40">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 mb-2">
                  <AlertTriangle size={12} /> Overdue acknowledgements
                </p>
                <div className="space-y-1.5">
                  {overdueSops.map(({ sop, deadline }) => (
                    <div key={sop.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-slate-300 truncate">{sop.title}</span>
                      <span className="text-xs text-rose-400 shrink-0">Due {formatDate(deadline!)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          {schedule && Object.keys(schedule).length > 0 && (
            <div className="card rounded-xl p-6">
              <h4 className="font-semibold text-slate-200 text-sm mb-4">Schedule</h4>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS.map(d => {
                  const code = schedule[d];
                  const shift = SCHEDULE_SHIFTS.find(s => s.code === code);
                  return (
                    <div key={d} className="bg-slate-800/40 rounded-lg py-3 px-1">
                      <p className="text-xs text-slate-500 mb-1">{d}</p>
                      <p className={`text-xs font-semibold ${shift?.color ?? "text-slate-600"}`}>{code ?? "OFF"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attendance / OT / Leave */}
          <div className="card rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h4 className="font-semibold text-slate-200 text-sm">Attendance, OT & Leave</h4>
              <div className="flex gap-4 text-xs text-slate-400">
                <span><span className="font-bold text-slate-200">{otHours}h</span> OT approved</span>
                <span><span className="font-bold text-amber-400">{pendingCount}</span> pending</span>
              </div>
            </div>
            {attendanceRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No attendance requests on record.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Type</th><th>Date</th><th>Hours</th><th>Status</th><th>Reason</th></tr></thead>
                  <tbody>
                    {attendanceRequests.map(r => (
                      <tr key={r.id}>
                        <td><span className={`text-xs font-semibold ${ATTENDANCE_TYPE_COLOR[r.type] ?? "text-slate-400"}`}>{r.type}</span></td>
                        <td>{formatDate(r.date)}</td>
                        <td>{r.hours ? `${r.hours}h` : "—"}</td>
                        <td><Badge label={r.status} /></td>
                        <td className="text-xs text-slate-400 max-w-xs truncate">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Strikes — admin/executive only */}
          {isAdmin(viewer) && (
            <div className="card rounded-xl p-6">
              <h4 className="font-semibold text-slate-200 text-sm mb-4">Strikes</h4>
              {strikes.length === 0 ? (
                <p className="text-sm text-slate-500">No strikes on record.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>ID</th><th>Type</th><th>Level</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>
                      {strikes.map(s => (
                        <tr key={s.id}>
                          <td className="font-mono text-xs text-slate-500">{s.strikeCode}</td>
                          <td><Badge label={s.type} /></td>
                          <td><Badge label={s.level} /></td>
                          <td>{formatDate(s.incidentDate)}</td>
                          <td><Badge label={s.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="card rounded-xl p-5">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-widest mb-4">Basic Info</h4>
            <div className="space-y-3 text-sm">
              {[
                { label: "Email",      value: employee.email },
                { label: "Discord",    value: employee.discordUsername || "—" },
                { label: "Start Date", value: employee.startDate ? formatDate(employee.startDate) : "—" },
              ].map(row => (
                <div key={row.label}>
                  <p className="text-xs text-slate-500">{row.label}</p>
                  <p className="text-slate-300 font-medium mt-0.5">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Creators */}
          <div className="card rounded-xl p-5">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-widest mb-4">Assigned Creators</h4>
            {creators.length === 0 ? (
              <p className="text-sm text-slate-500">No creators assigned.</p>
            ) : (
              <div className="space-y-2">
                {creators.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0">
                      <p className="text-slate-300 font-medium truncate">{c.creatorName}</p>
                      <p className="text-xs text-slate-500">{c.creatorCode}</p>
                    </div>
                    <Badge label={c.status} className="shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {employee.notes && (
            <div className="card rounded-xl p-5">
              <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-widest mb-3">Notes</h4>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{employee.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
