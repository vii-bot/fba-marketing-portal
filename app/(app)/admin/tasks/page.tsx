"use client";

import { useEffect, useMemo, useState } from "react";
import { ListTodo } from "lucide-react";
import { DEPARTMENTS, TASK_STATUSES, TASK_CATEGORIES, formatMinutes, todayLocalDate } from "@/lib/utils";

interface TaskRecord {
  id: string; email: string; name: string; department: string;
  taskName: string; category: string; notes: string | null;
  status: string; startTime: string | null; finishTime: string | null;
  totalMinutes: number | null; createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  Pending:      "text-amber-400 bg-amber-500/10",
  "In Progress": "text-sky-400 bg-sky-500/10",
  Finished:     "text-emerald-400 bg-emerald-500/10",
};

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";

export default function AdminTaskboardPage() {
  const [date, setDate]             = useState(todayLocalDate());
  const [department, setDepartment] = useState("All");
  const [category, setCategory]     = useState("All");
  const [status, setStatus]         = useState("All");
  const [tasks, setTasks]           = useState<TaskRecord[]>([]);
  const [loading, setLoading]       = useState(true);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ date });
    if (department !== "All") params.set("department", department);
    if (category !== "All") params.set("category", category);
    if (status !== "All") params.set("status", status);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [date, department, category, status]);

  const stats = useMemo(() => {
    const finished = tasks.filter(t => t.status === "Finished");
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === "Pending").length,
      inProgress: tasks.filter(t => t.status === "In Progress").length,
      finished: finished.length,
      totalMinutes: finished.reduce((sum, t) => sum + (t.totalMinutes ?? 0), 0),
    };
  }, [tasks]);

  const byEmployee = useMemo(() => {
    const map = new Map<string, { name: string; department: string; pending: number; inProgress: number; finished: number; totalMinutes: number }>();
    for (const t of tasks) {
      const key = t.email;
      if (!map.has(key)) map.set(key, { name: t.name, department: t.department, pending: 0, inProgress: 0, finished: 0, totalMinutes: 0 });
      const e = map.get(key)!;
      if (t.status === "Pending") e.pending++;
      if (t.status === "In Progress") e.inProgress++;
      if (t.status === "Finished") { e.finished++; e.totalMinutes += t.totalMinutes ?? 0; }
    }
    return Array.from(map.entries()).map(([email, v]) => ({ email, ...v }));
  }, [tasks]);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Taskboard</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Taskboard Admin</h2>
        <p className="text-sm text-slate-400 opacity-70">Review employee tasks and time spent for a given day.</p>
      </div>

      {/* Filters */}
      <div className="card rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="sf-label">Date</label>
          <input type="date" className="sf-input !w-auto" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="sf-label">Department</label>
          <select className="sf-input !w-auto" value={department} onChange={e => setDepartment(e.target.value)}>
            <option>All</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="sf-label">Category</label>
          <select className="sf-input !w-auto" value={category} onChange={e => setCategory(e.target.value)}>
            <option>All</option>
            {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="sf-label">Status</label>
          <select className="sf-input !w-auto" value={status} onChange={e => setStatus(e.target.value)}>
            <option>All</option>
            {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">Total Tasks</p><p className="text-3xl font-bold text-slate-200">{stats.total}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">Pending</p><p className="text-3xl font-bold text-amber-400">{stats.pending}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">In Progress</p><p className="text-3xl font-bold text-sky-400">{stats.inProgress}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">Finished</p><p className="text-3xl font-bold text-emerald-400">{stats.finished}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">Time Logged</p><p className="text-3xl font-bold text-indigo-300">{formatMinutes(stats.totalMinutes)}</p></div>
      </div>

      {/* Per-employee summary */}
      <div className="card rounded-xl p-6 mb-6">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">By Employee</h4>
        {byEmployee.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks logged for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Department</th><th>Finished</th><th>In Progress</th><th>Pending</th><th>Total Time</th></tr></thead>
              <tbody>
                {byEmployee.map(e => (
                  <tr key={e.email}>
                    <td>
                      <div className="text-slate-200">{e.name}</div>
                      <div className="text-xs text-slate-500">{e.email}</div>
                    </td>
                    <td className="text-xs">{e.department}</td>
                    <td className="text-emerald-400 text-xs font-semibold">{e.finished}</td>
                    <td className="text-sky-400 text-xs font-semibold">{e.inProgress}</td>
                    <td className="text-amber-400 text-xs font-semibold">{e.pending}</td>
                    <td className="text-xs">{formatMinutes(e.totalMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed task list */}
      <div className="card rounded-xl p-6">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">All Tasks</h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500"><ListTodo size={32} className="mx-auto mb-2 opacity-25" /><p className="text-sm">No tasks logged for this date.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Task</th><th>Category</th><th>Status</th><th>Start</th><th>Finish</th><th>Total</th><th>Notes</th></tr></thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div className="text-slate-200 text-xs">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.department}</div>
                    </td>
                    <td className="text-xs">{t.taskName}</td>
                    <td className="text-xs text-indigo-300">{t.category}</td>
                    <td><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status] ?? "text-slate-400 bg-slate-600/20"}`}>{t.status}</span></td>
                    <td className="text-xs">{formatTime(t.startTime)}</td>
                    <td className="text-xs">{formatTime(t.finishTime)}</td>
                    <td className="text-xs">{formatMinutes(t.totalMinutes)}</td>
                    <td className="max-w-xs truncate text-xs text-slate-400">{t.notes ?? "—"}</td>
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
