"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Inbox, Pencil, Archive, ExternalLink, Star, Users, RotateCcw, Trash2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Account {
  platform: string; accountType: string; username: string; followers: string; url: string;
}
interface Highlight {
  id: string; platform: string; postLink: string | null; accountUsername: string | null;
  likes: number; reposts: number; views: number; comments: number; bookmarks: number;
  notes: string | null; submittedBy: string | null; createdAt: string;
}
interface Creator {
  id: string; creatorCode: string; creatorName: string; status: string; priority: string;
  needsMedia: boolean; needsReview: boolean; assignedPageRunners: string[];
  uploadsFolder: string | null; mediaFolder: string | null; overview: string | null;
  niche: any; assets: any; accounts: any; strategy: any;
  highlights: Highlight[];
  createdAt: string; updatedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUSES   = ["New","Active","Paused","Inactive","Dropped","Testing","Replacing Account"];
const PRIORITIES = ["High","Medium","Low"];
const ACC_TYPES  = ["FBA Main","FBA Backup","FBA Funnel","Promo","Other"];
const PLATFORMS  = ["X","Instagram","Reddit"];

const METRIC_LABELS: Record<string, { likes: string; reposts: string | null; views: string | null; comments: string; bookmarks: string | null }> = {
  X:         { likes: "Likes",   reposts: "Reposts",          views: "Views",       comments: "Comments", bookmarks: "Bookmarks" },
  Instagram: { likes: "Likes",   reposts: "Followers Gained", views: "Views/Plays", comments: "Comments", bookmarks: "Saves" },
  Reddit:    { likes: "Upvotes", reposts: "Shares",           views: null,          comments: "Comments", bookmarks: null },
};
const getMetrics = (platform: string) => METRIC_LABELS[platform] ?? METRIC_LABELS.X;

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
    creatorCode: "", creatorName: "", status: "New", priority: "Medium",
    needsMedia: false, needsReview: false, assignedPageRunners: "",
    uploadsFolder: "", mediaFolder: "", overview: "",
    niche: { niche: "", aesthetic: "", styles: "" },
    assets: { physical: "", strengths: "", weaknesses: "" },
    accounts: [] as Account[],
    strategy: { captionTone: "", dos: "", donts: "", recommendations: "", inspirations: "" },
    notes: "",
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MyCreatorsPage() {
  const [creators,     setCreators]     = useState<Creator[]>([]);
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [viewArchived, setViewArchived] = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusF,      setStatusF]      = useState("");
  const [priorityF,    setPriorityF]    = useState("");

  // Modal state
  const [editModal,    setEditModal]    = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editId,       setEditId]       = useState<string | null>(null);
  const [form,         setForm]         = useState(emptyForm());
  const [profileTab,   setProfileTab]   = useState<"overview"|"accounts"|"highlights"|"strategy"|"notes">("overview");
  const [selected,     setSelected]     = useState<Creator | null>(null);

  // Highlight form
  const [highlights,    setHighlights]    = useState<Highlight[]>([]);
  const [hlForm,        setHlForm]        = useState({ platform:"X", postLink:"", accountUsername:"", likes:"", reposts:"", views:"", comments:"", bookmarks:"", notes:"" });
  const [addingHL,      setAddingHL]      = useState(false);

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
    }
  };

  const loadHighlights = async (creatorId: string) => {
    const res = await fetch(`/api/highlights?creatorId=${creatorId}`);
    if (res.ok) setHighlights(await res.json());
  };

  useEffect(() => { load(viewArchived); }, [viewArchived]);

  // ── Filtered creators ─────────────────────────────────────────────────────────
  const filtered = creators.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.creatorName.toLowerCase().includes(q) && !c.creatorCode.toLowerCase().includes(q) && !c.assignedPageRunners.join(" ").toLowerCase().includes(q)) return false;
    if (statusF && c.status !== statusF) return false;
    if (priorityF && c.priority !== priorityF) return false;
    return true;
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
      uploadsFolder: c.uploadsFolder ?? "", mediaFolder: c.mediaFolder ?? "",
      overview: c.overview ?? "",
      niche:     c.niche     ?? { niche: "", aesthetic: "", styles: "" },
      assets:    c.assets    ?? { physical: "", strengths: "", weaknesses: "" },
      accounts:  c.accounts  ?? [],
      strategy:  c.strategy  ?? { captionTone: "", dos: "", donts: "", recommendations: "", inspirations: "" },
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
    loadHighlights(c.id);
  };

  const addHighlight = async () => {
    if (!selected) return;
    await fetch("/api/highlights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creatorId: selected.id, ...hlForm }) });
    setHlForm({ platform:"X", postLink:"", accountUsername:"", likes:"", reposts:"", views:"", comments:"", bookmarks:"", notes:"" });
    setAddingHL(false);
    loadHighlights(selected.id);
  };

  const deleteHighlight = async (id: string) => {
    await fetch("/api/highlights", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (selected) loadHighlights(selected.id);
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
            const lastHL = c.highlights?.[0];
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
                  {c.needsMedia  && <Chip label="⚠ Needs Media"  style="bg-orange-500/15 text-orange-300 border-orange-500/30" />}
                  {c.needsReview && <Chip label="⚠ Needs Review" style="bg-rose-500/15 text-rose-300 border-rose-500/30" />}
                </div>

                <div className="text-xs text-slate-500 space-y-1 border-t border-slate-700/30 pt-3">
                  {c.assignedPageRunners?.length > 0 && (
                    <p className="flex items-center gap-1.5"><Users size={11} />{c.assignedPageRunners.slice(0,2).join(", ")}{c.assignedPageRunners.length > 2 ? ` +${c.assignedPageRunners.length - 2}` : ""}</p>
                  )}
                  {lastHL && <p className="flex items-center gap-1.5"><Star size={11} /> Last highlight: {formatDate(lastHL.createdAt)}</p>}
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
            {selected.needsMedia  && <Chip label="⚠ Needs Media"  style="bg-orange-500/15 text-orange-300 border-orange-500/30" />}
            {selected.needsReview && <Chip label="⚠ Needs Review" style="bg-rose-500/15 text-rose-300 border-rose-500/30" />}
          </div>

          {/* Tab bar */}
          <div className="flex gap-0.5 bg-slate-800/60 rounded-xl p-1 mb-5">
            {(["overview","accounts","highlights","strategy","notes"] as const).map(t => (
              <button key={t} onClick={() => setProfileTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition capitalize ${profileTab === t ? "bg-slate-700 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}>{t}</button>
            ))}
          </div>

          {/* Overview */}
          {profileTab === "overview" && (
            <div className="space-y-4">
              {selected.overview && <p className="text-sm text-slate-300 leading-relaxed">{selected.overview}</p>}
              <div className="flex flex-wrap gap-3">
                {selected.uploadsFolder && <a href={selected.uploadsFolder} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"><ExternalLink size={12} /> Creator Uploads</a>}
                {selected.mediaFolder   && <a href={selected.mediaFolder}   target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition"><ExternalLink size={12} /> Media Folder</a>}
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
                      <p className="text-xs text-slate-500">{a.platform} · {a.followers} followers</p>
                    </div>
                    {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300"><ExternalLink size={14} /></a>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Highlights */}
          {profileTab === "highlights" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs uppercase tracking-widest text-amber-400 font-semibold">Top Posts</h4>
                <button onClick={() => setAddingHL(v => !v)} className="text-xs text-indigo-400 hover:text-indigo-300 transition">+ Log Highlight</button>
              </div>
              {addingHL && (() => {
                const m = getMetrics(hlForm.platform);
                const creatorAccounts: Account[] = Array.isArray(selected?.accounts) ? selected.accounts as Account[] : [];
                return (
                  <div className="card rounded-xl p-4 mb-4 space-y-3 border border-indigo-500/20">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="sf-label text-xs">Platform</label>
                        <select className="sf-input" value={hlForm.platform} onChange={e => setHlForm(f => ({ ...f, platform: e.target.value, reposts: "", views: "", bookmarks: "" }))}>
                          {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="sf-label text-xs">Account @</label>
                        {creatorAccounts.length > 0 ? (
                          <select className="sf-input" value={hlForm.accountUsername} onChange={e => {
                            const acc = creatorAccounts.find(a => a.username === e.target.value);
                            setHlForm(f => ({ ...f, accountUsername: e.target.value, platform: acc?.platform ?? f.platform }));
                          }}>
                            <option value="">Select or type…</option>
                            {creatorAccounts.map((a, i) => <option key={i} value={a.username}>@{a.username} ({a.platform})</option>)}
                          </select>
                        ) : (
                          <input className="sf-input" value={hlForm.accountUsername} onChange={e => setHlForm(f => ({...f, accountUsername: e.target.value}))} placeholder="@handle" />
                        )}
                      </div>
                      <div className="col-span-2"><label className="sf-label text-xs">Post URL</label><input className="sf-input" value={hlForm.postLink} onChange={e => setHlForm(f => ({...f, postLink: e.target.value}))} placeholder="https://…" /></div>
                      <div><label className="sf-label text-xs">{m.likes}</label><input className="sf-input" type="number" value={hlForm.likes} onChange={e => setHlForm(f => ({...f, likes: e.target.value}))} /></div>
                      {m.reposts   && <div><label className="sf-label text-xs">{m.reposts}</label><input className="sf-input" type="number" value={hlForm.reposts} onChange={e => setHlForm(f => ({...f, reposts: e.target.value}))} /></div>}
                      {m.views     && <div><label className="sf-label text-xs">{m.views}</label><input className="sf-input" type="number" value={hlForm.views} onChange={e => setHlForm(f => ({...f, views: e.target.value}))} /></div>}
                      <div><label className="sf-label text-xs">{m.comments}</label><input className="sf-input" type="number" value={hlForm.comments} onChange={e => setHlForm(f => ({...f, comments: e.target.value}))} /></div>
                      {m.bookmarks && <div><label className="sf-label text-xs">{m.bookmarks}</label><input className="sf-input" type="number" value={hlForm.bookmarks} onChange={e => setHlForm(f => ({...f, bookmarks: e.target.value}))} /></div>}
                      <div className="col-span-2"><label className="sf-label text-xs">Notes</label><input className="sf-input" value={hlForm.notes} onChange={e => setHlForm(f => ({...f, notes: e.target.value}))} placeholder="Why did it perform well?" /></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addHighlight} className="bg-amber-600 hover:bg-amber-500 transition text-white text-xs font-semibold px-4 py-2 rounded-lg">Save Highlight</button>
                      <button onClick={() => setAddingHL(false)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-400 text-xs">Cancel</button>
                    </div>
                  </div>
                );
              })()}
              {highlights.length === 0 ? <p className="text-sm text-slate-500">No highlights logged yet.</p> : (
                <div className="space-y-3">
                  {highlights.map(h => {
                    const m = getMetrics(h.platform ?? "X");
                    return (
                      <div key={h.id} className="rounded-xl border border-slate-700/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {h.accountUsername && <p className="text-xs text-slate-400">@{h.accountUsername}</p>}
                              <span className="text-xs text-slate-600">{h.platform ?? "X"}</span>
                            </div>
                            {h.postLink && <a href={h.postLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs truncate block transition">{h.postLink}</a>}
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                              <span>{m.likes}: {h.likes.toLocaleString()}</span>
                              {m.reposts   && <span>{m.reposts}: {h.reposts.toLocaleString()}</span>}
                              {m.views     && <span>{m.views}: {h.views.toLocaleString()}</span>}
                              <span>{m.comments}: {h.comments.toLocaleString()}</span>
                              {m.bookmarks && h.bookmarks > 0 && <span>{m.bookmarks}: {h.bookmarks.toLocaleString()}</span>}
                            </div>
                            {h.notes && <p className="text-xs text-slate-500 mt-1">{h.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-slate-500">{formatDate(h.createdAt)}</p>
                            <button onClick={() => deleteHighlight(h.id)} className="text-xs text-rose-400/60 hover:text-rose-400 transition mt-1">remove</button>
                          </div>
                        </div>
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
                    {s.recommendations && <div className="bg-slate-800/40 rounded-lg p-4"><p className="text-xs text-indigo-400 font-semibold mb-1 uppercase tracking-wider">Recommendations</p><p className="text-sm text-slate-300">{s.recommendations}</p></div>}
                    {s.inspirations     && <div className="bg-slate-800/40 rounded-lg p-4"><p className="text-xs text-purple-400 font-semibold mb-1 uppercase tracking-wider">Inspirations</p><p className="text-sm text-slate-300">{s.inspirations}</p></div>}
                    {!s.captionTone && !s.dos && !s.donts && !s.recommendations && !s.inspirations && <p className="text-sm text-slate-500">No strategy added yet.</p>}
                  </>
                );
              })()}
            </div>
          )}

          {/* Notes */}
          {profileTab === "notes" && (
            <div>
              {(() => {
                const notes = (selected.strategy as any)?.notes;
                return notes ? <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{notes}</p> : <p className="text-sm text-slate-500">No notes added yet.</p>;
              })()}
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
  const addAccount = () => setForm(p => ({ ...p, accounts: [...(p.accounts as Account[]), { platform:"X", accountType:"FBA Main", username:"", followers:"", url:"" }] }));
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
                {STATUSES.map(s => <option key={s}>{s}</option>)}
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
          <div><label className="sf-label">Media Folder</label><input className="sf-input" value={form.mediaFolder} onChange={e => f("mediaFolder")(e.target.value as string)} placeholder="https://…" /></div>
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
                <div><label className="sf-label text-xs">Followers</label><input className="sf-input" value={a.followers} onChange={e => setAcc(i, "followers", e.target.value)} placeholder="e.g. 15K" /></div>
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
          <div><label className="sf-label">Recommendations</label><textarea className="sf-input" value={(form.strategy as any).recommendations ?? ""} onChange={e => setStrategy("recommendations", e.target.value)} placeholder="Current strategy recommendations…" /></div>
          <div><label className="sf-label">Inspirations / References</label><textarea className="sf-input" value={(form.strategy as any).inspirations ?? ""} onChange={e => setStrategy("inspirations", e.target.value)} placeholder="Similar accounts, mood boards, viral posts…" /></div>
          <div><label className="sf-label">Team Notes (visible to all)</label><textarea className="sf-input" value={form.notes} onChange={e => f("notes")(e.target.value as string)} placeholder="Any team notes, blockers, or ongoing issues…" /></div>
        </div>
      )}
    </>
  );
}
