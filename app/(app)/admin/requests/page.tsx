"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Inbox } from "lucide-react";
import { formatDate, requestTypeLabel, EMPLOYEE_REQUEST_STATUSES } from "@/lib/utils";

interface EmployeeRequestRecord {
  id: string; requestCode: string; type: string; name: string; email: string;
  role: string | null; department: string; reason: string; dateNeeded: string | null;
  notes: string | null; status: string; reviewer: string | null; reviewNotes: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  Pending:    "text-amber-400 bg-amber-500/10",
  Processing: "text-sky-400 bg-sky-500/10",
  Completed:  "text-emerald-400 bg-emerald-500/10",
  Rejected:   "text-rose-400 bg-rose-500/10",
};

export default function AdminRequestsPage() {
  const [requests, setRequests]       = useState<EmployeeRequestRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [reviewId, setReviewId]       = useState<string | null>(null);
  const [status, setStatus]           = useState("");
  const [notes, setNotes]             = useState("");

  const load = async () => {
    const res = await fetch("/api/employee-requests");
    if (res.ok) setRequests(await res.json());
  };

  useEffect(() => { load(); }, []);

  const filtered = statusFilter === "All" ? requests : requests.filter(r => r.status === statusFilter);
  const activeReq = requests.find(r => r.id === reviewId);

  const openReview = (r: EmployeeRequestRecord) => {
    setReviewId(r.id); setStatus(r.status); setNotes(r.reviewNotes ?? "");
  };

  const confirmReview = async () => {
    await fetch("/api/employee-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reviewId, status, reviewNotes: notes }),
    });
    setReviewId(null);
    load();
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Employee Requests</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Requests Admin</h2>
        <p className="text-sm text-slate-400 opacity-70">Review and manage employee-facing requests, such as Certificate of Employment requests.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {EMPLOYEE_REQUEST_STATUSES.map(s => (
          <div key={s} className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">{s}</p>
            <p className={`text-3xl font-bold ${(STATUS_STYLE[s] ?? "text-slate-300").split(" ")[0]}`}>
              {requests.filter(r => r.status === s).length}
            </p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-6 flex-wrap">
        {["All", ...EMPLOYEE_REQUEST_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? "bg-slate-700 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Requests table */}
      <div className="card rounded-xl p-6">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">Requests</h4>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500"><Inbox size={32} className="mx-auto mb-2 opacity-25" /><p className="text-sm">No requests.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Type</th><th>Reason</th><th>Date Needed</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="text-slate-200">{r.name}</div>
                      <div className="text-xs text-slate-500">{r.email}</div>
                    </td>
                    <td className="text-xs font-semibold text-indigo-300">{requestTypeLabel(r.type)}</td>
                    <td className="max-w-xs truncate text-xs">{r.reason}</td>
                    <td>{r.dateNeeded ? formatDate(r.dateNeeded) : "—"}</td>
                    <td><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? "text-slate-400 bg-slate-600/20"}`}>{r.status}</span></td>
                    <td className="text-xs text-slate-500">{formatDate(r.createdAt)}</td>
                    <td><button onClick={() => openReview(r)} className="text-xs text-indigo-400 hover:text-indigo-300">Update</button></td>
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
        title="Update Request"
        footer={
          <>
            <button onClick={confirmReview} className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Save</button>
            <button onClick={() => setReviewId(null)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
          </>
        }
      >
        {activeReq && (
          <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-lg p-4 text-sm text-slate-300 space-y-1.5">
              <p><span className="text-slate-500">Employee:</span> {activeReq.name} ({activeReq.email})</p>
              <p><span className="text-slate-500">Department:</span> {activeReq.department}{activeReq.role ? ` · ${activeReq.role}` : ""}</p>
              <p><span className="text-slate-500">Type:</span> {requestTypeLabel(activeReq.type)}</p>
              <p><span className="text-slate-500">Request Code:</span> {activeReq.requestCode}</p>
              <p><span className="text-slate-500">Reason:</span> {activeReq.reason}</p>
              {activeReq.dateNeeded && <p><span className="text-slate-500">Date Needed:</span> {formatDate(activeReq.dateNeeded)}</p>}
              {activeReq.notes && <p><span className="text-slate-500">Notes:</span> {activeReq.notes}</p>}
            </div>
            <div>
              <label className="sf-label">Status</label>
              <select className="sf-input" value={status} onChange={e => setStatus(e.target.value)}>
                {EMPLOYEE_REQUEST_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="sf-label">Reviewer Notes</label>
              <textarea className="sf-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for the employee…" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
