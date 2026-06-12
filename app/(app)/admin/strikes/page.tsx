import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";
import { formatDate, getQuarter } from "@/lib/utils";

export default async function StrikeDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "admin") redirect("/dashboard");

  const now = new Date();
  const currentQuarter = getQuarter(now);
  const currentYear    = now.getFullYear();

  const [allStrikes, appeals] = await Promise.all([
    prisma.strike.findMany({
      where: { year: currentYear, quarter: currentQuarter },
      include: { appeal: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.appeal.count({ where: { status: "Pending" } }),
  ]);

  const active    = allStrikes.filter(s => s.status === "Active").length;
  const pending   = allStrikes.filter(s => s.status === "Pending Review").length;
  const appealed  = allStrikes.filter(s => s.status === "Appealed").length;
  const resolved  = allStrikes.filter(s => s.status === "Resolved").length;
  const compliance = allStrikes.filter(s => s.type === "Compliance").length;
  const attendance = allStrikes.filter(s => s.type === "Attendance").length;

  // Find at-risk employees (Final Warning or Terminated)
  const atRisk = await prisma.strike.findMany({
    where: { status: "Active", level: { in: ["Final Warning", "Terminated"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Recent submissions
  const recent = allStrikes.slice(0, 8);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-rose-400 mb-2">Strike System</p>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Strike Dashboard</h2>
            <p className="text-sm text-slate-400 opacity-70">
              FBA Marketing Portal · {currentQuarter} {currentYear}
            </p>
          </div>
          <Link
            href="/admin/strikes/submit"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl shrink-0"
          >
            <Plus size={15} /> New Strike
          </Link>
        </div>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Active",         value: active,    color: "text-rose-400" },
          { label: "Pending Review", value: pending,   color: "text-amber-400" },
          { label: "Appealed",       value: appealed,  color: "text-indigo-400" },
          { label: "Resolved",       value: resolved,  color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Compliance Strikes", value: compliance, color: "text-amber-400" },
          { label: "Attendance Strikes", value: attendance, color: "text-rose-400" },
          { label: "Pending Appeals",    value: appeals,    color: "text-indigo-400" },
          { label: "Total This Quarter", value: allStrikes.length, color: "text-slate-300" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Termination Risk */}
      <div className="card rounded-xl p-6 mb-5 border border-rose-500/20">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-rose-300 flex items-center gap-2 text-sm">
            <AlertTriangle size={15} /> Termination Risk Employees
          </h4>
          <Link href="/admin/strikes/profiles" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
            View profiles →
          </Link>
        </div>
        {atRisk.length === 0 ? (
          <p className="text-sm text-slate-500">No at-risk employees this quarter.</p>
        ) : (
          <div className="space-y-2">
            {atRisk.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-200 font-medium">{s.name}</span>
                  <span className="text-slate-500 ml-2">{s.role}</span>
                </div>
                <Badge label={s.level} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent submissions */}
      <div className="card rounded-xl p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-indigo-300 text-sm">Recent Strike Submissions</h4>
          <Link href="/admin/strikes/database" className="text-xs text-indigo-400 hover:text-indigo-300 transition">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No strikes this quarter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th><th>Role</th><th>Type</th><th>Level</th><th>Date</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td className="text-slate-200">{s.name}</td>
                    <td>{s.role}</td>
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

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { href: "/admin/strikes/submit",   label: "Submit Strike",  desc: "Log a new warning or strike",          color: "hover:border-indigo-400" },
          { href: "/admin/strikes/appeals",  label: "Review Appeals", desc: "Approve or reject employee appeals",    color: "hover:border-amber-400" },
          { href: "/admin/strikes/database", label: "Strike Database",desc: "Search, filter, edit all records",      color: "hover:border-emerald-400" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className={`card rounded-xl p-5 ${a.color} transition block`}>
            <p className="font-semibold text-indigo-300 text-sm mb-1">{a.label}</p>
            <p className="text-xs text-slate-400">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Policy disclaimer */}
      <div className="card rounded-xl p-6 bg-purple-900/20 border border-purple-500/30">
        <h4 className="font-semibold text-purple-300 mb-3 text-sm">Policy Disclaimer</h4>
        <p className="text-sm text-slate-300 leading-relaxed">
          The strike system serves as the department&apos;s standard accountability framework. However, the Head of X
          and Head of Marketing reserve the right to issue warnings, strikes, evaluations, or corrective actions at
          their discretion when circumstances warrant it. Management may also escalate directly to a higher warning
          level depending on the severity of the situation.
        </p>
      </div>
    </div>
  );
}
