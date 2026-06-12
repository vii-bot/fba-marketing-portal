"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, Plus, Eye, EyeOff, Archive, Trash2, Save, Pencil, FileText,
} from "lucide-react";
import { useSession, type SessionUser } from "@/lib/auth-client";
import { canManageInternalDocs } from "@/lib/permissions";
import {
  DOC_CATEGORIES, DOC_STATUSES, DOC_VISIBILITY_ROLES, DOC_CHANGE_TYPES,
  DOC_PRIORITIES, DOC_ISSUE_STATUSES, DOC_ROADMAP_STATUSES, formatDate,
} from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import type { SOPBlock } from "@/lib/sop-blocks";
import { BlockEditor } from "@/components/lms/sop-builder/BlockEditor";
import { BlockRenderer } from "@/components/lms/sop-builder/BlockRenderer";

interface DocPageRecord {
  id: string; title: string; slug: string; category: string; tags: string[];
  status: string; visibility: string[]; blocks: SOPBlock[] | null;
  priority: string | null; itemStatus: string | null; changeType: string | null;
  featureArea: string | null; targetDate: string | null;
  createdBy: string; createdByName: string; updatedBy: string | null; updatedByName: string | null;
  createdAt: string; updatedAt: string;
}

interface FormState {
  title: string; category: string; tags: string; visibility: string[]; status: string;
  priority: string; itemStatus: string; changeType: string; featureArea: string; targetDate: string;
  blocks: SOPBlock[];
}

const STATUS_STYLE: Record<string, string> = {
  Draft:     "text-slate-400 bg-slate-500/10",
  Published: "text-emerald-400 bg-emerald-500/10",
  Archived:  "text-slate-500 bg-slate-600/10",
};

const PRIORITY_STYLE: Record<string, string> = {
  Low:    "text-slate-400 bg-slate-500/10",
  Medium: "text-sky-400 bg-sky-500/10",
  High:   "text-amber-400 bg-amber-500/10",
  Urgent: "text-rose-400 bg-rose-500/10",
};

type CategoryField = "priority" | "itemStatus" | "changeType" | "featureArea" | "targetDate";

function categoryFields(category: string): CategoryField[] {
  switch (category) {
    case "Changelog":    return ["changeType", "featureArea"];
    case "Known Issues": return ["priority", "itemStatus", "featureArea"];
    case "Roadmap":      return ["priority", "itemStatus", "featureArea", "targetDate"];
    case "Feature Documentation":
    case "API & Backend Notes":
    case "Database & Data Models":
      return ["featureArea"];
    default: return [];
  }
}

function itemStatusOptions(category: string): string[] {
  if (category === "Known Issues") return DOC_ISSUE_STATUSES;
  if (category === "Roadmap") return DOC_ROADMAP_STATUSES;
  return [];
}

export default function InternalDocsPage() {
  const { data: session } = useSession();
  const user = session?.user as (SessionUser & { department?: string | null }) | undefined;
  const canManage = user ? canManageInternalDocs({ role: user.role, department: user.department, email: user.email }) : false;

  const [pages, setPages]     = useState<DocPageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch]   = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState<FormState | null>(null);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<string | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTitle, setNewTitle]       = useState("");
  const [newCategory, setNewCategory] = useState<string>(DOC_CATEGORIES[0]);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/internal-docs");
    if (res.ok) setPages(await res.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const filtered = useMemo(() => {
    return pages.filter(p => {
      if (category && p.category !== category) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        const haystack = [p.title, p.category, ...(p.tags ?? []), JSON.stringify(p.blocks ?? "")].join(" ").toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [pages, category, statusFilter, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of pages) counts[p.category] = (counts[p.category] ?? 0) + 1;
    return counts;
  }, [pages]);

  const selected = pages.find(p => p.id === selectedId) ?? null;

  const select = (p: DocPageRecord) => {
    setSelectedId(p.id);
    setEditing(false);
  };

  const backToList = () => {
    setSelectedId(null);
    setEditing(false);
  };

  const openNew = () => {
    setNewTitle("");
    setNewCategory(category || DOC_CATEGORIES[0]);
    setNewModalOpen(true);
  };

  const openEdit = (p: DocPageRecord) => {
    setForm({
      title: p.title, category: p.category, tags: (p.tags ?? []).join(", "),
      visibility: p.visibility ?? [], status: p.status,
      priority: p.priority ?? "", itemStatus: p.itemStatus ?? "", changeType: p.changeType ?? "",
      featureArea: p.featureArea ?? "", targetDate: p.targetDate ? p.targetDate.slice(0, 10) : "",
      blocks: p.blocks ?? [],
    });
    setSelectedId(p.id);
    setEditing(true);
  };

  const createPage = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const res = await fetch("/api/internal-docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), category: newCategory, status: "Draft" }),
    });
    setSaving(false);
    if (res.ok) {
      const created: DocPageRecord = await res.json();
      setPages(p => [...p, created]);
      setNewModalOpen(false);
      openEdit(created);
      showToast("Page created.");
    } else {
      const d = await res.json();
      showToast(d.error ?? "Failed to create page.");
    }
  };

  const save = async () => {
    if (!form || !selectedId) return;
    if (!form.title.trim()) { showToast("Title is required."); return; }
    setSaving(true);
    const body = {
      id: selectedId,
      title: form.title.trim(),
      category: form.category,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      visibility: form.visibility,
      status: form.status,
      blocks: form.blocks,
      priority: form.priority || null,
      itemStatus: form.itemStatus || null,
      changeType: form.changeType || null,
      featureArea: form.featureArea || null,
      targetDate: form.targetDate || null,
    };
    const res = await fetch("/api/internal-docs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const updated: DocPageRecord = await res.json();
      setPages(ps => ps.map(p => p.id === updated.id ? updated : p));
      setEditing(false);
      showToast("Saved.");
    } else {
      const d = await res.json();
      showToast(d.error ?? "Failed to save.");
    }
  };

  const setPageStatus = async (id: string, status: string) => {
    const res = await fetch("/api/internal-docs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const updated: DocPageRecord = await res.json();
      setPages(ps => ps.map(p => p.id === updated.id ? updated : p));
      showToast(`Page ${status.toLowerCase()}.`);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this page permanently? This cannot be undone.")) return;
    const res = await fetch(`/api/internal-docs?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setPages(ps => ps.filter(p => p.id !== id));
      backToList();
      showToast("Page deleted.");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition mb-3">
          <ArrowLeft size={12} /> Back to Admin Dashboard
        </Link>
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Admin</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Internal Documentation</h2>
        <p className="text-sm text-slate-400 opacity-70">How the platform works, how it&apos;s built, and how to maintain it — admin/developer reference, separate from the employee Resource Portal.</p>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-900/15 px-4 py-2.5 mb-4 text-sm text-emerald-300">
          {toast}
        </div>
      )}

      <div className="grid lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card rounded-xl p-3">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="sf-input pl-8" placeholder="Search docs…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <nav className="space-y-0.5 text-sm">
              <button
                onClick={() => setCategory("")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition text-left ${!category ? "bg-indigo-500/15 text-indigo-300" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"}`}
              >
                <span>All Pages</span>
                <span className="text-xs text-slate-500">{pages.length}</span>
              </button>
              {DOC_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition text-left ${category === cat ? "bg-indigo-500/15 text-indigo-300" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"}`}
                >
                  <span>{cat}</span>
                  <span className="text-xs text-slate-500">{categoryCounts[cat] ?? 0}</span>
                </button>
              ))}
            </nav>
          </div>

          {canManage && (
            <div className="card rounded-xl p-3">
              <label className="sf-label">Status</label>
              <select className="sf-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                {DOC_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          {canManage && (
            <button onClick={openNew} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
              <Plus size={15} /> New Page
            </button>
          )}
        </div>

        {/* Main */}
        <div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : editing && form ? (
            <PageEditor
              form={form} setForm={updater => setForm(prev => prev ? updater(prev) : prev)}
              onSave={save} onCancel={() => setEditing(false)}
              saving={saving}
            />
          ) : selected ? (
            <PageViewer
              page={selected} canManage={canManage}
              onBack={backToList} onEdit={() => openEdit(selected)}
              onSetStatus={setPageStatus} onDelete={remove}
            />
          ) : (
            <PageList pages={filtered} onSelect={select} />
          )}
        </div>
      </div>

      {/* New Page modal */}
      <Modal open={newModalOpen} onClose={() => setNewModalOpen(false)} title="New Documentation Page"
        footer={<>
          <button onClick={createPage} disabled={saving || !newTitle.trim()} className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50">
            {saving ? "Creating…" : "Create"}
          </button>
          <button onClick={() => setNewModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="sf-label">Title *</label>
            <input className="sf-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Taskboard Flow" autoFocus />
          </div>
          <div>
            <label className="sf-label">Category *</label>
            <select className="sf-input" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
              {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PageList({ pages, onSelect }: { pages: DocPageRecord[]; onSelect: (p: DocPageRecord) => void }) {
  if (pages.length === 0) {
    return (
      <div className="card rounded-xl py-16 text-center text-slate-500">
        <FileText size={32} className="mx-auto mb-2 opacity-25" />
        <p className="text-sm">No documentation pages found.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {pages.map(p => (
        <button key={p.id} onClick={() => onSelect(p)} className="card rounded-xl p-4 w-full text-left hover:border-indigo-400/40 transition">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-slate-200 text-sm">{p.title}</span>
                <span className="text-xs text-indigo-300">{p.category}</span>
                {p.featureArea && <span className="text-xs text-slate-500">{p.featureArea}</span>}
              </div>
              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.tags.map(t => <span key={t} className="text-xs text-slate-500 bg-slate-800/60 rounded px-1.5 py-0.5">{t}</span>)}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-1.5">Updated {formatDate(p.updatedAt)} by {p.updatedByName ?? p.createdByName}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status] ?? "text-slate-400 bg-slate-600/20"}`}>{p.status}</span>
              {p.priority && <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLE[p.priority] ?? ""}`}>{p.priority}</span>}
              {p.itemStatus && <span className="text-xs text-slate-400">{p.itemStatus}</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function PageViewer({ page, canManage, onBack, onEdit, onSetStatus, onDelete }: {
  page: DocPageRecord; canManage: boolean;
  onBack: () => void; onEdit: () => void;
  onSetStatus: (id: string, status: string) => void; onDelete: (id: string) => void;
}) {
  const fields = categoryFields(page.category);
  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition mb-3">
            <ArrowLeft size={12} /> All pages
          </button>
          <p className="text-xs uppercase tracking-wider text-indigo-400 mb-1">{page.category}</p>
          <h3 className="font-bold text-xl text-slate-100 mb-1">{page.title}</h3>
          <p className="text-xs text-slate-500">/{page.slug} · Updated {formatDate(page.updatedAt)} by {page.updatedByName ?? page.createdByName}</p>
          {page.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {page.tags.map(t => <span key={t} className="text-xs text-slate-400 bg-slate-800/60 rounded px-2 py-0.5">{t}</span>)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[page.status] ?? "text-slate-400 bg-slate-600/20"}`}>{page.status}</span>
          {canManage && (
            <div className="flex flex-wrap gap-1.5 justify-end">
              <button onClick={onEdit} className="flex items-center gap-1.5 border border-slate-600 hover:border-indigo-400/50 transition text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg">
                <Pencil size={12} /> Edit
              </button>
              {page.status === "Published" ? (
                <button onClick={() => onSetStatus(page.id, "Draft")} className="flex items-center gap-1.5 border border-amber-500/40 text-amber-300 hover:border-amber-400/60 transition text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <EyeOff size={12} /> Unpublish
                </button>
              ) : (
                <button onClick={() => onSetStatus(page.id, "Published")} className="flex items-center gap-1.5 border border-emerald-500/40 text-emerald-300 hover:border-emerald-400/60 transition text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <Eye size={12} /> Publish
                </button>
              )}
              {page.status !== "Archived" && (
                <button onClick={() => onSetStatus(page.id, "Archived")} className="flex items-center gap-1.5 border border-slate-600 hover:border-rose-400/50 transition text-slate-400 hover:text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <Archive size={12} /> Archive
                </button>
              )}
              <button onClick={() => onDelete(page.id)} className="flex items-center gap-1.5 border border-slate-600 hover:border-rose-400/50 transition text-slate-400 hover:text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-lg">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {fields.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3 mb-5 pb-5 border-b border-slate-700/40">
          {fields.includes("changeType") && page.changeType && (
            <div><p className="sf-label !mb-0.5">Type of update</p><p className="text-sm text-slate-300">{page.changeType}</p></div>
          )}
          {fields.includes("priority") && page.priority && (
            <div><p className="sf-label !mb-0.5">Priority</p><span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_STYLE[page.priority] ?? ""}`}>{page.priority}</span></div>
          )}
          {fields.includes("itemStatus") && page.itemStatus && (
            <div><p className="sf-label !mb-0.5">Status</p><p className="text-sm text-slate-300">{page.itemStatus}</p></div>
          )}
          {fields.includes("featureArea") && page.featureArea && (
            <div><p className="sf-label !mb-0.5">Affected feature</p><p className="text-sm text-slate-300">{page.featureArea}</p></div>
          )}
          {fields.includes("targetDate") && page.targetDate && (
            <div><p className="sf-label !mb-0.5">Target timeline</p><p className="text-sm text-slate-300">{formatDate(page.targetDate)}</p></div>
          )}
        </div>
      )}

      <BlockRenderer blocks={page.blocks ?? []} />
    </div>
  );
}

function PageEditor({ form, setForm, onSave, onCancel, saving }: {
  form: FormState; setForm: (updater: (prev: FormState) => FormState) => void;
  onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  const fields = categoryFields(form.category);
  const itemOptions = itemStatusOptions(form.category);
  return (
    <div className="space-y-6">
      <div className="card rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-slate-200 mb-4">Details</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="sf-label">Title *</label>
            <input className="sf-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="sf-label">Category</label>
            <select className="sf-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="sf-label">Status</label>
            <select className="sf-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {DOC_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="sf-label">Tags (comma separated)</label>
            <input className="sf-input" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. taskboard, time-tracking" />
          </div>

          {fields.includes("changeType") && (
            <div>
              <label className="sf-label">Type of update</label>
              <select className="sf-input" value={form.changeType} onChange={e => setForm(f => ({ ...f, changeType: e.target.value }))}>
                <option value="">Select…</option>
                {DOC_CHANGE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
          {fields.includes("priority") && (
            <div>
              <label className="sf-label">Priority</label>
              <select className="sf-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="">Select…</option>
                {DOC_PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          )}
          {fields.includes("itemStatus") && (
            <div>
              <label className="sf-label">Status</label>
              <select className="sf-input" value={form.itemStatus} onChange={e => setForm(f => ({ ...f, itemStatus: e.target.value }))}>
                <option value="">Select…</option>
                {itemOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {fields.includes("featureArea") && (
            <div>
              <label className="sf-label">Affected feature / module</label>
              <input className="sf-input" value={form.featureArea} onChange={e => setForm(f => ({ ...f, featureArea: e.target.value }))} placeholder="e.g. Taskboard" />
            </div>
          )}
          {fields.includes("targetDate") && (
            <div>
              <label className="sf-label">Target timeline (optional)</label>
              <input type="date" className="sf-input" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="sf-label">Visibility — additional roles (besides Admin/Executive)</label>
            <div className="flex flex-wrap gap-1.5">
              {DOC_VISIBILITY_ROLES.map(role => {
                const active = form.visibility.includes(role);
                return (
                  <button
                    key={role} type="button"
                    onClick={() => setForm(f => ({ ...f, visibility: active ? f.visibility.filter(r => r !== role) : [...f.visibility, role] }))}
                    className={`text-xs rounded-lg px-2.5 py-1.5 border transition ${active ? "border-indigo-400/60 bg-indigo-900/30 text-indigo-300" : "border-slate-700/50 text-slate-400 hover:border-slate-600"}`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-600 mt-1">These roles can view this page once it&apos;s Published. Admins and Executives always have access.</p>
          </div>
        </div>
      </div>

      <div className="card rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-slate-200 mb-4">Content</h4>
        <BlockEditor blocks={form.blocks} onChange={blocks => setForm(f => ({ ...f, blocks }))} />
      </div>

      <div className="card rounded-2xl p-5">
        <div className="flex items-center gap-2.5">
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
            <Save size={14} /> {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
