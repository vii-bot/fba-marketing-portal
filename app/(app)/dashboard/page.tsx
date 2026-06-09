import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { LayoutDashboard, BookOpen, AlertTriangle, Clock, ShieldCheck, Users, CalendarCheck, BarChart2, GraduationCap } from "lucide-react";
import DashboardSearch from "@/components/ui/DashboardSearch";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session!.user;
  const isAdmin = user.role === "admin";

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
            <p className="text-xs text-slate-400">OT, leave, offset requests</p>
          </Link>
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

async function buildAuditLog() {
  const [recentStrikes, recentRequests, recentEmployees, recentAppeals] = await Promise.all([
    prisma.strike.findMany({ orderBy: { createdAt: "desc" }, take: 3, select: { name: true, level: true, type: true, createdAt: true } }),
    prisma.attendanceRequest.findMany({ where: { status: { not: "Pending" } }, orderBy: { updatedAt: "desc" }, take: 3, select: { name: true, type: true, status: true, updatedAt: true } }),
    prisma.employee.findMany({ orderBy: { createdAt: "desc" }, take: 2, select: { name: true, role: true, createdAt: true } }),
    prisma.appeal.findMany({ where: { status: { not: "Pending" } }, orderBy: { updatedAt: "desc" }, take: 2, select: { email: true, status: true, updatedAt: true } }),
  ]);

  const items: { label: string; date: string; color: string }[] = [
    ...recentStrikes.map(s => ({ label: `Strike issued — ${s.name} (${s.level})`, date: s.createdAt.toISOString(), color: "bg-rose-400" })),
    ...recentRequests.map(r => ({ label: `${r.type} request ${r.status.toLowerCase()} — ${r.name}`, date: r.updatedAt.toISOString(), color: r.status === "Approved" ? "bg-emerald-400" : "bg-amber-400" })),
    ...recentEmployees.map(e => ({ label: `Employee added — ${e.name} (${e.role})`, date: e.createdAt.toISOString(), color: "bg-indigo-400" })),
    ...recentAppeals.map(a => ({ label: `Appeal ${a.status.toLowerCase()} — ${a.email}`, date: a.updatedAt.toISOString(), color: a.status === "Approved" ? "bg-emerald-400" : "bg-slate-400" })),
  ];

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
}
