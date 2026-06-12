"use client";

import { useState, useEffect } from "react";
import { ACTIVE_REQUEST_TYPES, requestTypeLabel, formatDate } from "@/lib/utils";

interface EmployeeRequestRecord {
  id: string; requestCode: string; type: string; reason: string;
  dateNeeded: string | null; notes: string | null; status: string;
  reviewNotes: string | null; createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  Pending:    "text-amber-400 bg-amber-500/10",
  Processing: "text-sky-400 bg-sky-500/10",
  Completed:  "text-emerald-400 bg-emerald-500/10",
  Rejected:   "text-rose-400 bg-rose-500/10",
};

export default function RequestsPage() {
  const [type, setType]             = useState(ACTIVE_REQUEST_TYPES[0]?.value ?? "");
  const [reason, setReason]         = useState("");
  const [dateNeeded, setDateNeeded] = useState("");
  const [notes, setNotes]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [requests, setRequests]     = useState<EmployeeRequestRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const load = async () => {
    setLoadingList(true);
    const res = await fetch("/api/employee-requests");
    if (res.ok) setRequests(await res.json());
    setLoadingList(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    const res = await fetch("/api/employee-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, reason, dateNeeded: dateNeeded || null, notes: notes || null }),
    });
    if (res.ok) {
      setSuccess("Request submitted.");
      setReason(""); setDateNeeded(""); setNotes("");
      load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to submit request.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Employee Requests</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>My Requests</h2>
        <p className="text-sm text-slate-400 opacity-70">Submit requests like a Certificate of Employment and track their status.</p>
      </div>

      {/* New request form */}
      <div className="card rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-slate-200 text-sm mb-4">New Request</h3>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="sf-label">Request Type *</label>
            <select className="sf-input" required value={type} onChange={e => setType(e.target.value)}>
              {ACTIVE_REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="sf-label">Reason / Purpose *</label>
            <textarea required className="sf-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="What is this request for?" />
          </div>
          <div>
            <label className="sf-label">Date Needed</label>
            <input type="date" className="sf-input" value={dateNeeded} onChange={e => setDateNeeded(e.target.value)} />
          </div>
          <div>
            <label className="sf-label">Additional Notes</label>
            <textarea className="sf-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" />
          </div>
          {error   && <p className="text-sm text-rose-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400 font-medium">{success}</p>}
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
            {loading ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="card rounded-xl p-6">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">Request History</h4>
        {loadingList ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">No requests submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Type</th><th>Reason</th><th>Date Needed</th><th>Status</th><th>Reviewer Notes</th><th>Submitted</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td className="text-xs font-semibold text-indigo-300">{requestTypeLabel(r.type)}</td>
                    <td className="max-w-xs truncate text-xs">{r.reason}</td>
                    <td>{r.dateNeeded ? formatDate(r.dateNeeded) : "—"}</td>
                    <td><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? "text-slate-400 bg-slate-600/20"}`}>{r.status}</span></td>
                    <td className="max-w-xs truncate text-xs text-slate-400">{r.reviewNotes ?? "—"}</td>
                    <td className="text-xs text-slate-500">{formatDate(r.createdAt)}</td>
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
