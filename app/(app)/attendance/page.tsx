"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EmailUsernameInput } from "@/components/ui/EmailUsernameInput";

type TabKey = "ot" | "weekot" | "leave";

const TAB_LABELS: Record<TabKey, string> = {
  ot: "Overtime", weekot: "Weekend OT", leave: "Leave",
};

const DEPARTMENTS = ["Traffic Lead", "Instagram", "Reddit", "X", "Editors", "Others"];
const LEAVE_TYPES  = ["PTO", "Sick Leave", "Emergency Leave", "Other"];
const ROLES        = ["Page Runner","Engager","Flagtester","X Manager","Admin","Other"];

function AttendanceForm() {
  const params = useSearchParams();
  const initialTab = (params.get("tab") as TabKey) ?? "ot";
  const [tab, setTab]         = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  // OT form
  const [ot, setOt] = useState({ name:"", email:"", role:"", department:"FBA X Department", date:"", hours:"", reason:"", tasks:"", codes:"", notes:"" });
  const [otBalance, setOtBalance] = useState<number | null>(null);

  // Weekend OT form
  const [wot, setWot] = useState({ name:"", email:"", date:"", hours:"", reason:"", deliverables:"", notes:"" });

  // Leave form
  const [lv, setLv] = useState({ name:"", email:"", department:"", leaveType:"", startDate:"", endDate:"", reason:"", coverage:"", notes:"", manager:"" });
  const [loadingManager, setLoadingManager] = useState(false);

  const loadOtBalance = async (email: string) => {
    if (!email) return;
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0,0,0,0);
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
    const res = await fetch(`/api/attendance?email=${encodeURIComponent(email)}&type=OT`);
    if (!res.ok) return;
    const data = await res.json();
    const used = data.filter((r: any) =>
      ["Pending","Approved"].includes(r.status) &&
      new Date(r.date) >= weekStart && new Date(r.date) < weekEnd
    ).reduce((s: number, r: any) => s + (r.hours ?? 0), 0);
    setOtBalance(6 - used);
  };

  const lookupManager = async (email: string) => {
    if (!email) return;
    setLoadingManager(true);
    try {
      const res = await fetch(`/api/employees?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        const emp = Array.isArray(data) ? data[0] : null;
        if (emp) {
          // Try to find dept head from same department
          const deptRes = await fetch(`/api/employees?role=X+Manager`);
          if (deptRes.ok) {
            const mgrs = await deptRes.json();
            if (mgrs.length > 0) setLv(v => ({ ...v, manager: mgrs[0].name }));
          }
        }
      }
    } finally {
      setLoadingManager(false);
    }
  };

  const submit = async (type: string, body: object) => {
    setLoading(true); setError(""); setSuccess("");
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...body }),
    });
    if (res.ok) {
      setSuccess("Request submitted successfully.");
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to submit request.");
    }
    setLoading(false);
  };

  const inp = (val: string, setter: (v: string) => void) => ({
    className: "sf-input" as string,
    value: val,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setter(e.target.value),
  });

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Attendance & Requests</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Submit a Request</h2>
        <p className="text-sm text-slate-400 opacity-70">Overtime, Weekend OT, and Leave requests.</p>
      </div>

      <div className="card rounded-xl p-4 mb-5 border border-amber-500/20 bg-amber-900/10">
        <p className="text-sm text-amber-200/80">No request is considered approved until management approval is received through the system.</p>
      </div>

      {/* Work schedule policy */}
      <div className="card rounded-xl p-5 mb-5 space-y-3">
        <div>
          <h4 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-1">Core Hours</h4>
          <p className="text-sm text-slate-300">Core hours are <strong className="text-slate-200">9:00 AM – 5:00 PM CST, Monday to Friday</strong>.</p>
        </div>
        <div className="border-t border-slate-700/50 pt-3">
          <h4 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-1">6th Day / Saturday</h4>
          <p className="text-sm text-slate-300">
            Saturday is treated as an async operations day — there is no required virtual attendance by default. It&apos;s used for content
            research, planning ahead, preparing operations for the coming week, and as a built-in buffer for unfinished tasks. Saturday
            may serve as a rest day if your operations are fully in order. However, attendance may be required if tasks were incomplete
            or errors occurred during the week, additional cleanup or correction is needed, or you&apos;re specifically instructed by
            management to attend or complete work.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-6">
        {(Object.entries(TAB_LABELS) as [TabKey, string][]).map(([k, v]) => (
          <button key={k} onClick={() => { setTab(k); setSuccess(""); setError(""); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${tab === k ? "bg-slate-700 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}>
            {v}
          </button>
        ))}
      </div>

      {/* OT */}
      {tab === "ot" && (
        <div className="card rounded-xl p-6">
          <h3 className="font-semibold text-indigo-300 mb-0.5 text-sm">Overtime Request</h3>
          <p className="text-xs text-slate-500 mb-4">Max 6 OT hours per week · resets every Sunday</p>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 mb-4">
            <p className="text-xs text-slate-400">
              Overtime is for work that genuinely requires additional approved time beyond core hours — it is not a substitute for
              incomplete or delayed regular-hours work. Page runners with lower-end hardware setups are not given leniency on task
              completion: all account operations are expected to be finished within the work period regardless of equipment. If
              additional time is needed to meet this standard, it is the page runner&apos;s responsibility to account for it.
            </p>
          </div>
          {otBalance !== null && (
            <div className={`rounded-lg border p-4 mb-5 ${otBalance <= 0 ? "border-rose-500/20 bg-rose-900/10" : "border-indigo-500/20 bg-indigo-900/10"}`}>
              <p className="text-sm font-semibold text-slate-200">{otBalance <= 0 ? "OT limit reached (0h remaining)" : `${otBalance}h remaining this week`}</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(0, (otBalance / 6) * 100)}%` }} />
              </div>
            </div>
          )}
          <form onSubmit={e => { e.preventDefault(); submit("OT", { ...ot, hours: parseFloat(ot.hours) }); }} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="sf-label">Employee Name *</label><input required {...inp(ot.name, v => setOt(o => ({...o, name: v})))} placeholder="Full name" /></div>
              <div><label className="sf-label">Employee Email *</label><EmailUsernameInput required value={ot.email} onChange={v => { setOt(o => ({...o, email: v})); loadOtBalance(v); }} /></div>
              <div><label className="sf-label">Department</label>
                <select className="sf-input" value={ot.department} onChange={e => setOt(o => ({...o, department: e.target.value}))}>
                  {["FBA X Department","Traffic Lead","Instagram","Reddit","Editors","Others"].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div><label className="sf-label">Role</label>
                <select className="sf-input" value={ot.role} onChange={e => setOt(o => ({...o, role: e.target.value}))}>
                  <option value="">Select…</option>{ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div><label className="sf-label">Date of OT *</label><input required type="date" {...inp(ot.date, v => setOt(o => ({...o, date: v})))} /></div>
              <div><label className="sf-label">OT Hours Requested *</label><input required type="number" min="0.5" max="6" step="0.5" {...inp(ot.hours, v => setOt(o => ({...o, hours: v})))} placeholder="e.g. 2" /></div>
            </div>
            <div><label className="sf-label">Reason for Overtime *</label><textarea required {...inp(ot.reason, v => setOt(o => ({...o, reason: v})))} placeholder="Why is overtime needed?" /></div>
            <div><label className="sf-label">Expected Tasks During OT *</label><textarea required {...inp(ot.tasks, v => setOt(o => ({...o, tasks: v})))} placeholder="What will you be working on?" /></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="sf-label">Creator Codes (optional)</label><input {...inp(ot.codes, v => setOt(o => ({...o, codes: v})))} placeholder="Comma-separated codes" /></div>
              <div><label className="sf-label">Supporting Notes</label><input {...inp(ot.notes, v => setOt(o => ({...o, notes: v})))} placeholder="Any additional context…" /></div>
            </div>
            {error   && <p className="text-sm text-rose-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400 font-medium">{success}</p>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">Submit OT Request</button>
          </form>
        </div>
      )}

      {/* Weekend OT */}
      {tab === "weekot" && (
        <div className="card rounded-xl p-6">
          <h3 className="font-semibold text-sky-300 mb-0.5 text-sm">Weekend OT Request</h3>
          <p className="text-xs text-slate-500 mb-0.5">Must be submitted before <strong className="text-slate-300">Friday 4:00 PM CST</strong></p>
          <p className="text-xs text-slate-500 mb-4">Approved OT window: 7:00 AM – 7:00 PM CST</p>
          <form onSubmit={e => { e.preventDefault(); submit("WeekendOT", { ...wot, hours: parseFloat(wot.hours) }); }} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="sf-label">Employee Name *</label><input required {...inp(wot.name, v => setWot(o => ({...o, name: v})))} placeholder="Full name" /></div>
              <div><label className="sf-label">Employee Email *</label><EmailUsernameInput required value={wot.email} onChange={v => setWot(o => ({...o, email: v}))} /></div>
              <div><label className="sf-label">Date Requested (Weekend) *</label><input required type="date" {...inp(wot.date, v => setWot(o => ({...o, date: v})))} /></div>
              <div><label className="sf-label">Requested Hours *</label><input required type="number" min="0.5" max="12" step="0.5" {...inp(wot.hours, v => setWot(o => ({...o, hours: v})))} placeholder="e.g. 4" /></div>
            </div>
            <div><label className="sf-label">Reason *</label><textarea required {...inp(wot.reason, v => setWot(o => ({...o, reason: v})))} placeholder="Why is weekend OT needed?" /></div>
            <div><label className="sf-label">Expected Deliverables *</label><textarea required {...inp(wot.deliverables, v => setWot(o => ({...o, deliverables: v})))} placeholder="What will you deliver?" /></div>
            <div><label className="sf-label">Supporting Notes</label><textarea {...inp(wot.notes, v => setWot(o => ({...o, notes: v})))} placeholder="Additional notes…" style={{ minHeight: 60 }} /></div>
            {error   && <p className="text-sm text-rose-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400 font-medium">{success}</p>}
            <button type="submit" disabled={loading} className="w-full bg-sky-600 hover:bg-sky-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">Submit Weekend OT Request</button>
          </form>
        </div>
      )}

      {/* Leave */}
      {tab === "leave" && (
        <div className="card rounded-xl p-6">
          <h3 className="font-semibold text-emerald-300 mb-0.5 text-sm">Leave Request</h3>
          <p className="text-xs text-slate-500 mb-4">Must be submitted at least <strong className="text-slate-300">1 week in advance</strong></p>
          <form onSubmit={e => { e.preventDefault(); submit("DayOff", { ...lv, date: lv.startDate, reason: lv.reason }); }} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="sf-label">Employee Name *</label><input required {...inp(lv.name, v => setLv(o => ({...o, name: v})))} placeholder="Full name" /></div>
              <div><label className="sf-label">Employee Email *</label>
                <EmailUsernameInput required value={lv.email} onChange={v => { setLv(o => ({...o, email: v})); lookupManager(v); }} />
              </div>
              <div>
                <label className="sf-label">Department *</label>
                <select className="sf-input" required value={lv.department} onChange={e => setLv(o => ({...o, department: e.target.value}))}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="sf-label">Type of Leave *</label>
                <select className="sf-input" required value={lv.leaveType} onChange={e => setLv(o => ({...o, leaveType: e.target.value}))}>
                  <option value="">Select leave type…</option>
                  {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="sf-label">Start Date *</label><input required type="date" {...inp(lv.startDate, v => setLv(o => ({...o, startDate: v})))} /></div>
              <div><label className="sf-label">End Date *</label><input required type="date" {...inp(lv.endDate, v => setLv(o => ({...o, endDate: v})))} /></div>
              <div className="md:col-span-2">
                <label className="sf-label">Department Head / Manager</label>
                <div className="relative">
                  <input {...inp(lv.manager, v => setLv(o => ({...o, manager: v})))} placeholder={loadingManager ? "Looking up…" : "Auto-filled from employee DB or type manually"} />
                  {loadingManager && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">searching…</span>}
                </div>
                <p className="text-xs text-slate-600 mt-1">Auto-populated from the employee database. If no department head is listed, type manually.</p>
              </div>
            </div>
            <div><label className="sf-label">Reason for Leave *</label><textarea required {...inp(lv.reason, v => setLv(o => ({...o, reason: v})))} placeholder="Reason for leave…" /></div>
            <div><label className="sf-label">Coverage Notes</label><textarea {...inp(lv.coverage, v => setLv(o => ({...o, coverage: v})))} placeholder="How will your accounts be covered during your absence?" /></div>
            <div><label className="sf-label">Supporting Notes</label><textarea {...inp(lv.notes, v => setLv(o => ({...o, notes: v})))} placeholder="Any additional notes…" style={{ minHeight: 60 }} /></div>
            {error   && <p className="text-sm text-rose-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400 font-medium">{success}</p>}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">Submit Leave Request</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AttendancePortalPage() {
  return (
    <Suspense>
      <AttendanceForm />
    </Suspense>
  );
}
