"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const ALL_PAGES = [
  { label: "Dashboard",             href: "/dashboard" },
  { label: "My Schedule",           href: "/schedule" },
  { label: "My Creators",           href: "/my-creators" },
  { label: "Resource Portal",       href: "/resource-portal" },
  { label: "My Strike Record",      href: "/my-strikes" },
  { label: "Submit a Request",      href: "/attendance" },
  { label: "My OT Requests",        href: "/my-requests" },
  { label: "Admin Dashboard",       href: "/admin",                   adminOnly: true },
  { label: "Strike Dashboard",      href: "/admin/strikes",           adminOnly: true },
  { label: "Submit Strike",         href: "/admin/strikes/submit",    adminOnly: true },
  { label: "Strike Database",       href: "/admin/strikes/database",  adminOnly: true },
  { label: "Strike Profiles",       href: "/admin/strikes/profiles",  adminOnly: true },
  { label: "Strike Appeals",        href: "/admin/strikes/appeals",   adminOnly: true },
  { label: "Attendance Admin",      href: "/admin/attendance",        adminOnly: true },
  { label: "Payroll Summary",       href: "/admin/attendance/summary",adminOnly: true },
  { label: "Employee Database",     href: "/admin/employees",         adminOnly: true },
  { label: "Danger Zone",           href: "/admin/danger-zone",       adminOnly: true },
  { label: "Payroll",               href: "/training/payroll" },
  { label: "Team Schedule",         href: "/training/team-schedule" },
];

export default function DashboardSearch({ isAdmin }: { isAdmin: boolean }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const results = query.trim().length > 1
    ? ALL_PAGES.filter(p => {
        if (p.adminOnly && !isAdmin) return false;
        return p.label.toLowerCase().includes(query.toLowerCase());
      }).slice(0, 6)
    : [];

  return (
    <div className="card rounded-xl p-4 mb-6 border border-indigo-500/20 relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && results[0]) { router.push(results[0].href); setQuery(""); } }}
          placeholder="Search pages… (e.g. Strike, Attendance, Dropbox)"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
        />
      </div>
      {results.length > 0 && (
        <div className="mt-2 rounded-lg border border-slate-700 bg-slate-800/90 overflow-hidden">
          {results.map(r => (
            <button
              key={r.href}
              onClick={() => { router.push(r.href); setQuery(""); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/60 transition flex items-center gap-2 border-b border-slate-700/40 last:border-0"
            >
              <span className="text-indigo-400 text-xs">→</span>
              {r.label}
              <span className="ml-auto text-xs text-slate-600">{r.href}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
