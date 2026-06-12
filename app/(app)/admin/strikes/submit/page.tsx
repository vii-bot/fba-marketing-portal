"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmailUsernameInput } from "@/components/ui/EmailUsernameInput";
import { EMPLOYEE_ROLES, DEPARTMENTS, STRIKE_TYPES, STRIKE_LEVELS } from "@/lib/utils";

interface SOP { id: string; title: string; tier: string; category: string; }

export default function SubmitStrikePage() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");
  const [sops, setSops]         = useState<SOP[]>([]);

  useEffect(() => {
    fetch("/api/sops").then(r => r.json()).then(d => setSops(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    name: "", email: "", role: "", department: "X",
    type: "", level: "", incidentDate: "", submitter: "",
    reason: "", impact: "", action: "", evidence: "", sopReference: "", status: "Active",
    notes: "", requireAck: false,
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/strikes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSuccess(true);
      setForm({
        name: "", email: "", role: "", department: "X",
        type: "", level: "", incidentDate: "", submitter: "",
        reason: "", impact: "", action: "", evidence: "", sopReference: "", status: "Active",
        notes: "", requireAck: false,
      });
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit strike.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-rose-400 mb-2">Strike System</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Submit Strike</h2>
        <p className="text-sm text-slate-400 opacity-70">Log a new strike or warning against an employee.</p>
      </div>

      <div className="card rounded-xl p-8">
        <form onSubmit={handleSubmit}>
          {/* Employee Info */}
          <p className="text-xs uppercase tracking-widest text-indigo-400 mb-4">Employee Information</p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div><label className="sf-label">Employee Name *</label><input className="sf-input" required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Full name" /></div>
            <div><label className="sf-label">Employee Email *</label><EmailUsernameInput required value={form.email} onChange={v => set("email", v)} /></div>
            <div>
              <label className="sf-label">Role *</label>
              <select className="sf-input" required value={form.role} onChange={e => set("role", e.target.value)}>
                <option value="">Select role…</option>
                {EMPLOYEE_ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="sf-label">Department</label>
              <select className="sf-input" value={form.department} onChange={e => set("department", e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Strike Details */}
          <div className="border-t border-slate-700/50 pt-6 mb-6">
            <p className="text-xs uppercase tracking-widest text-indigo-400 mb-4">Strike Details</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="sf-label">Strike Type *</label>
                <select className="sf-input" required value={form.type} onChange={e => set("type", e.target.value)}>
                  <option value="">Select type…</option>
                  {STRIKE_TYPES.map(t => <option key={t} value={t}>{t} Strike</option>)}
                </select>
              </div>
              <div>
                <label className="sf-label">Strike Level *</label>
                <select className="sf-input" required value={form.level} onChange={e => set("level", e.target.value)}>
                  <option value="">Select level…</option>
                  {STRIKE_LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div><label className="sf-label">Incident Date *</label><input className="sf-input" type="date" required value={form.incidentDate} onChange={e => set("incidentDate", e.target.value)} /></div>
              <div><label className="sf-label">Submitted By *</label><input className="sf-input" required value={form.submitter} onChange={e => set("submitter", e.target.value)} placeholder="Your name / role" /></div>
            </div>
          </div>

          {/* Incident Details */}
          <div className="border-t border-slate-700/50 pt-6 mb-6">
            <p className="text-xs uppercase tracking-widest text-indigo-400 mb-4">Incident Details</p>
            <div className="space-y-4">
              <div><label className="sf-label">Reason / What Happened *</label><textarea className="sf-input" required value={form.reason} onChange={e => set("reason", e.target.value)} placeholder="Describe what occurred…" /></div>
              <div><label className="sf-label">Result or Impact</label><textarea className="sf-input" value={form.impact} onChange={e => set("impact", e.target.value)} placeholder="How did this affect operations?" /></div>
              <div><label className="sf-label">Corrective Action</label><textarea className="sf-input" value={form.action} onChange={e => set("action", e.target.value)} placeholder="What improvement is expected?" /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="sf-label">Evidence URL / Reference</label><input className="sf-input" value={form.evidence} onChange={e => set("evidence", e.target.value)} placeholder="Discord link, screenshot URL…" /></div>
                <div>
                  <label className="sf-label">SOP Reference <span className="text-slate-500 font-normal">(for Compliance strikes)</span></label>
                  <select className="sf-input" value={form.sopReference} onChange={e => set("sopReference", e.target.value)}>
                    <option value="">No SOP reference</option>
                    {sops.map(s => <option key={s.id} value={s.id}>[{s.tier}] {s.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="sf-label">Initial Status</label>
                  <select className="sf-input" value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Pending Review">Pending Review</option>
                  </select>
                </div>
              </div>
              <div><label className="sf-label">Notes (Internal Only)</label><textarea className="sf-input" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional internal notes…" style={{ minHeight: 60 }} /></div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.requireAck} onChange={e => set("requireAck", e.target.checked)} className="rounded text-indigo-500" style={{ width: "auto", background: "#0f1117", borderColor: "#4f46e5" }} />
                <span className="text-sm text-slate-300">Require employee acknowledgment</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-700/50">
            <button type="submit" disabled={loading} className="flex-1 min-w-[160px] bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
              {loading ? "Submitting…" : "Submit Strike"}
            </button>
            <button type="button" onClick={() => router.push("/admin/strikes")} className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:border-slate-500 transition text-sm">
              Cancel
            </button>
          </div>

          {error   && <p className="mt-4 text-sm text-rose-400 text-center">{error}</p>}
          {success && <p className="mt-4 text-sm text-emerald-400 font-medium text-center">Strike submitted successfully.</p>}
        </form>
      </div>
    </div>
  );
}
