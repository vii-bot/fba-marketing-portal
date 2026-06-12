"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FileText, Download, AlertTriangle, ShieldCheck } from "lucide-react";
import { formatDate, REPORT_TYPES, REPORT_STATUSES, ACTIVE_DEPARTMENTS, getWeekRange, todayLocalDate, getReportSections } from "@/lib/utils";
import { isAdmin, type PermUser } from "@/lib/permissions";

// Shape varies by platform — see lib/utils.ts HIGHLIGHT_FIELDS.
type ReportHighlight = Record<string, string | undefined>;
interface CreatorReport {
  id: string; creatorId: string; creatorCode: string; creatorName: string;
  accountUsername: string; department: string; reportType: string; status: string;
  followerCount: number | null; followerChange: string | null; summary: string | null;
  highlights: ReportHighlight[] | null; metrics: Record<string, unknown> | null;
  trafficNotes: string | null; whatsWorking: string | null; whatsNotWorking: string | null;
  needsTesting: string | null; actionItems: string | null; recommendedFocus: string | null;
  additionalNotes: string | null; links: string[] | null; relayed: boolean;
  reviewerNotes: string | null; submittedBy: string; submittedByName: string; submittedAt: string;
}
interface Account { platform: string; accountType: string; username: string; url: string }
interface CreatorRecord { id: string; creatorCode: string; creatorName: string; accounts: any }

const STATUS_STYLE: Record<string, string> = {
  Draft:                  "text-slate-400 bg-slate-500/10",
  Submitted:              "text-sky-400 bg-sky-500/10",
  "Needs Revision":       "text-amber-400 bg-amber-500/10",
  "Approved for Creator": "text-indigo-400 bg-indigo-500/10",
  "Sent to Creator":      "text-emerald-400 bg-emerald-500/10",
  Archived:               "text-slate-500 bg-slate-600/10",
};

const emptyFilters = () => ({
  creatorId: "", accountUsername: "", department: "", reportType: "", status: "", submittedBy: "", from: "", to: "",
});

function reportToText(r: CreatorReport): string {
  const lines = [
    `Creator: ${r.creatorName} (${r.creatorCode})`,
    `Account: @${r.accountUsername} · ${r.department}`,
    `Report Type: ${r.reportType}`,
    `Status: ${r.status}`,
    `Submitted By: ${r.submittedByName} (${r.submittedBy}) on ${formatDate(r.submittedAt)}`,
  ];
  for (const section of getReportSections(r)) {
    lines.push("", `${section.title}:`);
    for (const item of section.items) {
      lines.push(item.label ? `  ${item.label}: ${item.value}` : `  ${item.value}`);
    }
  }
  if ((r.links ?? []).length > 0) {
    lines.push("", "Links:");
    for (const l of r.links ?? []) lines.push(`  ${l}`);
  }
  if (r.reviewerNotes) lines.push("", `Reviewer Notes: ${r.reviewerNotes}`);
  return lines.join("\n");
}

function toTXT(reports: CreatorReport[]): string {
  const divider = `\n${"─".repeat(60)}\n\n`;
  return reports.map(reportToText).join(divider);
}

function downloadTXT(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCreatorReportsPage() {
  const [reports, setReports]       = useState<CreatorReport[]>([]);
  const [allReports, setAllReports] = useState<CreatorReport[]>([]);
  const [creators, setCreators]     = useState<CreatorRecord[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState(emptyFilters());
  const [exporting, setExporting]   = useState(false);

  const [reviewId, setReviewId]         = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewNotes, setReviewNotes]   = useState("");
  const [reviewRelayed, setReviewRelayed] = useState(false);

  const [complianceRunning, setComplianceRunning] = useState(false);
  const [complianceResult, setComplianceResult] = useState<{ checked: number; strikesIssued: number; alreadyLogged: number } | null>(null);

  const setFilter = (key: keyof ReturnType<typeof emptyFilters>, value: string) =>
    setFilters(f => ({ ...f, [key]: value }));

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await fetch(`/api/creator-reports?${params.toString()}`);
    if (res.ok) setReports(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters]);

  useEffect(() => {
    (async () => {
      const [allRes, sRes] = await Promise.all([
        fetch("/api/creator-reports"),
        fetch("/api/auth/get-session"),
      ]);
      if (allRes.ok) setAllReports(await allRes.json());
      if (sRes.ok) {
        const s = await sRes.json();
        const u = s?.user as PermUser | undefined;
        if (u && isAdmin(u)) {
          setIsAdminUser(true);
          const cRes = await fetch("/api/creators?archived=false");
          if (cRes.ok) setCreators(await cRes.json());
        }
      }
    })();
  }, []);

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allReports) map.set(r.creatorId, `${r.creatorName} (${r.creatorCode})`);
    return Array.from(map.entries());
  }, [allReports]);

  const stats = useMemo(() => ({
    total: reports.length,
    internal: reports.filter(r => r.reportType === "Internal Report").length,
    creator: reports.filter(r => r.reportType === "Creator Report").length,
    needsRevision: reports.filter(r => r.status === "Needs Revision").length,
  }), [reports]);

  const missingReports = useMemo(() => {
    if (!isAdminUser || creators.length === 0) return [];
    const { start } = getWeekRange();
    const result: { creatorName: string; creatorCode: string; accountUsername: string; department: string }[] = [];
    for (const c of creators) {
      const accounts: Account[] = Array.isArray(c.accounts) ? c.accounts : [];
      for (const a of accounts) {
        const hasReport = allReports.some(r =>
          r.creatorId === c.id && r.accountUsername === a.username && new Date(r.submittedAt) >= start
        );
        if (!hasReport) result.push({ creatorName: c.creatorName, creatorCode: c.creatorCode, accountUsername: a.username, department: a.platform });
      }
    }
    return result;
  }, [isAdminUser, creators, allReports]);

  const openReview = (r: CreatorReport) => {
    setReviewId(r.id); setReviewStatus(r.status); setReviewNotes(r.reviewerNotes ?? ""); setReviewRelayed(r.relayed);
  };
  const activeReport = reports.find(r => r.id === reviewId);

  const confirmReview = async () => {
    await fetch("/api/creator-reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reviewId, status: reviewStatus, reviewerNotes: reviewNotes, relayed: reviewRelayed }),
    });
    setReviewId(null);
    load();
    fetch("/api/creator-reports").then(r => r.ok && r.json()).then(d => d && setAllReports(d));
  };

  const exportTXT = async () => {
    setExporting(true);
    await fetch("/api/creator-reports/export", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters, count: reports.length, format: "TXT" }),
    });
    downloadTXT(toTXT(reports), `creator-reports-${todayLocalDate()}.txt`);
    setExporting(false);
  };

  const runComplianceCheck = async () => {
    setComplianceRunning(true);
    setComplianceResult(null);
    const res = await fetch("/api/creator-reports/compliance-check", { method: "POST" });
    if (res.ok) setComplianceResult(await res.json());
    setComplianceRunning(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Creator Management</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Creator Reports Admin</h2>
        <p className="text-sm text-slate-400 opacity-70">Review weekly account reports, relay updates to creators, and export records.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">Total Reports</p><p className="text-3xl font-bold text-slate-200">{stats.total}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">Internal Reports</p><p className="text-3xl font-bold text-slate-300">{stats.internal}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">Creator Reports</p><p className="text-3xl font-bold text-indigo-300">{stats.creator}</p></div>
        <div className="stat-card"><p className="text-xs text-slate-500 uppercase mb-1">Needs Revision</p><p className="text-3xl font-bold text-amber-400">{stats.needsRevision}</p></div>
      </div>

      {/* Missing weekly reports */}
      {isAdminUser && missingReports.length > 0 && (
        <div className="card rounded-xl p-5 mb-6 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            <h4 className="font-semibold text-slate-200 text-sm">Missing Weekly Reports ({missingReports.length})</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingReports.map((m, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-800/60 text-slate-300">
                {m.creatorName} · @{m.accountUsername} <span className="text-slate-500">({m.department})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weekly compliance check */}
      {isAdminUser && (
        <div className="card rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-400" />
              <h4 className="font-semibold text-slate-200 text-sm">Weekly Compliance Check</h4>
            </div>
            <button onClick={runComplianceCheck} disabled={complianceRunning} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-xs font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40">
              <ShieldCheck size={14} /> {complianceRunning ? "Running…" : "Run Weekly Compliance Check"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Issues a Compliance strike to any page runner who missed their mandatory Mon-Wed Creator Report for the most recently completed week. Safe to run more than once — already-logged weeks are skipped.
          </p>
          {complianceResult && (
            <p className="text-xs text-slate-300 mt-3">
              Checked {complianceResult.checked} account{complianceResult.checked === 1 ? "" : "s"} ·{" "}
              <span className="text-rose-400">{complianceResult.strikesIssued} strike{complianceResult.strikesIssued === 1 ? "" : "s"} issued</span> ·{" "}
              {complianceResult.alreadyLogged} already logged
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="sf-label">Creator</label>
          <select className="sf-input !w-auto" value={filters.creatorId} onChange={e => setFilter("creatorId", e.target.value)}>
            <option value="">All</option>
            {creatorOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
        <div>
          <label className="sf-label">Account</label>
          <input className="sf-input !w-auto" value={filters.accountUsername} onChange={e => setFilter("accountUsername", e.target.value)} placeholder="username" />
        </div>
        <div>
          <label className="sf-label">Department</label>
          <select className="sf-input !w-auto" value={filters.department} onChange={e => setFilter("department", e.target.value)}>
            <option value="">All</option>
            {ACTIVE_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="sf-label">Report Type</label>
          <select className="sf-input !w-auto" value={filters.reportType} onChange={e => setFilter("reportType", e.target.value)}>
            <option value="">All</option>
            {REPORT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="sf-label">Status</label>
          <select className="sf-input !w-auto" value={filters.status} onChange={e => setFilter("status", e.target.value)}>
            <option value="">All</option>
            {REPORT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="sf-label">Submitted By</label>
          <input className="sf-input !w-auto" value={filters.submittedBy} onChange={e => setFilter("submittedBy", e.target.value)} placeholder="email" />
        </div>
        <div>
          <label className="sf-label">From</label>
          <input type="date" className="sf-input !w-auto" value={filters.from} onChange={e => setFilter("from", e.target.value)} />
        </div>
        <div>
          <label className="sf-label">To</label>
          <input type="date" className="sf-input !w-auto" value={filters.to} onChange={e => setFilter("to", e.target.value)} />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setFilters(emptyFilters())} className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-xs hover:border-indigo-400 transition">Reset</button>
          <button onClick={exportTXT} disabled={exporting || reports.length === 0} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-xs font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40">
            <Download size={14} /> {exporting ? "Exporting…" : "Export All (.txt)"}
          </button>
        </div>
      </div>

      {/* Reports table */}
      <div className="card rounded-xl p-6">
        <h4 className="font-semibold text-slate-200 text-sm mb-4">Reports</h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-slate-500"><FileText size={32} className="mx-auto mb-2 opacity-25" /><p className="text-sm">No reports found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Creator</th><th>Account</th><th>Department</th><th>Type</th><th>Status</th>
                  <th>Followers</th><th>Submitted By</th><th>Date</th><th>Relayed</th><th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="text-slate-200 text-xs">{r.creatorName}</div>
                      <div className="text-xs text-slate-500">{r.creatorCode}</div>
                    </td>
                    <td className="text-xs">@{r.accountUsername}</td>
                    <td className="text-xs">{r.department}</td>
                    <td className="text-xs text-indigo-300">{r.reportType}</td>
                    <td><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? "text-slate-400 bg-slate-600/20"}`}>{r.status}</span></td>
                    <td className="text-xs">{r.followerCount !== null ? r.followerCount.toLocaleString() : "—"}{r.followerChange ? ` (${r.followerChange})` : ""}</td>
                    <td>
                      <div className="text-slate-200 text-xs">{r.submittedByName}</div>
                      <div className="text-xs text-slate-500">{r.submittedBy}</div>
                    </td>
                    <td className="text-xs text-slate-500">{formatDate(r.submittedAt)}</td>
                    <td className="text-xs">{r.relayed ? <span className="text-emerald-400">Yes</span> : "—"}</td>
                    <td><button onClick={() => openReview(r)} className="text-xs text-indigo-400 hover:text-indigo-300">Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review modal */}
      <Modal open={!!reviewId} onClose={() => setReviewId(null)} title="Review Creator Report" maxWidth="max-w-2xl"
        footer={<>
          <button onClick={confirmReview} className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Save</button>
          <button
            onClick={() => activeReport && downloadTXT(toTXT([activeReport]), `creator-report-${activeReport.creatorCode}-${activeReport.accountUsername}-${todayLocalDate()}.txt`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-indigo-400 transition"
          >
            <Download size={14} /> Export .txt
          </button>
          <button onClick={() => setReviewId(null)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
        </>}>
        {activeReport && (
          <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-lg p-4 text-sm text-slate-300 space-y-1.5">
              <p><span className="text-slate-500">Creator:</span> {activeReport.creatorName} ({activeReport.creatorCode})</p>
              <p><span className="text-slate-500">Account:</span> @{activeReport.accountUsername} · {activeReport.department}</p>
              <p><span className="text-slate-500">Report Type:</span> {activeReport.reportType}</p>
              <p><span className="text-slate-500">Submitted By:</span> {activeReport.submittedByName} ({activeReport.submittedBy}) on {formatDate(activeReport.submittedAt)}</p>
              {getReportSections(activeReport).map((sec, i) => (
                sec.items.length === 1 && sec.items[0].label === "" ? (
                  <div key={i}><span className="text-slate-500">{sec.title}:</span><p className="whitespace-pre-wrap mt-1">{sec.items[0].value}</p></div>
                ) : (
                  <div key={i}>
                    <span className="text-slate-500">{sec.title}:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                      {sec.items.map((it, j) => <li key={j}>{it.label ? `${it.label}: ` : ""}{it.value}</li>)}
                    </ul>
                  </div>
                )
              ))}
              {(activeReport.links ?? []).length > 0 && (
                <div>
                  <span className="text-slate-500">Links:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {(activeReport.links ?? []).map((l, i) => <li key={i}><a href={l} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 break-all">{l}</a></li>)}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="sf-label">Status</label>
              <select className="sf-input" value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}>
                {REPORT_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="sf-label">Reviewer Notes</label>
              <textarea className="sf-input" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Internal notes, requested revisions…" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={reviewRelayed} onChange={e => setReviewRelayed(e.target.checked)} />
              Relayed to creator
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
