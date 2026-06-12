"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { TASK_CATEGORIES, formatMinutes, todayLocalDate } from "@/lib/utils";

interface TaskRecord {
  id: string; taskName: string; category: string; notes: string | null;
  status: string; startTime: string | null; finishTime: string | null;
  pausedMinutes: number; totalMinutes: number | null; createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  Pending:      "text-amber-400 bg-amber-500/10",
  "In Progress": "text-sky-400 bg-sky-500/10",
  Paused:       "text-orange-400 bg-orange-500/10",
  Finished:     "text-emerald-400 bg-emerald-500/10",
};

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";

export default function TaskboardPage() {
  const { data: session } = useSession();
  const [date, setDate]       = useState(todayLocalDate());
  const [tasks, setTasks]     = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [taskName, setTaskName]           = useState("");
  const [category, setCategory]           = useState(TASK_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [notes, setNotes]                 = useState("");
  const [error, setError]                 = useState("");
  const [submitting, setSubmitting]       = useState(false);

  const [now, setNow] = useState(() => Date.now());

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/tasks?date=${date}`);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [date]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (category === "Other" && !customCategory.trim()) {
      setError("Please specify a category.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskName, category, customCategory, notes: notes || null, date }),
    });
    if (res.ok) {
      setTaskName(""); setCategory(TASK_CATEGORIES[0]); setCustomCategory(""); setNotes("");
      load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to add task.");
    }
    setSubmitting(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    load();
  };

  const exportReport = () => {
    const finished = tasks.filter(t => t.status === "Finished");
    const lines = [
      `Task Report — ${session?.user?.name ?? session?.user?.email ?? ""}`,
      `Date: ${date}`,
      "",
      ...(finished.length === 0 ? ["No finished tasks."] : finished.flatMap((t, i) => [
        `${i + 1}. ${t.taskName} [${t.category}]`,
        ...(t.notes ? [`   Notes: ${t.notes}`] : []),
        `   Start: ${formatTime(t.startTime)} | Finish: ${formatTime(t.finishTime)} | Total: ${formatMinutes(t.totalMinutes)}`,
        "",
      ])),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `task-report-${date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const finishedCount = tasks.filter(t => t.status === "Finished").length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Taskboard</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>My Tasks</h2>
        <p className="text-sm text-slate-400 opacity-70">Log your tasks for the shift and track time spent on each.</p>
      </div>

      {/* Date + export */}
      <div className="card rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="sf-label !mb-0">Date</label>
          <input type="date" className="sf-input !w-auto" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <button
          onClick={exportReport}
          disabled={finishedCount === 0}
          className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-indigo-400 hover:text-indigo-300 transition disabled:opacity-40"
        >
          Export Report (.txt)
        </button>
      </div>

      {/* New task form */}
      <div className="card rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-slate-200 text-sm mb-4">Add Task</h3>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="sf-label">Task Name *</label>
              <input required className="sf-input" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="e.g. Edit highlight reel for Creator X" />
            </div>
            <div>
              <label className="sf-label">Category *</label>
              <select required className="sf-input" value={category} onChange={e => setCategory(e.target.value)}>
                {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {category === "Other" && (
            <div>
              <label className="sf-label">Specify Category *</label>
              <input required className="sf-input" value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
            </div>
          )}
          <div>
            <label className="sf-label">Notes</label>
            <textarea className="sf-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
            {submitting ? "Adding…" : "Add Task"}
          </button>
        </form>
      </div>

      {/* Task list */}
      <div className="card rounded-xl p-6">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">Tasks for {date}</h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks logged for this date yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map(t => (
              <TaskRow key={t.id} task={t} now={now} onUpdate={updateStatus} onDelete={remove} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task, now, onUpdate, onDelete,
}: {
  task: TaskRecord; now: number;
  onUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const elapsed = useMemo(() => {
    if (task.status !== "In Progress" || !task.startTime) return null;
    return task.pausedMinutes + Math.floor((now - new Date(task.startTime).getTime()) / 60000);
  }, [task.status, task.startTime, task.pausedMinutes, now]);

  return (
    <div className="bg-slate-800/40 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{task.taskName}</p>
          <p className="text-xs text-indigo-300">{task.category}</p>
          {task.notes && <p className="text-xs text-slate-400 mt-1">{task.notes}</p>}
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[task.status] ?? "text-slate-400 bg-slate-600/20"}`}>{task.status}</span>
      </div>
      <div className="flex items-center justify-between gap-4 mt-3">
        <p className="text-xs text-slate-500">
          {task.status === "Pending" && "Not started yet"}
          {task.status === "In Progress" && `Started ${formatTime(task.startTime)} · ${formatMinutes(elapsed)} elapsed`}
          {task.status === "Paused" && `Paused · ${formatMinutes(task.pausedMinutes)} elapsed`}
          {task.status === "Finished" && `${formatTime(task.startTime)} – ${formatTime(task.finishTime)} · ${formatMinutes(task.totalMinutes)} total`}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {task.status === "Pending" && (
            <>
              <button onClick={() => onUpdate(task.id, "In Progress")} className="text-xs text-sky-400 hover:text-sky-300">Start</button>
              <button onClick={() => onDelete(task.id)} className="text-xs text-rose-400 hover:text-rose-300">Remove</button>
            </>
          )}
          {task.status === "In Progress" && (
            <>
              <button onClick={() => onUpdate(task.id, "Paused")} className="text-xs text-orange-400 hover:text-orange-300">Pause</button>
              <button onClick={() => onUpdate(task.id, "Finished")} className="text-xs text-emerald-400 hover:text-emerald-300">Finish</button>
            </>
          )}
          {task.status === "Paused" && (
            <>
              <button onClick={() => onUpdate(task.id, "In Progress")} className="text-xs text-sky-400 hover:text-sky-300">Resume</button>
              <button onClick={() => onUpdate(task.id, "Finished")} className="text-xs text-emerald-400 hover:text-emerald-300">Finish</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
