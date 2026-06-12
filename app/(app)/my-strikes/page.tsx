"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmailUsernameInput } from "@/components/ui/EmailUsernameInput";
import { formatDate, getQuarter } from "@/lib/utils";
import Link from "next/link";

interface Strike {
  id: string; strikeCode: string; type: string; level: string;
  incidentDate: string; status: string; reason: string; action: string;
  quarter: string; year: number;
}

export default function MyStrikesPage() {
  const [email, setEmail]     = useState("");
  const [strikes, setStrikes] = useState<Strike[] | null>(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealData, setAppealData] = useState({ strikeCode: "", explanation: "", evidence: "" });
  const [appealMsg, setAppealMsg]   = useState("");

  const lookup = async () => {
    if (!email.trim()) return;
    setLoading(true); setError("");
    const res = await fetch(`/api/strikes?email=${encodeURIComponent(email)}`);
    if (res.ok) { setStrikes(await res.json()); }
    else { setError("Could not load strike records."); }
    setLoading(false);
  };

  const currentQ    = getQuarter(new Date());
  const currentYear = new Date().getFullYear();

  const active = strikes?.filter(s => s.status === "Active" && s.quarter === currentQ && s.year === currentYear) ?? [];
  const history = strikes?.filter(s => !(s.quarter === currentQ && s.year === currentYear)) ?? [];

  const submitAppeal = async () => {
    const res = await fetch("/api/appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...appealData, email }),
    });
    if (res.ok) {
      setAppealMsg("Appeal submitted successfully.");
      setAppealOpen(false);
      setAppealData({ strikeCode: "", explanation: "", evidence: "" });
      lookup();
    } else {
      const d = await res.json();
      setAppealMsg(d.error ?? "Failed to submit appeal.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Strike System</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>My Strike Record</h2>
        <p className="text-sm text-slate-400 opacity-70">View your own active and historical strike records.</p>
      </div>

      {/* Lookup */}
      <div className="card rounded-xl p-6 mb-6">
        <p className="text-sm text-slate-300 mb-4">Enter the email address associated with your employee account to look up your strike record.</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <EmailUsernameInput value={email} onChange={setEmail} onKeyDown={e => e.key === "Enter" && lookup()} />
          </div>
          <button onClick={lookup} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold px-5 py-2.5 rounded-xl text-sm disabled:opacity-60">
            {loading ? "Loading…" : "Look Up"}
          </button>
        </div>
        {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      </div>

      {strikes !== null && (
        <div className="space-y-5">
          {/* Active strikes */}
          <div className="card rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-200 text-sm">
                Active Strikes This Quarter ({currentQ} {currentYear})
              </h4>
              <Badge label={active.length === 0 ? "none" : `${active.length} active`} />
            </div>
            {active.length === 0 ? (
              <p className="text-sm text-emerald-400">No active strikes this quarter.</p>
            ) : (
              <div className="space-y-3">
                {active.map(s => (
                  <div key={s.id} className="rounded-xl border border-slate-700/40 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-slate-500">{s.strikeCode}</span>
                      <Badge label={s.level} />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Badge label={s.type} />
                      <span className="text-xs text-slate-500">{formatDate(s.incidentDate)}</span>
                    </div>
                    <p className="text-sm text-slate-300 mt-2">{s.reason}</p>
                    {s.action && <p className="text-xs text-slate-500 mt-1">Corrective action: {s.action}</p>}
                    <button
                      onClick={() => { setAppealOpen(true); setAppealData(d => ({ ...d, strikeCode: s.strikeCode })); }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 block transition"
                    >
                      Appeal this strike →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="card rounded-xl p-6">
              <h4 className="font-semibold text-slate-200 text-sm mb-4">Historical Records (Previous Quarters)</h4>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Type</th><th>Level</th><th>Date</th><th>Quarter</th><th>Status</th></tr></thead>
                  <tbody>
                    {history.map(s => (
                      <tr key={s.id}>
                        <td className="font-mono text-xs text-slate-500">{s.strikeCode}</td>
                        <td><Badge label={s.type} /></td>
                        <td><Badge label={s.level} /></td>
                        <td>{formatDate(s.incidentDate)}</td>
                        <td>{s.quarter} {s.year}</td>
                        <td><Badge label={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Appeal process */}
          <div className="card rounded-xl p-6 bg-indigo-900/20 border border-indigo-500/30">
            <h4 className="font-semibold text-indigo-300 mb-3 text-sm">Appeal Process</h4>
            <p className="text-sm text-slate-300 mb-3">
              If you believe a strike was issued in error, you may submit an appeal within 5 business days of the incident.
              Include all supporting evidence such as screenshots, timestamps, or relevant documentation.
            </p>

            {!appealOpen ? (
              <button onClick={() => setAppealOpen(true)} className="text-sm text-indigo-400 hover:text-indigo-300 transition">
                Open appeal form →
              </button>
            ) : (
              <div className="border-t border-slate-700/50 pt-4 mt-2 space-y-4">
                <p className="text-xs text-indigo-400 uppercase tracking-widest">Submit an Appeal</p>
                <div><label className="sf-label">Strike ID *</label><input className="sf-input" value={appealData.strikeCode} onChange={e => setAppealData(d => ({ ...d, strikeCode: e.target.value }))} placeholder="STK-XXXXXXXXX" /></div>
                <div><label className="sf-label">Your Explanation *</label><textarea className="sf-input" value={appealData.explanation} onChange={e => setAppealData(d => ({ ...d, explanation: e.target.value }))} placeholder="Explain why you believe this strike was issued in error…" /></div>
                <div><label className="sf-label">Supporting Evidence URL</label><input className="sf-input" value={appealData.evidence} onChange={e => setAppealData(d => ({ ...d, evidence: e.target.value }))} placeholder="Link to screenshot, message, etc." /></div>
                <div className="flex gap-3">
                  <button onClick={submitAppeal} className="bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold px-5 py-2.5 rounded-xl text-sm">Submit Appeal</button>
                  <button onClick={() => setAppealOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-slate-500 transition">Cancel</button>
                </div>
                {appealMsg && <p className="text-sm font-medium text-emerald-400">{appealMsg}</p>}
              </div>
            )}
          </div>

          {/* Policy disclaimer */}
          <div className="card rounded-xl p-5 bg-purple-900/15 border border-purple-500/20">
            <p className="text-xs text-slate-400 leading-relaxed">
              The strike system serves as the department&apos;s standard accountability framework. However, the Head of X and
              Head of Marketing reserve the right to issue warnings, strikes, evaluations, or corrective actions at their
              discretion when circumstances warrant it.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
