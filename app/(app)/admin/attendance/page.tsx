"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface Request {
  id: string; requestCode: string; type: string; name: string; email: string;
  date: string; hours: number | null; reason: string; tasks: string; deliverables: string;
  coverage: string; notes: string; makeupDate: string; missedDate: string;
  status: string; reviewer: string; reviewNotes: string; createdAt: string;
}

export default function AttendanceAdminPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [action,   setAction]   = useState<"Approved" | "Rejected" | null>(null);
  const [reviewer, setReviewer] = useState("");
  const [notes,    setNotes]    = useState("");

  const load = async () => {
    const res = await fetch("/api/attendance");
    if (res.ok) setRequests(await res.json());
  };

  useEffect(() => { load(); }, []);

  const pending    = requests.filter(r => r.status === "Pending");
  const processed  = requests.filter(r => r.status !== "Pending");

  const activeReq = requests.find(r => r.id === reviewId);

  const openReview = (id: string, act: "Approved" | "Rejected") => {
    setReviewId(id); setAction(act); setReviewer(""); setNotes("");
  };

  const confirmReview = async () => {
    if (!reviewer.trim()) return alert("Reviewer name is required.");
    if (action === "Rejected" && !notes.trim()) return alert("Notes are required for rejection.");
    await fetch("/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reviewId, status: action, reviewer, reviewNotes: notes }),
    });
    setReviewId(null);
    load();
  };

  const typeColor: Record<string, string> = {
    OT: "text-indigo-400", WeekendOT: "text-sky-400", DayOff: "text-emerald-400", Offset: "text-purple-400"
  };

  // Stats
  const otApproved   = requests.filter(r => r.type === "OT"        && r.status === "Approved").reduce((s, r) => s + (r.hours ?? 0), 0);
  const wotApproved  = requests.filter(r => r.type === "WeekendOT" && r.status === "Approved").reduce((s, r) => s + (r.hours ?? 0), 0);
  const daysOff      = requests.filter(r => r.type === "DayOff"    && r.status === "Approved").length;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Attendance & Requests</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Attendance Admin</h2>
        <p className="text-sm text-slate-400 opacity-70">Review, approve, and track all employee attendance requests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "OT Hours Approved",  value: `${otApproved}h`,  color: "text-indigo-400" },
          { label: "Weekend OT Approved",value: `${wotApproved}h`, color: "text-sky-400" },
          { label: "Days Off Approved",  value: daysOff,            color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pending */}
      <div className="card rounded-xl p-6 mb-5">
        <h4 className="font-semibold text-slate-200 text-sm mb-4 flex items-center gap-2">
          Pending Requests
          {pending.length > 0 && (
            <span className="badge badge-pending">{pending.length}</span>
          )}
        </h4>
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/40 p-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold uppercase tracking-wider ${typeColor[r.type] ?? "text-slate-400"}`}>{r.type}</span>
                    <span className="text-sm font-semibold text-slate-200">{r.name}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatDate(r.date)} {r.hours ? `· ${r.hours}h` : ""} · {r.requestCode}
                  </p>
                  <p className="text-sm text-slate-300 mt-1 line-clamp-2">{r.reason}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openReview(r.id, "Approved")} className="bg-emerald-600 hover:bg-emerald-500 transition text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Approve</button>
                  <button onClick={() => openReview(r.id, "Rejected")} className="bg-rose-700 hover:bg-rose-600 transition text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed */}
      <div className="card rounded-xl p-6">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">All Requests</h4>
        {processed.length === 0 ? (
          <div className="text-center py-8 text-slate-500"><Inbox size={32} className="mx-auto mb-2 opacity-25" /><p className="text-sm">No processed requests yet.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Type</th><th>Date</th><th>Hours</th><th>Status</th><th>Reviewer</th></tr></thead>
              <tbody>
                {processed.map(r => (
                  <tr key={r.id}>
                    <td><div className="text-slate-200">{r.name}</div><div className="text-xs text-slate-500">{r.email}</div></td>
                    <td><span className={`text-xs font-semibold ${typeColor[r.type] ?? "text-slate-400"}`}>{r.type}</span></td>
                    <td>{formatDate(r.date)}</td>
                    <td>{r.hours ? `${r.hours}h` : "—"}</td>
                    <td><Badge label={r.status} /></td>
                    <td className="text-xs text-slate-400">{r.reviewer ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!reviewId}
        onClose={() => setReviewId(null)}
        title={`${action} Request`}
        footer={
          <>
            <button onClick={confirmReview} className={`flex-1 ${action === "Approved" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"} transition text-white font-semibold py-2.5 rounded-xl text-sm`}>
              Confirm {action}
            </button>
            <button onClick={() => setReviewId(null)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
          </>
        }
      >
        {activeReq && (
          <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-lg p-4 text-sm text-slate-300 space-y-1.5">
              <p><span className="text-slate-500">Employee:</span> {activeReq.name} ({activeReq.email})</p>
              <p><span className="text-slate-500">Type:</span> {activeReq.type}</p>
              <p><span className="text-slate-500">Date:</span> {formatDate(activeReq.date)}{activeReq.hours ? ` · ${activeReq.hours}h` : ""}</p>
              <p><span className="text-slate-500">Reason:</span> {activeReq.reason}</p>
            </div>
            <div><label className="sf-label">Reviewed By *</label><input className="sf-input" value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="Your name / role" /></div>
            <div>
              <label className="sf-label">Notes {action === "Rejected" && <span className="text-rose-400">(required for rejection)</span>}</label>
              <textarea className="sf-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Decision notes…" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
