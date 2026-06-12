"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  formatDate, REPORT_TYPES, getReportFieldVisibility, getHighlightFields,
  formatHighlightFields, getReportSections, INSTAGRAM_METRIC_FIELDS, REPORT_FIELD_LABELS,
} from "@/lib/utils";
import { Plus, Search, Inbox, Pencil, Archive, ExternalLink, Users, RotateCcw, Trash2, ChevronDown } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Account {
  platform: string; accountType: string; username: string; url: string;
}
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
interface TeamNote {
  id: string; content: string; authorEmail: string; authorName: string;
  editedAt: string | null; createdAt: string;
}
interface Creator {
  id: string; creatorCode: string; creatorName: string; status: string; priority: string;
  needsMedia: boolean; needsReview: boolean; assignedPageRunners: string[];
  uploadsFolder: string | null; mediaFolder: string | null; signedPlatforms: string[]; overview: string | null;
  niche: any; assets: any; accounts: any; strategy: any;
  createdAt: string; updatedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUSES   = ["New","Active","Paused","Inactive","Dropped","Testing","Replacing Account"];
const CREATOR_STATUSES = ["Active","Paused","Inactive","Dropped"];
const PRIORITIES = ["High","Medium","Low"];
const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
const ACC_TYPES  = ["FBA Main","FBA Backup","FBA Funnel","Promo","Other"];
const PLATFORMS  = ["X","Instagram","Reddit"];

const REPORT_STATUS_STYLE: Record<string, string> = {
  Draft:                  "text-slate-400 bg-slate-500/10",
  Submitted:              "text-sky-400 bg-sky-500/10",
  "Needs Revision":       "text-amber-400 bg-amber-500/10",
  "Approved for Creator": "text-indigo-400 bg-indigo-500/10",
  "Sent to Creator":      "text-emerald-400 bg-emerald-500/10",
  Archived:               "text-slate-500 bg-slate-600/10",
};

const STATUS_STYLE: Record<string, string> = {
  Active:             "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  New:                "bg-indigo-500/20 text-indigo-300 border-indigo-500/45",
  Paused:             "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Inactive:           "bg-slate-500/15 text-slate-400 border-slate-500/30",
  Dropped:            "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Testing:            "bg-purple-500/15 text-purple-300 border-purple-500/30",
  "Replacing Account":"bg-sky-500/15 text-sky-300 border-sky-500/30",
};
const PRIORITY_STYLE: Record<string, string> = {
  High:   "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Medium: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Low:    "bg-slate-500/15 text-slate-300 border-slate-500/30",
};
const PLATFORM_STYLE: Record<string, string> = {
  X:         "bg-slate-700/60 text-slate-200 border-slate-500/50",
  Instagram: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  Reddit:    "bg-orange-500/15 text-orange-300 border-orange-500/30",
};

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Chip({ label, style }: { label: string; style?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${style ?? "bg-slate-700 text-slate-300 border-slate-600"}`}>
      {label}
    </span>
  );
}

// ── Empty creator form ──────────────────────────────────────────────────────────

function emptyForm() {
  return {
    creatorCode: "", creatorName: "", status: "Active", priority: "Medium",
    needsMedia: false, needsReview: false, assignedPageRunners: "",
    uploadsFolder: "", signedPlatforms: [] as string[], overview: "",
    niche: { niche: "", aesthetic: "", styles: "" },
    assets: { physical: "", strengths: "", weaknesses: "" },
    accounts: [] as Account[],
    strategy: { captionTone: "", dos: "", donts: "", inspirations: "" },
    notes: "",
  };
}

function emptyReportForm() {
  return {
    accountUsername: "", department: "", reportType: REPORT_TYPES[0],
    followerCount: "", followerChange: "",
    metrics: { reach: "", likes: "", comments: "", shares: "", saves: "", storyViews: "" } as Record<string, string>,
    summary: "",
    highlights: [] as ReportHighlight[],
    trafficNotes: "", whatsWorking: "", whatsNotWorking: "",
    needsTesting: "", actionItems: "", recommendedFocus: "", additionalNotes: "",
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MyCreatorsPage() {
  const [creators,     setCreators]     = useState<Creator[]>([]);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [viewArchived, setViewArchived] = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusF,      setStatusF]      = useState("");
  const [priorityF,    setPriorityF]    = useState("");
  const [sortBy,       setSortBy]       = useState<"code" | "priority" | "date">("code");

  // Modal state
  const [editModal,    setEditModal]    = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [form,         setForm]         = useState(emptyForm());
  const [profileTab,   setProfileTab]   = useState<"overview"|"accounts"|"reports"|"strategy"|"notes">("overview");
  const [selected,     setSelected]     = useState<Creator | null>(null);

  // Creator Reports
  const [creatorReports,   setCreatorReports]   = useState<CreatorReport[]>([]);
  const [addingReport,     setAddingReport]     = useState(false);
  const [reportForm,       setReportForm]       = useState(emptyReportForm());
  const [reportError,      setReportError]      = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [highlightModal,     setHighlightModal]     = useState(false);
  const [highlightDraft,     setHighlightDraft]     = useState<ReportHighlight>({});
  const [highlightEditIndex, setHighlightEditIndex] = useState<number | null>(null);
  const [expandedReportId,   setExpandedReportId]   = useState<string | null>(null);

  // Team Notes
  const [teamNotes,     setTeamNotes]     = useState<TeamNote[]>([]);
  const [noteText,      setNoteText]      = useState("");
  const [addingNote,    setAddingNote]    = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText,  setEditNoteText]  = useState("");

  // ── Fetch creators ────────────────────────────────────────────────────────────
  const load = async (archived = false) => {
    const res = await fetch(`/api/creators?archived=${archived}`);
    if (!res.ok) return;
    const data: Creator[] = await res.json();
    setCreators(data);
    const sessionRes = await fetch("/api/auth/get-session");
    if (sessionRes.ok) {
      const s = await sessionRes.json();
      setIsAdmin(s?.user?.role === "admin");
      setCurrentEmail(s?.user?.email ?? "");
    }
  };

  const loadCreatorReports = async (creatorId: string) => {
    const res = await fetch(`/api/creator-reports?creatorId=${creatorId}`);
    if (res.ok) setCreatorReports(await res.json());
  };

  const loadTeamNotes = async (creatorId: string) => {
    const res = await fetch(`/api/team-notes?creatorId=${creatorId}`);
    if (res.ok) setTeamNotes(await res.json());
  };

  useEffect(() => { load(viewArchived); }, [viewArchived]);

  // ── Filtered & sorted creators ────────────────────────────────────────────────
  const filtered = creators.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.creatorName.toLowerCase().includes(q) && !c.creatorCode.toLowerCase().includes(q) && !c.assignedPageRunners.join(" ").toLowerCase().includes(q)) return false;
    if (statusF && c.status !== statusF) return false;
    if (priorityF && c.priority !== priorityF) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "priority") return (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
    if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.creatorCode.localeCompare(b.creatorCode);
  });

  // ── Admin stats ───────────────────────────────────────────────────────────────
  const stats = {
    active:      creators.filter(c => c.status === "Active").length,
    needsMedia:  creators.filter(c => c.needsMedia).length,
    needsReview: creators.filter(c => c.needsReview).length,
    dropped:     creators.filter(c => c.status === "Dropped").length,
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => { setEditId(null); setForm(emptyForm()); setEditModal(true); };
  const openEdit = (c: Creator, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(c.id);
    setForm({
      creatorCode: c.creatorCode, creatorName: c.creatorName,
      status: c.status, priority: c.priority,
      needsMedia: c.needsMedia, needsReview: c.needsReview,
      assignedPageRunners: (c.assignedPageRunners ?? []).join(", "),
      uploadsFolder: c.uploadsFolder ?? "",
      signedPlatforms: c.signedPlatforms ?? [],
      overview: c.overview ?? "",
      niche:     c.niche     ?? { niche: "", aesthetic: "", styles: "" },
      assets:    c.assets    ?? { physical: "", strengths: "", weaknesses: "" },
      accounts:  c.accounts  ?? [],
      strategy:  c.strategy  ?? { captionTone: "", dos: "", donts: "", inspirations: "" },
      notes: (c.strategy as any)?.notes ?? "",
    });
    setEditModal(true);
  };

  const save = async () => {
    if (!form.creatorCode.trim()) { alert("Creator Code is required."); return; }
    if (!form.creatorName.trim()) { alert("Creator Name is required."); return; }
    const body = {
      ...form,
      assignedPageRunners: form.assignedPageRunners.split(",").map((e: string) => e.trim()).filter(Boolean),
      strategy: { ...form.strategy, notes: form.notes },
      ...(form.status === "Dropped" && { archived: true }),
    };
    let res: Response;
    try {
      if (editId) {
        res = await fetch("/api/creators", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...body }) });
      } else {
        res = await fetch("/api/creators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
    } catch (err: any) {
      alert(`Network error — server may be unreachable: ${err?.message ?? "Failed to fetch"}`);
      return;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `HTTP ${res.status}`;
      try { const j = JSON.parse(text); message = j.error ?? j.message ?? message; } catch {}
      console.error("Creator save error:", res.status, text);
      alert(`Failed to save creator: ${message}`);
      return;
    }
    setEditModal(false);
    load();
  };

  const archive = async (c: Creator, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Archive this creator?")) return;
    await fetch("/api/creators", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id }) });
    load(viewArchived);
  };

  const restore = async (c: Creator, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch("/api/creators", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, archived: false }) });
    load(true);
  };

  const permanentDelete = async (c: Creator, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete "${c.creatorName}"? This cannot be undone.`)) return;
    await fetch("/api/creators", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, permanent: true }) });
    load(true);
  };

  const openProfile = (c: Creator) => {
    setSelected(c); setProfileTab("overview"); setProfileModal(true);
    setAddingReport(false); setReportForm(emptyReportForm()); setReportError("");
    setExpandedReportId(null);
    loadCreatorReports(c.id);
    loadTeamNotes(c.id);
  };

  const addNote = async () => {
    if (!selected || !noteText.trim()) return;
    setAddingNote(true);
    await fetch("/api/team-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creatorId: selected.id, content: noteText }) });
    setNoteText("");
    setAddingNote(false);
    loadTeamNotes(selected.id);
  };

  const saveEditNote = async (id: string) => {
    if (!editNoteText.trim() || !selected) return;
    await fetch("/api/team-notes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, content: editNoteText }) });
    setEditingNoteId(null);
    loadTeamNotes(selected.id);
  };

  const deleteNote = async (id: string) => {
    if (!selected || !confirm("Delete this note?")) return;
    await fetch("/api/team-notes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadTeamNotes(selected.id);
  };

  const openAddHighlight = () => { setHighlightDraft({}); setHighlightEditIndex(null); setHighlightModal(true); };
  const openEditHighlight = (i: number) => { setHighlightDraft(reportForm.highlights[i]); setHighlightEditIndex(i); setHighlightModal(true); };
  const saveHighlight = () => {
    setReportForm(f => {
      const hs = [...f.highlights];
      if (highlightEditIndex !== null) hs[highlightEditIndex] = highlightDraft;
      else hs.push(highlightDraft);
      return { ...f, highlights: hs };
    });
    setHighlightModal(false);
  };
  const removeReportHighlight = (i: number) => setReportForm(f => ({ ...f, highlights: f.highlights.filter((_, j) => j !== i) }));

  const submitReport = async (status: "Draft" | "Submitted") => {
    if (!selected) return;
    setReportError("");
    if (!reportForm.accountUsername || !reportForm.department || !reportForm.reportType) {
      setReportError("Account and report type are required.");
      return;
    }
    setReportSubmitting(true);
    const visibility = getReportFieldVisibility(reportForm.department, reportForm.reportType);
    const metricsEntries = Object.entries(reportForm.metrics).filter(([, v]) => v !== "");
    const body = {
      creatorId: selected.id,
      accountUsername: reportForm.accountUsername,
      department: reportForm.department,
      reportType: reportForm.reportType,
      followerCount: visibility.followerCount && reportForm.followerCount !== "" ? reportForm.followerCount : null,
      followerChange: visibility.followerChange ? (reportForm.followerChange || null) : null,
      metrics: visibility.metrics && metricsEntries.length > 0 ? Object.fromEntries(metricsEntries) : null,
      summary: visibility.summary ? (reportForm.summary || null) : null,
      highlights: reportForm.highlights.filter(h => Object.values(h).some(v => (v ?? "").toString().trim() !== "")),
      trafficNotes: visibility.trafficNotes ? (reportForm.trafficNotes || null) : null,
      whatsWorking: visibility.whatsWorking ? (reportForm.whatsWorking || null) : null,
      whatsNotWorking: visibility.whatsNotWorking ? (reportForm.whatsNotWorking || null) : null,
      needsTesting: visibility.needsTesting ? (reportForm.needsTesting || null) : null,
      actionItems: visibility.actionItems ? (reportForm.actionItems || null) : null,
      recommendedFocus: visibility.recommendedFocus ? (reportForm.recommendedFocus || null) : null,
      additionalNotes: visibility.additionalNotes ? (reportForm.additionalNotes || null) : null,
      status,
    };
    const res = await fetch("/api/creator-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setReportForm(emptyReportForm());
      setAddingReport(false);
      loadCreatorReports(selected.id);
    } else {
      const d = await res.json();
      setReportError(d.error ?? "Failed to save report.");
    }
    setReportSubmitting(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="module-header rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">FBA Creator Management</p>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>
              {viewArchived ? "Archived Creators" : "My Creators Dashboard"}
            </h2>
            <p className="text-sm text-slate-400 opacity-70">
              {creators.length} creator{creators.length !== 1 ? "s" : ""} · {viewArchived ? "Archived creators — restore or permanently delete." : "Your assigned creator roster, status, profiles, and strategy."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <>
                <button
                  onClick={() => setViewArchived(v => !v)}
                  className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition ${viewArchived ? "bg-amber-600/20 border-amber-500/40 text-amber-300 hover:bg-amber-600/30" : "border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500"}`}
                >
                  <Archive size={15} /> {viewArchived ? "Back to Active" : "View Archived"}
                </button>
                {!viewArchived && (
                  <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
                    <Plus size={15} /> Add Creator
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Admin stat cards */}
      {isAdmin && !viewArchived && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            { label: "Active",       value: stats.active,      color: "text-emerald-400" },
            { label: "Needs Media",  value: stats.needsMedia,  color: "text-orange-400" },
            { label: "Needs Review", value: stats.needsReview, color: "text-rose-400" },
            { label: "Dropped",      value: stats.dropped,     color: "text-slate-400" },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p className="text-xs text-slate-500 uppercase mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & filters */}
      <div className="card rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="sf-input pl-8" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, or page runner…" />
          </div>
          <select className="db-filter" value={statusF}   onChange={e => setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="db-filter" value={priorityF} onChange={e => setPriorityF(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="db-filter" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="code">Sort: Creator Code</option>
            <option value="priority">Sort: Priority</option>
            <option value="date">Sort: Date Added</option>
          </select>
        </div>
      </div>

      {/* Creator grid */}
      {filtered.length === 0 ? (
        <div className="card rounded-xl py-12 text-center text-slate-500">
          <Inbox size={36} className="mx-auto mb-2 opacity-25" />
          <p className="text-sm">{search || statusF || priorityF ? "No creators match your filters." : "No creators yet."}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const accs   = Array.isArray(c.accounts) ? c.accounts : [];
            return (
              <div key={c.id} onClick={() => openProfile(c)} className="card rounded-xl p-5 cursor-pointer hover:border-indigo-400/50 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-slate-500 mb-0.5">{c.creatorCode}</p>
                    <p className="font-bold text-slate-100 truncate">{c.creatorName}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1.5 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                      {viewArchived ? (
                        <>
                          <button onClick={e => restore(c, e)}        title="Restore" className="text-slate-500 hover:text-emerald-400 transition p-0.5"><RotateCcw size={13} /></button>
                          <button onClick={e => permanentDelete(c, e)} title="Delete permanently" className="text-slate-500 hover:text-rose-400 transition p-0.5"><Trash2 size={13} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={e => openEdit(c, e)} title="Edit"    className="text-slate-500 hover:text-indigo-400 transition p-0.5"><Pencil size={13} /></button>
                          <button onClick={e => archive(c, e)}  title="Archive" className="text-slate-500 hover:text-amber-400 transition p-0.5"><Archive size={13} /></button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Chip label={c.status}   style={STATUS_STYLE[c.status]} />
                  <Chip label={c.priority} style={PRIORITY_STYLE[c.priority]} />
                  {(c.signedPlatforms ?? []).map(p => <Chip key={p} label={p} style={PLATFORM_STYLE[p]} />)}
                  {c.needsMedia  && <Chip label="⚠ Needs Media"  style="bg-orange-500/15 text-orange-300 border-orange-500/30" />}
                  {c.needsReview && <Chip label="⚠ Needs Review" style="bg-rose-500/15 text-rose-300 border-rose-500/30" />}
                </div>

                <div className="text-xs text-slate-500 space-y-1 border-t border-slate-700/30 pt-3">
                  {c.assignedPageRunners?.length > 0 && (
                    <p className="flex items-center gap-1.5"><Users size={11} />{c.assignedPageRunners.slice(0,2).join(", ")}{c.assignedPageRunners.length > 2 ? ` +${c.assignedPageRunners.length - 2}` : ""}</p>
                  )}
                  {accs.length > 0 && <p className="flex items-center gap-1.5"><span>📱</span> {accs.length} account{accs.length !== 1 ? "s" : ""}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title={editId ? "Edit Creator" : "Add Creator"} maxWidth="max-w-2xl"
        footer={<>
          <button onClick={save} className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Save Creator</button>
          <button onClick={() => setEditModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
        </>}>
        <EditTabs form={form} setForm={setForm} />
      </Modal>

      {/* ── Creator Profile Modal ─────────────────────────────────────────── */}
      {selected && (
        <Modal open={profileModal} onClose={() => setProfileModal(false)} title={selected.creatorName} maxWidth="max-w-3xl"
          footer={
            isAdmin && !viewArchived ? (
              <button onClick={e => { openEdit(selected, e as any); setProfileModal(false); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold rounded-xl">Edit Creator</button>
            ) : undefined
          }>
          {/* Profile header chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Chip label={selected.status}   style={STATUS_STYLE[selected.status]} />
            <Chip label={selected.priority} style={PRIORITY_STYLE[selected.priority]} />
            {(selected.signedPlatforms ?? []).map(p => <Chip key={p} label={p} style={PLATFORM_STYLE[p]} />)}
            {selected.needsMedia  && <Chip label="⚠ Needs Media"  style="bg-orange-500/15 text-orange-300 border-orange-500/30" />}
            {selected.needsReview && <Chip label="⚠ Needs Review" style="bg-rose-500/15 text-rose-300 border-rose-500/30" />}
          </div>

          {/* Tab bar */}
          <div className="flex gap-0.5 bg-slate-800/60 rounded-xl p-1 mb-5">
            {(["overview","accounts","reports","strategy","notes"] as const).map(t => (
              <button key={t} onClick={() => setProfileTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition capitalize ${profileTab === t ? "bg-slate-700 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}>{t}</button>
            ))}
          </div>

          {/* Overview */}
          {profileTab === "overview" && (
            <div className="space-y-4">
              {selected.overview && <p className="text-sm text-slate-300 leading-relaxed">{selected.overview}</p>}
              <div className="flex flex-wrap gap-3">
                {selected.uploadsFolder && <a href={selected.uploadsFolder} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"><ExternalLink size={12} /> Creator Uploads</a>}
              </div>
              {selected.niche && (
                <div className="grid md:grid-cols-2 gap-3">
                  {[["Niche", (selected.niche as any).niche], ["Aesthetic", (selected.niche as any).aesthetic], ["Content Styles", (selected.niche as any).styles]].map(([k, v]) => v ? (
                    <div key={k as string} className="bg-slate-800/40 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">{k as string}</p><p className="text-sm text-slate-300">{v as string}</p></div>
                  ) : null)}
                </div>
              )}
              {selected.assets && (
                <div className="grid md:grid-cols-3 gap-3">
                  {[["Physical", (selected.assets as any).physical], ["Strengths", (selected.assets as any).strengths], ["Weaknesses", (selected.assets as any).weaknesses]].map(([k, v]) => v ? (
                    <div key={k as string} className="bg-slate-800/40 rounded-lg p-3"><p className="text-xs text-slate-500 mb-1">{k as string}</p><p className="text-sm text-slate-300">{v as string}</p></div>
                  ) : null)}
                </div>
              )}
            </div>
          )}

          {/* Accounts */}
          {profileTab === "accounts" && (
            <div className="space-y-3">
              {(!selected.accounts || (Array.isArray(selected.accounts) && (selected.accounts as Account[]).length === 0)) ? (
                <p className="text-sm text-slate-500">No accounts added yet.</p>
              ) : (
                (selected.accounts as Account[]).map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-slate-700/40 p-4">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-slate-200 text-sm">@{a.username}</span>
                        <Chip label={a.accountType} />
                      </div>
                      <p className="text-xs text-slate-500">{a.platform}</p>
                    </div>
                    {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300"><ExternalLink size={14} /></a>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Reports */}
          {profileTab === "reports" && (
            <div>
              <div className="card rounded-xl p-4 mb-4 text-sm text-slate-400 space-y-2">
                <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-1">Weekly Reporting Rules</p>
                <p>Submit an update for each creator/account once a week, <span className="text-slate-300">Monday through Wednesday</span>.</p>
                <p>If there&apos;s nothing significant, still submit a report saying there are no significant updates for the week.</p>
                <p>Report immediately (don&apos;t wait for the weekly window) for: new accounts, important account details, anything performing above average, account growth, or major highlights.</p>
                <p>If an account is being tested and the creator shouldn&apos;t know yet, submit it as an <span className="text-slate-300">Internal Report</span> instead of a Creator Report.</p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Reports</h4>
                <button onClick={() => setAddingReport(v => !v)} className="text-xs text-indigo-400 hover:text-indigo-300 transition">+ New Report</button>
              </div>

              {addingReport && (() => {
                const creatorAccounts: Account[] = Array.isArray(selected?.accounts) ? selected.accounts as Account[] : [];
                const platform = reportForm.department;
                const visibility = getReportFieldVisibility(platform, reportForm.reportType);
                return (
                  <div className="card rounded-xl p-4 mb-4 space-y-3 border border-indigo-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="sf-label text-xs">Account *</label>
                        <select className="sf-input" value={reportForm.accountUsername} onChange={e => {
                          const acc = creatorAccounts.find(a => a.username === e.target.value);
                          setReportForm(f => ({ ...f, accountUsername: e.target.value, department: acc?.platform ?? f.department }));
                        }}>
                          <option value="">Select account…</option>
                          {creatorAccounts.map((a, i) => <option key={i} value={a.username}>@{a.username} ({a.platform})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="sf-label text-xs">Report Type *</label>
                        <select className="sf-input" value={reportForm.reportType} onChange={e => setReportForm(f => ({ ...f, reportType: e.target.value }))}>
                          {REPORT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    {(visibility.followerCount || visibility.followerChange) && (
                      <div className="grid grid-cols-2 gap-2">
                        {visibility.followerCount && (
                          <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.followerCount}</label><input type="number" className="sf-input" value={reportForm.followerCount} onChange={e => setReportForm(f => ({ ...f, followerCount: e.target.value }))} /></div>
                        )}
                        {visibility.followerChange && (
                          <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.followerChange}</label><input className="sf-input" value={reportForm.followerChange} onChange={e => setReportForm(f => ({ ...f, followerChange: e.target.value }))} placeholder="e.g. +1.2K this week" /></div>
                        )}
                      </div>
                    )}

                    {visibility.metrics && (
                      <div>
                        <label className="sf-label text-xs">Engagement Metrics</label>
                        <div className="grid grid-cols-3 gap-2">
                          {INSTAGRAM_METRIC_FIELDS.map(f => (
                            <div key={f.key}>
                              <label className="sf-label text-xs">{f.label}</label>
                              <input type="number" className="sf-input" value={reportForm.metrics[f.key] ?? ""} onChange={e => setReportForm(rf => ({ ...rf, metrics: { ...rf.metrics, [f.key]: e.target.value } }))} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {visibility.summary && (
                      <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.summary}</label><textarea className="sf-input" value={reportForm.summary} onChange={e => setReportForm(f => ({ ...f, summary: e.target.value }))} /></div>
                    )}

                    {visibility.highlights && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="sf-label !mb-0">{REPORT_FIELD_LABELS.highlights}</label>
                          <button type="button" onClick={openAddHighlight} className="text-xs text-indigo-400 hover:text-indigo-300 transition">+ Add Highlight</button>
                        </div>
                        {reportForm.highlights.length === 0 ? (
                          <p className="text-xs text-slate-500">No highlights added.</p>
                        ) : (
                          <div className="space-y-2">
                            {reportForm.highlights.map((h, i) => {
                              const fields = formatHighlightFields(h, platform);
                              return (
                                <div key={i} className="card rounded-lg p-3 flex items-start justify-between gap-2">
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300">
                                    {fields.length === 0 ? <span className="text-slate-500">(no details yet)</span> : fields.map((f, j) => (
                                      <span key={j}><span className="text-slate-500">{f.label}:</span> {f.value}</span>
                                    ))}
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <button type="button" onClick={() => openEditHighlight(i)} className="text-indigo-400/70 hover:text-indigo-400 transition px-1"><Pencil size={13} /></button>
                                    <button type="button" onClick={() => removeReportHighlight(i)} className="text-rose-400/60 hover:text-rose-400 transition px-1"><Trash2 size={13} /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {visibility.trafficNotes && (
                      <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.trafficNotes}</label><textarea className="sf-input" value={reportForm.trafficNotes} onChange={e => setReportForm(f => ({ ...f, trafficNotes: e.target.value }))} /></div>
                    )}
                    {visibility.whatsWorking && (
                      <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.whatsWorking}</label><textarea className="sf-input" value={reportForm.whatsWorking} onChange={e => setReportForm(f => ({ ...f, whatsWorking: e.target.value }))} /></div>
                    )}
                    {visibility.whatsNotWorking && (
                      <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.whatsNotWorking}</label><textarea className="sf-input" value={reportForm.whatsNotWorking} onChange={e => setReportForm(f => ({ ...f, whatsNotWorking: e.target.value }))} /></div>
                    )}
                    {visibility.needsTesting && (
                      <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.needsTesting}</label><textarea className="sf-input" value={reportForm.needsTesting} onChange={e => setReportForm(f => ({ ...f, needsTesting: e.target.value }))} /></div>
                    )}
                    {visibility.actionItems && (
                      <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.actionItems}</label><textarea className="sf-input" value={reportForm.actionItems} onChange={e => setReportForm(f => ({ ...f, actionItems: e.target.value }))} /></div>
                    )}
                    {visibility.recommendedFocus && (
                      <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.recommendedFocus}</label><textarea className="sf-input" value={reportForm.recommendedFocus} onChange={e => setReportForm(f => ({ ...f, recommendedFocus: e.target.value }))} /></div>
                    )}
                    {visibility.additionalNotes && (
                      <div><label className="sf-label text-xs">{REPORT_FIELD_LABELS.additionalNotes}</label><textarea className="sf-input" value={reportForm.additionalNotes} onChange={e => setReportForm(f => ({ ...f, additionalNotes: e.target.value }))} /></div>
                    )}

                    {reportError && <p className="text-sm text-rose-400">{reportError}</p>}

                    <div className="flex gap-2">
                      <button onClick={() => submitReport("Submitted")} disabled={reportSubmitting} className="bg-indigo-600 hover:bg-indigo-500 transition text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                        {reportSubmitting ? "Saving…" : "Submit Report"}
                      </button>
                      <button onClick={() => submitReport("Draft")} disabled={reportSubmitting} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 text-xs hover:border-indigo-400 transition">Save Draft</button>
                      <button onClick={() => { setAddingReport(false); setReportForm(emptyReportForm()); setReportError(""); }} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 text-xs">Cancel</button>
                    </div>

                    {/* + Add Highlight modal — fields depend on the selected account's platform */}
                    <Modal open={highlightModal} onClose={() => setHighlightModal(false)} title={highlightEditIndex !== null ? "Edit Highlight" : "Add Highlight"} maxWidth="max-w-md"
                      footer={<>
                        <button onClick={saveHighlight} className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Save</button>
                        <button onClick={() => setHighlightModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
                      </>}>
                      <div className="space-y-3">
                        {getHighlightFields(platform).map(f => (
                          <div key={f.key}>
                            <label className="sf-label text-xs">{f.label}</label>
                            <input
                              type={f.type === "number" ? "number" : "text"}
                              className="sf-input"
                              value={highlightDraft[f.key] ?? ""}
                              onChange={e => setHighlightDraft(d => ({ ...d, [f.key]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    </Modal>
                  </div>
                );
              })()}

              {creatorReports.length === 0 ? <p className="text-sm text-slate-500">No reports submitted yet.</p> : (
                <div className="space-y-2">
                  {creatorReports.map(r => {
                    const expanded = expandedReportId === r.id;
                    const sections = getReportSections(r);
                    return (
                      <div key={r.id} className="rounded-xl border border-slate-700/40 overflow-hidden">
                        <div
                          onClick={() => setExpandedReportId(expanded ? null : r.id)}
                          className="flex items-center justify-between gap-3 flex-wrap p-4 cursor-pointer hover:bg-slate-800/30 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs text-slate-400">@{r.accountUsername}</span>
                              <span className="text-xs text-indigo-300">{r.department}</span>
                              <span className="text-xs text-slate-500">{r.reportType}</span>
                            </div>
                            <p className="text-xs text-slate-500">Submitted {formatDate(r.submittedAt)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${REPORT_STATUS_STYLE[r.status] ?? "text-slate-400 bg-slate-600/20"}`}>{r.status}</span>
                            <ChevronDown size={15} className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                        {expanded && (
                          <div className="px-4 pb-4 pt-3 border-t border-slate-700/40 space-y-1.5">
                            {sections.map((sec, i) => (
                              sec.items.length === 1 && sec.items[0].label === "" ? (
                                <p key={i} className="text-xs text-slate-400 whitespace-pre-wrap"><span className="text-slate-500 font-semibold">{sec.title}:</span> {sec.items[0].value}</p>
                              ) : (
                                <div key={i}>
                                  <p className="text-xs font-semibold text-slate-400">{sec.title}</p>
                                  <div className="space-y-0.5">
                                    {sec.items.map((it, j) => (
                                      <p key={j} className="text-xs text-slate-400 whitespace-pre-wrap">{it.label ? <span className="text-slate-500">{it.label}: </span> : null}{it.value}</p>
                                    ))}
                                  </div>
                                </div>
                              )
                            ))}
                            {r.status === "Needs Revision" && r.reviewerNotes && (
                              <p className="text-xs text-amber-300 mt-2">Reviewer notes: {r.reviewerNotes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Strategy */}
          {profileTab === "strategy" && (
            <div className="space-y-4">
              {selected.strategy && (() => {
                const s = selected.strategy as any;
                return (
                  <>
                    {s.captionTone && <div className="bg-slate-800/40 rounded-lg p-4"><p className="text-xs text-emerald-400 font-semibold mb-1 uppercase tracking-wider">Caption Tone Guide</p><p className="text-sm text-slate-300">{s.captionTone}</p></div>}
                    <div className="grid md:grid-cols-2 gap-3">
                      {s.dos   && <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-3"><p className="text-xs text-emerald-400 font-semibold mb-2 uppercase tracking-wider">✅ Do's</p><p className="text-sm text-slate-300 whitespace-pre-wrap">{s.dos}</p></div>}
                      {s.donts && <div className="bg-rose-900/20 border border-rose-500/20 rounded-lg p-3"><p className="text-xs text-rose-400 font-semibold mb-2 uppercase tracking-wider">🚫 Don'ts</p><p className="text-sm text-slate-300 whitespace-pre-wrap">{s.donts}</p></div>}
                    </div>
                    {s.inspirations && <div className="bg-slate-800/40 rounded-lg p-4"><p className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">Inspirations</p><p className="text-sm text-slate-300">{s.inspirations}</p></div>}
                    {!s.captionTone && !s.dos && !s.donts && !s.inspirations && <p className="text-sm text-slate-500">No strategy added yet.</p>}
                  </>
                );
              })()}
            </div>
          )}

          {/* Team Notes */}
          {profileTab === "notes" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <textarea className="sf-input" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a team note…" style={{ minHeight: 70 }} />
                <button onClick={addNote} disabled={!noteText.trim() || addingNote} className="bg-indigo-600 hover:bg-indigo-500 transition text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
                  {addingNote ? "Adding…" : "Add Note"}
                </button>
              </div>

              {(() => {
                const legacy = (selected.strategy as any)?.notes;
                return legacy ? (
                  <div className="bg-slate-800/40 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">Legacy Notes</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{legacy}</p>
                  </div>
                ) : null;
              })()}

              {teamNotes.length === 0 ? (
                <p className="text-sm text-slate-500">No team notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {teamNotes.map(n => (
                    <div key={n.id} className="rounded-xl border border-slate-700/40 p-3">
                      {editingNoteId === n.id ? (
                        <div className="space-y-2">
                          <textarea className="sf-input" value={editNoteText} onChange={e => setEditNoteText(e.target.value)} style={{ minHeight: 60 }} />
                          <div className="flex gap-3">
                            <button onClick={() => saveEditNote(n.id)} className="text-xs text-emerald-400 hover:text-emerald-300 transition">Save</button>
                            <button onClick={() => setEditingNoteId(null)} className="text-xs text-slate-400 hover:text-slate-200 transition">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                            <span>{n.authorName} · {formatDateTime(n.createdAt)}{n.editedAt ? " (edited)" : ""}</span>
                            {(isAdmin || n.authorEmail.toLowerCase() === currentEmail.toLowerCase()) && (
                              <div className="flex gap-3 shrink-0">
                                <button onClick={() => { setEditingNoteId(n.id); setEditNoteText(n.content); }} className="hover:text-indigo-400 transition">edit</button>
                                <button onClick={() => deleteNote(n.id)} className="hover:text-rose-400 transition">delete</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Edit/Add Tabs Sub-component ────────────────────────────────────────────────

function EditTabs({ form, setForm }: { form: ReturnType<typeof emptyForm>; setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyForm>>> }) {
  const [tab, setTab] = useState<"info"|"niche"|"assets"|"accounts"|"strategy">("info");
  const f = (k: string) => (v: string | boolean) => setForm(p => ({ ...p, [k]: v }));
  const setNiche    = (k: string, v: string) => setForm(p => ({ ...p, niche:    { ...(p.niche    as any), [k]: v } }));
  const setAssets   = (k: string, v: string) => setForm(p => ({ ...p, assets:   { ...(p.assets   as any), [k]: v } }));
  const setStrategy = (k: string, v: string) => setForm(p => ({ ...p, strategy: { ...(p.strategy as any), [k]: v } }));

  // accounts array helpers
  const addAccount = () => setForm(p => ({ ...p, accounts: [...(p.accounts as Account[]), { platform:"X", accountType:"FBA Main", username:"", url:"" }] }));
  const setAcc = (i: number, k: keyof Account, v: string) => setForm(p => {
    const accs = [...(p.accounts as Account[])]; accs[i] = { ...accs[i], [k]: v }; return { ...p, accounts: accs };
  });
  const removeAcc = (i: number) => setForm(p => ({ ...p, accounts: (p.accounts as Account[]).filter((_,j) => j !== i) }));

  return (
    <>
      <div className="flex gap-0.5 bg-slate-800/60 rounded-xl p-1 mb-4">
        {(["info","niche","assets","accounts","strategy"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition capitalize ${tab === t ? "bg-slate-700 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}>{t}</button>
        ))}
      </div>

      {tab === "info" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="sf-label">Creator Code *</label><input className="sf-input" value={form.creatorCode} onChange={e => f("creatorCode")(e.target.value)} placeholder="e.g. LUNA01" /></div>
            <div><label className="sf-label">Creator Name *</label><input className="sf-input" value={form.creatorName} onChange={e => f("creatorName")(e.target.value)} placeholder="Display name" /></div>
            <div><label className="sf-label">Status</label>
              <select className="sf-input" value={form.status} onChange={e => f("status")(e.target.value)}>
                {(CREATOR_STATUSES.includes(form.status) ? CREATOR_STATUSES : [...CREATOR_STATUSES, form.status]).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="sf-label">Priority</label>
              <select className="sf-input" value={form.priority} onChange={e => f("priority")(e.target.value)}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-6 py-1">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.needsMedia}  onChange={e => f("needsMedia")(e.target.checked)}  style={{ width:"auto" }} /><span className="text-sm text-orange-300 font-medium">Needs Media</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.needsReview} onChange={e => f("needsReview")(e.target.checked)} style={{ width:"auto" }} /><span className="text-sm text-rose-300 font-medium">Needs Review</span></label>
          </div>
          <div><label className="sf-label">Assigned Page Runner(s)</label><input className="sf-input" value={form.assignedPageRunners} onChange={e => f("assignedPageRunners")(e.target.value as string)} placeholder="Comma-separated emails or names" /></div>
          <div><label className="sf-label">Creator Uploads Folder</label><input className="sf-input" value={form.uploadsFolder} onChange={e => f("uploadsFolder")(e.target.value as string)} placeholder="https://…" /></div>
          <div>
            <label className="sf-label">Signed Platforms</label>
            <div className="flex items-center gap-4 mt-1">
              {PLATFORMS.map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" style={{ width: "auto" }}
                    checked={(form.signedPlatforms as string[]).includes(p)}
                    onChange={e => setForm(prev => ({
                      ...prev,
                      signedPlatforms: e.target.checked
                        ? [...(prev.signedPlatforms as string[]), p]
                        : (prev.signedPlatforms as string[]).filter(x => x !== p),
                    }))}
                  />
                  <span className={`text-sm font-medium ${PLATFORM_STYLE[p].split(" ")[1]}`}>{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div><label className="sf-label">Overview / Bio</label><textarea className="sf-input" value={form.overview} onChange={e => f("overview")(e.target.value as string)} placeholder="Brief creator overview…" /></div>
        </div>
      )}

      {tab === "niche" && (
        <div className="space-y-4">
          <div><label className="sf-label">Niche</label><input className="sf-input" value={(form.niche as any).niche ?? ""} onChange={e => setNiche("niche", e.target.value)} placeholder="e.g. Fitness, Lifestyle, Gaming…" /></div>
          <div><label className="sf-label">Aesthetic</label><input className="sf-input" value={(form.niche as any).aesthetic ?? ""} onChange={e => setNiche("aesthetic", e.target.value)} placeholder="e.g. Dark, Minimalist, Colorful…" /></div>
          <div><label className="sf-label">Content Styles</label><textarea className="sf-input" value={(form.niche as any).styles ?? ""} onChange={e => setNiche("styles", e.target.value)} placeholder="Video styles, photo angles, preferred formats…" /></div>
        </div>
      )}

      {tab === "assets" && (
        <div className="space-y-4">
          <div><label className="sf-label">Physical / Visual Attributes</label><textarea className="sf-input" value={(form.assets as any).physical ?? ""} onChange={e => setAssets("physical", e.target.value)} placeholder="e.g. Petite, tattoos, dark hair…" /></div>
          <div><label className="sf-label">Strengths</label><textarea className="sf-input" value={(form.assets as any).strengths ?? ""} onChange={e => setAssets("strengths", e.target.value)} placeholder="What content types perform best for them?" /></div>
          <div><label className="sf-label">Weaknesses</label><textarea className="sf-input" value={(form.assets as any).weaknesses ?? ""} onChange={e => setAssets("weaknesses", e.target.value)} placeholder="What to avoid for this creator?" /></div>
        </div>
      )}

      {tab === "accounts" && (
        <div className="space-y-3">
          {(form.accounts as Account[]).map((a, i) => (
            <div key={i} className="card rounded-xl p-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="sf-label text-xs">Platform</label>
                  <select className="sf-input" value={a.platform} onChange={e => setAcc(i, "platform", e.target.value)}>
                    {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="sf-label text-xs">Account Type</label>
                  <select className="sf-input" value={a.accountType} onChange={e => setAcc(i, "accountType", e.target.value)}>
                    {ACC_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="sf-label text-xs">Username</label><input className="sf-input" value={a.username} onChange={e => setAcc(i, "username", e.target.value)} placeholder="@handle" /></div>
                <div className="col-span-2"><label className="sf-label text-xs">Profile URL</label><input className="sf-input" value={a.url} onChange={e => setAcc(i, "url", e.target.value)} placeholder="https://…" /></div>
              </div>
              <button onClick={() => removeAcc(i)} className="text-xs text-rose-400/60 hover:text-rose-400 transition">Remove account</button>
            </div>
          ))}
          <button onClick={addAccount} className="w-full py-2.5 rounded-xl border border-dashed border-slate-600 text-slate-500 hover:border-indigo-500 hover:text-indigo-400 transition text-sm">+ Add Account</button>
        </div>
      )}

      {tab === "strategy" && (
        <div className="space-y-4">
          <div><label className="sf-label">Caption Tone Guide</label><textarea className="sf-input" value={(form.strategy as any).captionTone ?? ""} onChange={e => setStrategy("captionTone", e.target.value)} placeholder="How should captions sound? Short, provocative, conversational…" /></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><label className="sf-label">Do's</label><textarea className="sf-input" value={(form.strategy as any).dos ?? ""} onChange={e => setStrategy("dos", e.target.value)} placeholder="One per line…" style={{ minHeight: 80 }} /></div>
            <div><label className="sf-label">Don'ts</label><textarea className="sf-input" value={(form.strategy as any).donts ?? ""} onChange={e => setStrategy("donts", e.target.value)} placeholder="One per line…" style={{ minHeight: 80 }} /></div>
          </div>
          <div><label className="sf-label">Inspirations / References</label><textarea className="sf-input" value={(form.strategy as any).inspirations ?? ""} onChange={e => setStrategy("inspirations", e.target.value)} placeholder="Similar accounts, mood boards, viral posts…" /></div>
          <div><label className="sf-label">Team Notes (visible to all)</label><textarea className="sf-input" value={form.notes} onChange={e => f("notes")(e.target.value as string)} placeholder="Any team notes, blockers, or ongoing issues…" /></div>
        </div>
      )}
    </>
  );
}
