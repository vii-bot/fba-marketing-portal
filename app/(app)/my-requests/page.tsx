"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { EmailUsernameInput } from "@/components/ui/EmailUsernameInput";
import Link from "next/link";

interface Request {
  id: string; requestCode: string; type: string; date: string;
  hours: number | null; reason: string; status: string; createdAt: string;
}

export default function MyRequestsPage() {
  const [email, setEmail]   = useState("");
  const [data, setData]     = useState<Request[] | null>(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!email.trim()) return;
    setLoading(true); setError("");
    const res = await fetch(`/api/attendance?email=${encodeURIComponent(email)}`);
    if (res.ok) setData(await res.json());
    else setError("Could not load records.");
    setLoading(false);
  };

  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
  const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

  const otUsed    = data?.filter(r => r.type === "OT" && ["Pending","Approved"].includes(r.status) && new Date(r.date) >= weekStart && new Date(r.date) < weekEnd).reduce((s, r) => s + (r.hours ?? 0), 0) ?? 0;

  const typeColor: Record<string, string> = {
    OT: "text-indigo-400", WeekendOT: "text-sky-400", DayOff: "text-emerald-400", Offset: "text-purple-400"
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Attendance & Requests</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>My Requests</h2>
        <p className="text-sm text-slate-400 opacity-70">Your request history and OT balance.</p>
      </div>

      {/* Lookup */}
      <div className="card rounded-xl p-6 mb-6">
        <p className="text-sm text-slate-300 mb-4">Enter your email to load your attendance history.</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <EmailUsernameInput value={email} onChange={setEmail} onKeyDown={e => e.key === "Enter" && load()} />
          </div>
          <button onClick={load} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? "Loading…" : "Load My Records"}
          </button>
        </div>
        {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      </div>

      {data !== null && (
        <div className="space-y-5">
          {/* OT Stats */}
          <div className="card rounded-xl p-6">
            <h4 className="font-semibold text-slate-200 text-sm mb-4">My OT Usage This Week</h4>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Hours used</span>
              <span className="text-indigo-300 font-bold">{otUsed}h / 6h</span>
            </div>
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, (otUsed / 6) * 100)}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{Math.max(0, 6 - otUsed)}h remaining · resets Sunday</p>
          </div>

          {/* Requests table */}
          <div className="card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-200 text-sm">My Requests</h4>
              <Link href="/attendance" className="text-xs text-indigo-400 hover:text-indigo-300">New request →</Link>
            </div>
            {data.length === 0 ? (
              <p className="text-sm text-slate-500">No requests submitted yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Type</th><th>Date</th><th>Hours</th><th>Reason</th><th>Status</th><th>Submitted</th></tr></thead>
                  <tbody>
                    {data.map(r => (
                      <tr key={r.id}>
                        <td><span className={`text-xs font-bold uppercase tracking-wider ${typeColor[r.type] ?? "text-slate-400"}`}>{r.type}</span></td>
                        <td>{formatDate(r.date)}</td>
                        <td>{r.hours ? `${r.hours}h` : "—"}</td>
                        <td className="max-w-xs truncate text-xs">{r.reason}</td>
                        <td><Badge label={r.status} /></td>
                        <td className="text-xs text-slate-500">{formatDate(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card rounded-xl p-4 bg-amber-900/10 border border-amber-500/20">
            <p className="text-xs text-amber-200/70">No request is considered approved until management approval is received through the system.</p>
          </div>
        </div>
      )}
    </div>
  );
}
