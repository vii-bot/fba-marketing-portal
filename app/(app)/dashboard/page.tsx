import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { canManageContractors, canManageCreatorReports, canAccessInternalDocs } from "@/lib/permissions";
import Link from "next/link";
import { LayoutDashboard, BookOpen, AlertTriangle, Clock, ShieldCheck, Users, CalendarCheck, BarChart2, GraduationCap, Inbox, FileText, Briefcase, ListTodo, Library } from "lucide-react";
import DashboardSearch from "@/components/ui/DashboardSearch";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session!.user;
  const isAdmin = user.role === "admin";
  const canAccessContractorRequests = canManageContractors(user as any);
  const canAccessCreatorReports = canManageCreatorReports(user as any);
  const canAccessDocs = canAccessInternalDocs(user as any);

  const [activeStrikes, pendingRequests, recentProgress] = await Promise.all([
    prisma.strike.count({ where: { email: { equals: user.email, mode: "insensitive" }, status: "Active" } }),
    prisma.attendanceRequest.count({ where: { email: { equals: user.email, mode: "insensitive" }, status: "Pending" } }),
    prisma.learningProgress.findMany({ where: { email: user.email }, orderBy: { completedAt: "desc" }, take: 5 }),
  ]);

  const adminStats = isAdmin
    ? await Promise.all([
        prisma.strike.count({ where: { status: "Active" } }),
        prisma.strike.count({ where: { status: "Appealed" } }),
        prisma.attendanceRequest.count({ where: { status: "Pending" } }),
        prisma.employee.count({ where: { status: "Active" } }),
      ])
    : null;

  // Audit log: last 8 admin actions across key models
  const auditItems = isAdmin ? await buildAuditLog() : [];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-8">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Dashboard</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>
          Welcome back, {user.name?.split(" ")[0]}!
        </h2>
        <p className="text-sm text-slate-400 opacity-70 capitalize">
          {user.role?.replace("-", " ")} · {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Search */}
      <DashboardSearch isAdmin={isAdmin} />

      {/* Admin stats */}
      {isAdmin && adminStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Strikes",   value: adminStats[0], color: "text-rose-400" },
            { label: "Pending Appeals",  value: adminStats[1], color: "text-amber-400" },
            { label: "Pending Requests", value: adminStats[2], color: "text-sky-400" },
            { label: "Active Employees", value: adminStats[3], color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <p className="text-xs text-slate-500 uppercase mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Personal stats */}
      {!isAdmin && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">My Active Strikes</p>
            <p className={`text-3xl font-bold ${activeStrikes > 0 ? "text-rose-400" : "text-emerald-400"}`}>{activeStrikes}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">Pending Requests</p>
            <p className={`text-3xl font-bold ${pendingRequests > 0 ? "text-amber-400" : "text-slate-300"}`}>{pendingRequests}</p>
          </div>
        </div>
      )}

      {/* Quick actions — different for admin vs employee */}
      {isAdmin ? (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Link href="/admin" className="card rounded-xl p-5 hover:border-indigo-400 transition block">
            <ShieldCheck size={20} className="text-indigo-400 mb-2" />
            <p className="font-semibold text-indigo-300 text-sm mb-1">Admin Dashboard</p>
            <p className="text-xs text-slate-400">Strike system, attendance, HR, and settings</p>
          </Link>
          <Link href="/admin/lms" className="card rounded-xl p-5 hover:border-indigo-400 transition block">
            <GraduationCap size={20} className="text-indigo-400 mb-2" />
            <p className="font-semibold text-indigo-300 text-sm mb-1">LMS Dashboard</p>
            <p className="text-xs text-slate-400">Manage SOPs and track employee progress</p>
          </Link>
          <Link href="/admin/strikes" className="card rounded-xl p-5 hover:border-rose-400 transition block">
            <BarChart2 size={20} className="text-rose-400 mb-2" />
            <p className="font-semibold text-rose-300 text-sm mb-1">Strike Dashboard</p>
            <p className="text-xs text-slate-400">Overview of all strikes this quarter</p>
          </Link>
          <Link href="/admin/attendance" className="card rounded-xl p-5 hover:border-sky-400 transition block">
            <CalendarCheck size={20} className="text-sky-400 mb-2" />
            <p className="font-semibold text-sky-300 text-sm mb-1">Attendance</p>
            <p className="text-xs text-slate-400">Review and approve requests</p>
          </Link>
          <Link href="/admin/attendance/summary" className="card rounded-xl p-5 hover:border-indigo-400 transition block">
            <Clock size={20} className="text-indigo-400 mb-2" />
            <p className="font-semibold text-indigo-300 text-sm mb-1">OT Requests</p>
            <p className="text-xs text-slate-400">Payroll summary and OT overview</p>
          </Link>
          <Link href="/admin/employees" className="card rounded-xl p-5 hover:border-emerald-400 transition block">
            <Users size={20} className="text-emerald-400 mb-2" />
            <p className="font-semibold text-emerald-300 text-sm mb-1">Employee DB</p>
            <p className="text-xs text-slate-400">Manage team and schedules</p>
          </Link>
          <Link href="/admin/requests" className="card rounded-xl p-5 hover:border-purple-400 transition block">
            <Inbox size={20} className="text-purple-400 mb-2" />
            <p className="font-semibold text-purple-300 text-sm mb-1">Employee Requests</p>
            <p className="text-xs text-slate-400">Review COE and other employee requests</p>
          </Link>
          <Link href="/admin/contractor-requests" className="card rounded-xl p-5 hover:border-amber-400 transition block">
            <Briefcase size={20} className="text-amber-400 mb-2" />
            <p className="font-semibold text-amber-300 text-sm mb-1">Contractor Requests</p>
            <p className="text-xs text-slate-400">Review terminations, transfers, and hires</p>
          </Link>
          <Link href="/admin/tasks" className="card rounded-xl p-5 hover:border-sky-400 transition block">
            <ListTodo size={20} className="text-sky-400 mb-2" />
            <p className="font-semibold text-sky-300 text-sm mb-1">Taskboard</p>
            <p className="text-xs text-slate-400">Review daily tasks and time spent per employee</p>
          </Link>
          <Link href="/admin/creator-reports" className="card rounded-xl p-5 hover:border-teal-400 transition block">
            <FileText size={20} className="text-teal-400 mb-2" />
            <p className="font-semibold text-teal-300 text-sm mb-1">Creator Reports</p>
            <p className="text-xs text-slate-400">Review weekly creator/account reports</p>
          </Link>
          <Link href="/admin/internal-docs" className="card rounded-xl p-5 hover:border-violet-400 transition block">
            <Library size={20} className="text-violet-400 mb-2" />
            <p className="font-semibold text-violet-300 text-sm mb-1">Internal Documentation</p>
            <p className="text-xs text-slate-400">App architecture, workflows, and dev notes</p>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Link href="/resource-portal" className="card rounded-xl p-5 hover:border-indigo-400 transition block">
            <BookOpen size={20} className="text-indigo-400 mb-2" />
            <p className="font-semibold text-indigo-300 text-sm mb-1">Resource Portal</p>
            <p className="text-xs text-slate-400">Training modules and learning path</p>
          </Link>
          <Link href="/my-strikes" className="card rounded-xl p-5 hover:border-rose-400 transition block">
            <AlertTriangle size={20} className="text-rose-400 mb-2" />
            <p className="font-semibold text-rose-300 text-sm mb-1">My Strike Record</p>
            <p className="text-xs text-slate-400">View your active and historical strikes</p>
          </Link>
          <Link href="/attendance" className="card rounded-xl p-5 hover:border-emerald-400 transition block">
            <Clock size={20} className="text-emerald-400 mb-2" />
            <p className="font-semibold text-emerald-300 text-sm mb-1">Submit a Request</p>
            <p className="text-xs text-slate-400">OT, Weekend OT, and leave requests</p>
          </Link>
          <Link href="/requests" className="card rounded-xl p-5 hover:border-purple-400 transition block">
            <FileText size={20} className="text-purple-400 mb-2" />
            <p className="font-semibold text-purple-300 text-sm mb-1">My Requests</p>
            <p className="text-xs text-slate-400">COE and other employee requests</p>
          </Link>
          <Link href="/tasks" className="card rounded-xl p-5 hover:border-sky-400 transition block">
            <ListTodo size={20} className="text-sky-400 mb-2" />
            <p className="font-semibold text-sky-300 text-sm mb-1">My Taskboard</p>
            <p className="text-xs text-slate-400">Log tasks and track time spent</p>
          </Link>
          <Link href="/my-creators/reports" className="card rounded-xl p-5 hover:border-teal-400 transition block">
            <FileText size={20} className="text-teal-400 mb-2" />
            <p className="font-semibold text-teal-300 text-sm mb-1">Creator Reports</p>
            <p className="text-xs text-slate-400">Submit weekly account reports</p>
          </Link>
          {canAccessContractorRequests && (
            <Link href="/admin/contractor-requests" className="card rounded-xl p-5 hover:border-amber-400 transition block">
              <Briefcase size={20} className="text-amber-400 mb-2" />
              <p className="font-semibold text-amber-300 text-sm mb-1">Contractor Requests</p>
              <p className="text-xs text-slate-400">Review terminations, transfers, and hires</p>
            </Link>
          )}
          {canAccessCreatorReports && (
            <Link href="/admin/creator-reports" className="card rounded-xl p-5 hover:border-teal-400 transition block">
              <BarChart2 size={20} className="text-teal-400 mb-2" />
              <p className="font-semibold text-teal-300 text-sm mb-1">Creator Reports Admin</p>
              <p className="text-xs text-slate-400">Review and export team reports</p>
            </Link>
          )}
          {canAccessDocs && (
            <Link href="/admin/internal-docs" className="card rounded-xl p-5 hover:border-violet-400 transition block">
              <Library size={20} className="text-violet-400 mb-2" />
              <p className="font-semibold text-violet-300 text-sm mb-1">Internal Documentation</p>
              <p className="text-xs text-slate-400">App architecture, workflows, and dev notes</p>
            </Link>
          )}
        </div>
      )}

      {/* Audit Logs (admin) */}
      {isAdmin && (
        <div className="card rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-200 text-sm">Audit Logs</h4>
            <Link href="/admin" className="text-xs text-indigo-400 hover:text-indigo-300 transition">Admin Dashboard →</Link>
          </div>
          {auditItems.length === 0 ? (
            <p className="text-sm text-slate-500">No recent changes.</p>
          ) : (
            <div className="space-y-2">
              {auditItems.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-4 text-sm py-1.5 border-b border-slate-700/30 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${item.color}`} />
                    <span className="text-slate-300 truncate">{item.label}</span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{formatDate(item.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent learning (non-admin) */}
      {!isAdmin && recentProgress.length > 0 && (
        <div className="card rounded-xl p-6">
          <h4 className="font-semibold text-slate-200 text-sm mb-4">Recent Learning Activity</h4>
          <div className="space-y-2">
            {recentProgress.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-300 capitalize">{p.pageId.replace(/-/g, " ")}</span>
                <span className="text-xs text-slate-500">{formatDate(p.completedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Human-readable label per audit action. Falls back to "<actor> — <action>"
// for any action not listed here (keeps this future-proof as new actions
// are added without needing to touch the dashboard).
const AUDIT_LABELS: Record<string, (l: { actor: string; metadata: any }) => string> = {
  "employee.create":   (l) => `Employee added — ${l.metadata?.name ?? ""} (${l.metadata?.role ?? ""})`,
  "employee.update":   (l) => `Employee updated — ${l.metadata?.name ?? ""}`,
  "employee.delete":   (l) => `Employee removed — ${l.metadata?.name ?? l.metadata?.email ?? ""}`,
  "strike.create":     (l) => `Strike issued — ${l.metadata?.name ?? ""} (${l.metadata?.level ?? ""})`,
  "strike.update":     (l) => `Strike updated — ${l.metadata?.name ?? ""}`,
  "strike.delete":     (l) => `Strike deleted — ${l.metadata?.name ?? ""}`,
  "appeal.review":     (l) => `Appeal ${String(l.metadata?.status ?? "").toLowerCase()} — ${l.metadata?.email ?? ""}`,
  "attendance.review": (l) => `${l.metadata?.type ?? "Request"} request ${String(l.metadata?.status ?? "").toLowerCase()} — ${l.metadata?.name ?? ""}`,
  "admin.clear":       (l) => `Database cleared (${l.metadata?.action ?? ""}) — ${l.actor}`,
  "sop.create":        (l) => `SOP created — ${l.metadata?.title ?? ""}`,
  "sop.update":        (l) => `SOP updated — ${l.metadata?.title ?? ""}`,
  "sop.duplicate":     (l) => `SOP duplicated — ${l.metadata?.title ?? ""}`,
  "sop.acknowledge":   (l) => `SOP acknowledged — ${l.actor}`,
  "module.acknowledge":(l) => `Module acknowledged — ${l.actor}`,
  "assessment.submit": (l) => `Assessment submitted — ${l.actor} (${l.metadata?.passed ? "Passed" : "Failed"})`,
  "profile.update":    (l) => `Profile updated — ${l.actor}`,
  "invite.create":     (l) => `Invite sent — ${l.metadata?.invitedEmail ?? ""}`,
  "request.create":    (l) => `${l.metadata?.type ?? "Request"} request submitted — ${l.metadata?.name ?? ""}`,
  "request.review":    (l) => `${l.metadata?.type ?? "Request"} request ${String(l.metadata?.status ?? "").toLowerCase()} — ${l.metadata?.name ?? ""}`,
  "contractor-request.create": (l) => `Contractor ${l.metadata?.requestType ?? "change"} request submitted — ${l.metadata?.contractorName ?? l.metadata?.department ?? ""}`,
  "contractor-request.review": (l) => `Contractor ${l.metadata?.requestType ?? "change"} request ${String(l.metadata?.status ?? "").toLowerCase()} — ${l.metadata?.contractorName ?? ""}`,
  "team-note.create":  (l) => `Team note added — ${l.metadata?.creatorName ?? ""}`,
  "team-note.update":  (l) => `Team note edited — ${l.metadata?.creatorName ?? ""}`,
  "team-note.delete":  (l) => `Team note deleted — ${l.metadata?.creatorName ?? ""}`,
  "creator-report.create": (l) => `${l.metadata?.reportType ?? "Report"} submitted — ${l.metadata?.creatorName ?? ""} (@${l.metadata?.accountUsername ?? ""})`,
  "creator-report.review": (l) => `Creator report ${String(l.metadata?.status ?? "").toLowerCase()} — ${l.metadata?.creatorName ?? ""} (@${l.metadata?.accountUsername ?? ""})`,
  "creator-report.export": (l) => `Creator reports exported — ${l.metadata?.count ?? 0} record(s) by ${l.actor}`,
  "internal-doc.create": (l) => `Internal doc created — ${l.metadata?.title ?? ""} (${l.metadata?.category ?? ""})`,
  "internal-doc.update": (l) => `Internal doc updated — ${l.metadata?.title ?? ""} (${l.metadata?.status ?? ""})`,
  "internal-doc.delete": (l) => `Internal doc deleted — ${l.metadata?.title ?? ""}`,
};

function auditColor(action: string, metadata: any): string {
  if (action.endsWith(".delete") || action === "admin.clear") return "bg-rose-400";
  if (action.endsWith(".create")) return "bg-indigo-400";
  if (action.endsWith(".review")) {
    if (metadata?.status === "Approved" || metadata?.status === "Completed") return "bg-emerald-400";
    if (metadata?.status === "Rejected") return "bg-rose-400";
    return "bg-amber-400";
  }
  return "bg-slate-400";
}

async function buildAuditLog() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 });

  return logs.map(l => {
    const metadata = (l.metadata as any) ?? {};
    const format = AUDIT_LABELS[l.action];
    return {
      label: format ? format({ actor: l.actor, metadata }) : `${l.actor} — ${l.action}`,
      date: l.createdAt.toISOString(),
      color: auditColor(l.action, metadata),
    };
  });
}
