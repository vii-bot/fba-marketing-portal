"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { formatDate, REPORT_TYPES } from "@/lib/utils";
import { ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";

interface Account {
  platform: string; accountType: string; username: string; url: string;
}
interface Creator {
  id: string; creatorCode: string; creatorName: string; accounts: any;
}
interface ReportHighlight { performance: string; link: string; notes: string }
interface CreatorReport {
  id: string; creatorId: string; creatorCode: string; creatorName: string;
  accountUsername: string; department: string; reportType: string; status: string;
  followerCount: number; followerChange: string | null; summary: string;
  highlights: ReportHighlight[] | null; whatsWorking: string | null; actionItems: string | null;
  additionalNotes: string | null; links: string[] | null; relayed: boolean;
  reviewerNotes: string | null; submittedBy: string; submittedByName: string; submittedAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  Draft:                  "text-slate-400 bg-slate-500/10",
  Submitted:              "text-sky-400 bg-sky-500/10",
  "Needs Revision":       "text-amber-400 bg-amber-500/10",
  "Approved for Creator": "text-indigo-400 bg-indigo-500/10",
  "Sent to Creator":      "text-emerald-400 bg-emerald-500/10",
  Archived:               "text-slate-500 bg-slate-600/10",
};

function emptyForm() {
  return {
    creatorId: "", accountUsername: "", department: "", reportType: REPORT_TYPES[0],
    followerCount: "", followerChange: "", summary: "",
    highlights: [] as ReportHighlight[],
    whatsWorking: "", actionItems: "", additionalNotes: "", links: "",
  };
}

export default function CreatorReportsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [reports,  setReports]  = useState<CreatorReport[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form,     setForm]     = useState(emptyForm());
  const [error,    setError]    = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [cRes, rRes] = await Promise.all([
      fetch("/api/creators?archived=false"),
      fetch("/api/creator-reports"),
    ]);
    if (cRes.ok) setCreators(await cRes.json());
    if (rRes.ok) setReports(await rRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const accountsFor = (creatorId: string): Account[] => {
    const c = creators.find(c => c.id === creatorId);
    return Array.isArray(c?.accounts) ? c!.accounts as Account[] : [];
  };

  const openAdd = () => { setEditId(null); setForm(emptyForm()); setError(""); setModalOpen(true); };

  const openEdit = (r: CreatorReport) => {
    setEditId(r.id);
    setForm({
      creatorId: r.creatorId, accountUsername: r.accountUsername, department: r.department,
      reportType: r.reportType, followerCount: String(r.followerCount), followerChange: r.followerChange ?? "",
      summary: r.summary, highlights: r.highlights ?? [],
      whatsWorking: r.whatsWorking ?? "", actionItems: r.actionItems ?? "", additionalNotes: r.additionalNotes ?? "",
      links: (r.links ?? []).join("\n"),
    });
    setError("");
    setModalOpen(true);
  };

  const onSelectCreator = (creatorId: string) => {
    setForm(f => ({ ...f, creatorId, accountUsername: "", department: "" }));
  };

  const onSelectAccount = (username: string) => {
    const acc = accountsFor(form.creatorId).find(a => a.username === username);
    setForm(f => ({ ...f, accountUsername: username, department: acc?.platform ?? f.department }));
  };

  const addHighlightRow = () => setForm(f => ({ ...f, highlights: [...f.highlights, { performance: "", link: "", notes: "" }] }));
  const setHighlight = (i: number, key: keyof ReportHighlight, value: string) =>
    setForm(f => { const hs = [...f.highlights]; hs[i] = { ...hs[i], [key]: value }; return { ...f, highlights: hs }; });
  const removeHighlight = (i: number) => setForm(f => ({ ...f, highlights: f.highlights.filter((_, j) => j !== i) }));

  const submit = async (status: "Draft" | "Submitted") => {
    setError("");
    if (!form.creatorId || !form.accountUsername || !form.reportType || !form.summary.trim()) {
      setError("Creator, account, report type, and report summary are required.");
      return;
    }
    if (form.followerCount === "") {
      setError("Current follower count is required.");
      return;
    }
    setSubmitting(true);
    const body = {
      ...form,
      status,
      highlights: form.highlights.filter(h => h.performance || h.link || h.notes),
      links: form.links.split("\n").map(l => l.trim()).filter(Boolean),
    };
    const res = editId
      ? await fetch("/api/creator-reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...body }) })
      : await fetch("/api/creator-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setModalOpen(false);
      load();
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save report.");
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <Link href="/my-creators" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition mb-3"><ArrowLeft size={13} /> My Creators</Link>
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Creator Management</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Creator Reports</h2>
        <p className="text-sm text-slate-400 opacity-70">Submit weekly account updates for your assigned creators.</p>
      </div>

      {/* Weekly reporting rules */}
      <div className="card rounded-xl p-5 mb-6 text-sm text-slate-400 space-y-2">
        <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-2">Weekly Reporting Rules</p>
        <p>Submit an update for each creator/account once a week, <span className="text-slate-300">Monday through Wednesday</span>.</p>
        <p>If there&apos;s nothing significant, still submit a report saying there are no significant updates for the week.</p>
        <p>Report immediately (don&apos;t wait for the weekly window) for: new accounts, important account details, anything performing above average, account growth, or major highlights.</p>
        <p>If an account is being tested and the creator shouldn&apos;t know yet, submit it as an <span className="text-slate-300">Internal Report</span> instead of a Creator Report.</p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200 text-sm">Your Reports</h3>
        <button onClick={openAdd} disabled={creators.length === 0} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40">
          <Plus size={15} /> New Report
        </button>
      </div>

      {creators.length === 0 && !loading && (
        <div className="card rounded-xl p-6 mb-4 text-sm text-amber-300 bg-amber-500/5 border border-amber-500/20">
          You don&apos;t have any creators assigned to you yet, so there&apos;s nothing to report on.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : reports.length === 0 ? (
        <div className="card rounded-xl py-12 text-center text-slate-500">
          <FileText size={32} className="mx-auto mb-2 opacity-25" />
          <p className="text-sm">No reports submitted yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="card rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-slate-200 text-sm">{r.creatorName}</span>
                    <span className="text-xs text-slate-500">@{r.accountUsername}</span>
                    <span className="text-xs text-indigo-300">{r.department}</span>
                    <span className="text-xs text-slate-500">{r.reportType}</span>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{r.summary}</p>
                  <p className="text-xs text-slate-500 mt-1">Followers: {r.followerCount.toLocaleString()}{r.followerChange ? ` (${r.followerChange})` : ""} · Submitted {formatDate(r.submittedAt)}</p>
                  {r.status === "Needs Revision" && r.reviewerNotes && (
                    <p className="text-xs text-amber-300 mt-2">Reviewer notes: {r.reviewerNotes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? "text-slate-400 bg-slate-600/20"}`}>{r.status}</span>
                  {(r.status === "Draft" || r.status === "Needs Revision") && (
                    <button onClick={() => openEdit(r)} className="text-xs text-indigo-400 hover:text-indigo-300 transition">Edit{r.status === "Needs Revision" ? " & Resubmit" : ""}</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New / Edit Report Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Report" : "New Creator Report"} maxWidth="max-w-2xl"
        footer={<>
          <button onClick={() => submit("Submitted")} disabled={submitting} className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">
            {submitting ? "Saving…" : "Submit Report"}
          </button>
          <button onClick={() => submit("Draft")} disabled={submitting} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-indigo-400 transition">Save Draft</button>
          <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="sf-label">Creator *</label>
              <select className="sf-input" value={form.creatorId} onChange={e => onSelectCreator(e.target.value)}>
                <option value="">Select creator…</option>
                {creators.map(c => <option key={c.id} value={c.id}>{c.creatorName} ({c.creatorCode})</option>)}
              </select>
            </div>
            <div>
              <label className="sf-label">Account *</label>
              <select className="sf-input" value={form.accountUsername} onChange={e => onSelectAccount(e.target.value)} disabled={!form.creatorId}>
                <option value="">Select account…</option>
                {accountsFor(form.creatorId).map((a, i) => <option key={i} value={a.username}>@{a.username} ({a.platform})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="sf-label">Department</label><input className="sf-input" value={form.department} disabled placeholder="Set by account" /></div>
            <div>
              <label className="sf-label">Report Type *</label>
              <select className="sf-input" value={form.reportType} onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}>
                {REPORT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="sf-label">Current Follower Count *</label><input type="number" className="sf-input" value={form.followerCount} onChange={e => setForm(f => ({ ...f, followerCount: e.target.value }))} /></div>
            <div><label className="sf-label">Gain / Loss</label><input className="sf-input" value={form.followerChange} onChange={e => setForm(f => ({ ...f, followerChange: e.target.value }))} placeholder="e.g. +1.2K this week" /></div>
          </div>

          <div><label className="sf-label">Report Summary *</label><textarea className="sf-input" value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="What happened this week…" style={{ minHeight: 80 }} /></div>

          {/* Account Highlights */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="sf-label !mb-0">Account Highlights</label>
              <button type="button" onClick={addHighlightRow} className="text-xs text-indigo-400 hover:text-indigo-300 transition">+ Add Highlight</button>
            </div>
            {form.highlights.length === 0 ? (
              <p className="text-xs text-slate-500">No highlights added.</p>
            ) : (
              <div className="space-y-2">
                {form.highlights.map((h, i) => (
                  <div key={i} className="card rounded-lg p-3 grid grid-cols-3 gap-2">
                    <input className="sf-input" value={h.performance} onChange={e => setHighlight(i, "performance", e.target.value)} placeholder="Performance, e.g. 3.5M" />
                    <input className="sf-input" value={h.link} onChange={e => setHighlight(i, "link", e.target.value)} placeholder="Link" />
                    <div className="flex gap-1">
                      <input className="sf-input" value={h.notes} onChange={e => setHighlight(i, "notes", e.target.value)} placeholder="Notes (optional)" />
                      <button type="button" onClick={() => removeHighlight(i)} className="text-rose-400/60 hover:text-rose-400 transition px-2"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div><label className="sf-label">What&apos;s Working</label><textarea className="sf-input" value={form.whatsWorking} onChange={e => setForm(f => ({ ...f, whatsWorking: e.target.value }))} /></div>
          <div><label className="sf-label">Action Items</label><textarea className="sf-input" value={form.actionItems} onChange={e => setForm(f => ({ ...f, actionItems: e.target.value }))} /></div>
          <div><label className="sf-label">Additional Notes</label><textarea className="sf-input" value={form.additionalNotes} onChange={e => setForm(f => ({ ...f, additionalNotes: e.target.value }))} /></div>
          <div><label className="sf-label">Links (one per line)</label><textarea className="sf-input" value={form.links} onChange={e => setForm(f => ({ ...f, links: e.target.value }))} placeholder="https://…" /></div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
