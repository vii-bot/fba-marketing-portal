"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface Appeal {
  id: string; strikeId: string; email: string; explanation: string;
  evidence: string; status: string; reviewer: string; reviewNotes: string;
  createdAt: string;
  strike: { strikeCode: string; name: string; role: string; type: string; level: string; incidentDate: string; reason: string; };
}

export default function AppealsPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [filter, setFilter]   = useState("");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes]       = useState("");

  const load = async () => {
    const url = filter ? `/api/appeals?status=${filter}` : "/api/appeals";
    const res = await fetch(url);
    if (res.ok) setAppeals(await res.json());
  };

  useEffect(() => { load(); }, [filter]);

  const activeAppeal = appeals.find(a => a.id === reviewId);

  const resolve = async (status: "Approved" | "Rejected") => {
    if (!reviewer.trim()) return alert("Reviewer name is required.");
    await fetch("/api/appeals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reviewId, status, reviewer, reviewNotes: notes }),
    });
    setReviewId(null);
    setReviewer(""); setNotes("");
    load();
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-rose-400 mb-2">Strike System</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Appeal Management</h2>
        <p className="text-sm text-slate-400 opacity-70">Review, approve, or reject employee strike appeals.</p>
      </div>

      <div className="card rounded-xl p-4 mb-4">
        <select className="db-filter" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Appeals</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {appeals.length === 0 ? (
        <div className="card rounded-xl py-12 text-center text-slate-500">
          <Inbox size={36} className="mx-auto mb-2.5 opacity-25" />
          <p className="text-sm">No appeals found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map(a => (
            <div key={a.id} className="card rounded-xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-200 text-sm">{a.strike.name}</span>
                    <Badge label={a.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Strike: {a.strike.strikeCode} · {a.strike.level} · {formatDate(a.strike.incidentDate)}
                  </p>
                  <p className="text-sm text-slate-300 mt-3">{a.explanation}</p>
                  {a.evidence && (
                    <a href={a.evidence} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 block">
                      View evidence →
                    </a>
                  )}
                </div>
                {a.status === "Pending" && (
                  <button
                    onClick={() => setReviewId(a.id)}
                    className="bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2 rounded-xl shrink-0"
                  >
                    Review
                  </button>
                )}
              </div>
              {(a.reviewer || a.reviewNotes) && (
                <div className="mt-3 pt-3 border-t border-slate-700/40 text-xs text-slate-400">
                  <span className="text-slate-500">Reviewed by:</span> {a.reviewer}
                  {a.reviewNotes && <p className="mt-1 text-slate-500">{a.reviewNotes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!reviewId}
        onClose={() => setReviewId(null)}
        title="Review Appeal"
        footer={
          <>
            <button onClick={() => resolve("Approved")} className="flex-1 bg-emerald-600 hover:bg-emerald-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Approve</button>
            <button onClick={() => resolve("Rejected")} className="flex-1 bg-rose-600 hover:bg-rose-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Reject</button>
            <button onClick={() => setReviewId(null)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
          </>
        }
      >
        {activeAppeal && (
          <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-lg p-4 text-sm text-slate-300 space-y-1.5">
              <p><span className="text-slate-500">Employee:</span> {activeAppeal.strike.name}</p>
              <p><span className="text-slate-500">Strike:</span> {activeAppeal.strike.strikeCode} · {activeAppeal.strike.level}</p>
              <p><span className="text-slate-500">Explanation:</span> {activeAppeal.explanation}</p>
            </div>
            <div><label className="sf-label">Reviewed By *</label><input className="sf-input" value={reviewer} onChange={e => setReviewer(e.target.value)} placeholder="Your name / role" /></div>
            <div><label className="sf-label">Review Notes</label><textarea className="sf-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes on your decision…" /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
