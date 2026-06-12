import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { BarChart2, PlusCircle, Database, MessageSquare, CalendarCheck, DollarSign, Users, AlertTriangle, BookOpen, ListTodo, FileText, Library } from "lucide-react";

export default async function AdminHomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "admin") redirect("/dashboard");

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-8">
        <h2 className="font-bold text-slate-100 mb-2" style={{ fontSize: 23 }}>Admin Dashboard</h2>
        <p className="text-sm text-slate-400 opacity-70">Manage strikes, attendance, HR, and system settings.</p>
      </div>

      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Strike System</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { href: "/admin/strikes",          icon: <BarChart2 size={22} className="text-indigo-400 mb-2.5" />, label: "Strike Dashboard",  desc: "Overview of active strikes and at-risk employees." },
          { href: "/admin/strikes/submit",   icon: <PlusCircle size={22} className="text-indigo-400 mb-2.5" />, label: "Submit Strike",     desc: "Log a new warning or strike record." },
          { href: "/admin/strikes/database", icon: <Database size={22} className="text-indigo-400 mb-2.5" />, label: "All Strikes",       desc: "Search and manage all strike records." },
          { href: "/admin/strikes/appeals",  icon: <MessageSquare size={22} className="text-amber-400 mb-2.5" />, label: "Appeals",         desc: "Review and resolve employee appeals." },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="bento-card text-left block">
            {c.icon}
            <p className="font-semibold text-slate-100 text-sm mb-1">{c.label}</p>
            <p className="text-xs text-slate-400">{c.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Attendance</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { href: "/admin/attendance",         icon: <CalendarCheck size={22} className="text-emerald-400 mb-2.5" />, label: "Attendance Dashboard", desc: "Review and approve OT, day-off, and offset requests." },
          { href: "/admin/attendance/summary", icon: <DollarSign size={22} className="text-emerald-400 mb-2.5" />,   label: "Payroll Summary",       desc: "View OT hours approved per pay period." },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="bento-card text-left block">
            {c.icon}
            <p className="font-semibold text-slate-100 text-sm mb-1">{c.label}</p>
            <p className="text-xs text-slate-400">{c.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">HR</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/employees" className="bento-card text-left block">
          <Users size={22} className="text-indigo-300 mb-2.5" />
          <p className="font-semibold text-slate-100 text-sm mb-1">Employee Database</p>
          <p className="text-xs text-slate-400">Add, edit, and manage employee profiles and access.</p>
        </Link>
      </div>

      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Operations</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { href: "/admin/tasks",          icon: <ListTodo size={22} className="text-sky-400 mb-2.5" />,  label: "Team Productivity", desc: "Review daily tasks and time spent per employee." },
          { href: "/admin/creator-reports", icon: <FileText size={22} className="text-teal-400 mb-2.5" />, label: "Creator Reports",   desc: "Review weekly creator/account reports." },
          { href: "/admin/internal-docs",   icon: <Library size={22} className="text-violet-400 mb-2.5" />, label: "Internal Documentation", desc: "App architecture, workflows, and dev notes." },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="bento-card text-left block">
            {c.icon}
            <p className="font-semibold text-slate-100 text-sm mb-1">{c.label}</p>
            <p className="text-xs text-slate-400">{c.desc}</p>
          </Link>
        ))}
      </div>

      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Learning Management</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/lms" className="bento-card text-left block">
          <BookOpen size={22} className="text-indigo-400 mb-2.5" />
          <p className="font-semibold text-slate-100 text-sm mb-1">LMS Dashboard</p>
          <p className="text-xs text-slate-400">Manage SOPs, track employee progress, and monitor certifications.</p>
        </Link>
      </div>

      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">System</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/admin/danger-zone" className="bento-card danger text-left block" style={{ borderColor: "rgba(244,63,94,.25)" }}>
          <AlertTriangle size={22} className="text-rose-400 mb-2.5" />
          <p className="font-semibold text-rose-300 text-sm mb-1">Danger Zone</p>
          <p className="text-xs text-slate-400">Irreversible database clearing operations.</p>
        </Link>
      </div>
    </div>
  );
}
