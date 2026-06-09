"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

interface Request {
  id: string; requestCode: string; type: string; name: string; email: string;
  date: string; hours: number | null; status: string; reason: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function PayrollSummaryPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const now = new Date();
  const [year,   setYear]   = useState(String(now.getFullYear()));
  const [month,  setMonth]  = useState(String(now.getMonth() + 1));
  const [period, setPeriod] = useState("1");

  useEffect(() => {
    const url = `/api/attendance?year=${year}&month=${month}&period=${period}`;
    fetch(url).then(r => r.json()).then(setRequests);
  }, [year, month, period]);

  const approved   = requests.filter(r => r.status === "Approved" && r.type === "OT");
  const totalHours = approved.reduce((s, r) => s + (r.hours ?? 0), 0);

  const periodLabel = period === "1"
    ? `1–15 ${MONTHS[parseInt(month) - 1]} ${year}`
    : `16–end ${MONTHS[parseInt(month) - 1]} ${year}`;

  // Group by employee
  const byEmployee: Record<string, { name: string; hours: number; requests: Request[] }> = {};
  approved.forEach(r => {
    if (!byEmployee[r.email]) byEmployee[r.email] = { name: r.name, hours: 0, requests: [] };
    byEmployee[r.email].hours += r.hours ?? 0;
    byEmployee[r.email].requests.push(r);
  });

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Attendance & Requests</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Payroll Summary</h2>
        <p className="text-sm text-slate-400 opacity-70">OT approved per pay period — Period 1 (1–15) and Period 2 (16–end of month).</p>
      </div>

      {/* Filters */}
      <div className="card rounded-xl p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="sf-label mb-1">Year</label>
            <select className="db-filter" value={year} onChange={e => setYear(e.target.value)}>
              {["2024","2025","2026","2027"].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="sf-label mb-1">Month</label>
            <select className="db-filter" value={month} onChange={e => setMonth(e.target.value)}>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="sf-label mb-1">Pay Period</label>
            <select className="db-filter" value={period} onChange={e => setPeriod(e.target.value)}>
              <option value="1">Period 1 — 1st to 15th</option>
              <option value="2">Period 2 — 16th to end of month</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active period banner */}
      <div className="card rounded-xl p-4 mb-5 border border-indigo-500/20 bg-indigo-900/10">
        <p className="text-sm text-indigo-300 font-medium">Pay Period: {periodLabel}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total OT Hours", value: `${totalHours}h`, color: "text-indigo-400" },
          { label: "Employees w/ OT", value: Object.keys(byEmployee).length, color: "text-emerald-400" },
          { label: "Total Requests", value: approved.length, color: "text-slate-300" },
          { label: "Avg Hours/Employee", value: Object.keys(byEmployee).length ? `${(totalHours / Object.keys(byEmployee).length).toFixed(1)}h` : "—", color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Employee breakdown */}
      <div className="card rounded-xl p-6 mb-5">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">Employee OT Breakdown</h4>
        {Object.keys(byEmployee).length === 0 ? (
          <p className="text-sm text-slate-500">No approved OT for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Email</th><th>Approved Hours</th><th>Requests</th></tr></thead>
              <tbody>
                {Object.entries(byEmployee).map(([email, emp]) => (
                  <tr key={email}>
                    <td className="text-slate-200 font-medium">{emp.name}</td>
                    <td className="text-xs text-slate-500">{email}</td>
                    <td className="text-indigo-300 font-bold">{emp.hours}h</td>
                    <td>{emp.requests.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All requests this period */}
      <div className="card rounded-xl p-6">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">All OT Requests This Period</h4>
        {approved.length === 0 ? (
          <p className="text-sm text-slate-500">No OT requests this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Date</th><th>Hours</th><th>Reason</th><th>Code</th></tr></thead>
              <tbody>
                {approved.map(r => (
                  <tr key={r.id}>
                    <td className="text-slate-200">{r.name}</td>
                    <td>{formatDate(r.date)}</td>
                    <td className="text-indigo-300 font-bold">{r.hours}h</td>
                    <td className="max-w-xs truncate">{r.reason}</td>
                    <td className="font-mono text-xs text-slate-500">{r.requestCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
