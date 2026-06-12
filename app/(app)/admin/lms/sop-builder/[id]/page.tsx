"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Eye, EyeOff, Copy, Archive, Sparkles, Loader2,
  CheckCircle2, AlertTriangle,
} from "lucide-react";
import { useSession, type SessionUser } from "@/lib/auth-client";
import { isExecutive, isDepartmentManager } from "@/lib/permissions";
import {
  LMS_TIERS, EMPLOYEE_ROLES, DEPARTMENTS, type LmsTier,
} from "@/lib/utils";
import { emptyBlock, legacyContentToBlocks, type SOPBlock } from "@/lib/sop-blocks";
import { BlockEditor } from "@/components/lms/sop-builder/BlockEditor";
import { BlockRenderer } from "@/components/lms/sop-builder/BlockRenderer";
import { GenerateWithAIModal } from "@/components/lms/sop-builder/GenerateWithAIModal";
import type { GeneratedDraft } from "@/lib/ai/generate-draft";

interface SOPRecord {
  id: string; title: string; category: string; content: string; contentType: string;
  tier: string; isRequired: boolean; isArchived: boolean; department: string;
  roles: string[]; status: string; blocks: SOPBlock[] | null; estimatedMinutes: number | null;
  deadlineType: string; deadlineDate: string | null; deadlineDays: number | null; deadlineBasis: string | null;
}

interface SOPExemptionRecord {
  id: string; sopId: string; email: string; reason: string | null; grantedBy: string; createdAt: string;
}

interface EmployeeOption {
  email: string; name: string;
}

interface FormState {
  title: string;
  department: string;
  roles: string[];
  tier: LmsTier;
  category: string;
  contentType: "SOP" | "Course";
  status: "Draft" | "Published";
  isRequired: boolean;
  estimatedMinutes: string;
  deadlineType: "None" | "Fixed" | "Relative";
  deadlineDate: string;
  deadlineDays: string;
  deadlineBasis: "Publish" | "Assignment";
}

const emptyForm = (department: string): FormState => ({
  title: "", department, roles: [], tier: "Introductory", category: "",
  contentType: "SOP", status: "Draft", isRequired: true, estimatedMinutes: "",
  deadlineType: "None", deadlineDate: "", deadlineDays: "", deadlineBasis: "Publish",
});

export default function SOPBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew  = params.id === "new";

  const { data: session } = useSession();
  const me = session?.user as (SessionUser & { department?: string | null }) | undefined;
  const executive = me ? isExecutive(me) : false;
  const deptManager = me ? isDepartmentManager(me) : false;
  const lockedDepartment = (!executive && deptManager && me?.department) ? me.department : null;

  const [loading, setLoading]   = useState(!isNew);
  const [saving, setSaving]     = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [sopId, setSopId]       = useState<string | null>(isNew ? null : params.id);
  const [form, setForm]         = useState<FormState>(() => emptyForm(lockedDepartment ?? ""));
  const [blocks, setBlocks]     = useState<SOPBlock[]>([]);
  const [preview, setPreview]   = useState(false);
  const [aiOpen, setAiOpen]     = useState(false);
  const [toast, setToast]       = useState<string | null>(null);

  const [exemptions, setExemptions] = useState<SOPExemptionRecord[]>([]);
  const [employees, setEmployees]   = useState<EmployeeOption[]>([]);
  const [exemptEmail, setExemptEmail]   = useState("");
  const [exemptReason, setExemptReason] = useState("");

  // Lock department to the manager's own department once we know who they are
  useEffect(() => {
    if (lockedDepartment && isNew) {
      setForm(f => (f.department ? f : { ...f, department: lockedDepartment }));
    }
  }, [lockedDepartment, isNew]);

  // Load existing SOP
  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/sops?id=${params.id}`);
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const list: SOPRecord[] = await res.json();
      const sop = Array.isArray(list) ? list.find(s => s.id === params.id) : null;
      if (!sop) { setNotFound(true); setLoading(false); return; }

      setSopId(sop.id);
      setForm({
        title: sop.title,
        department: sop.department,
        roles: sop.roles ?? [],
        tier: sop.tier as LmsTier,
        category: sop.category,
        contentType: (sop.contentType as "SOP" | "Course") ?? "SOP",
        status: (sop.status as "Draft" | "Published") ?? "Published",
        isRequired: sop.isRequired,
        estimatedMinutes: sop.estimatedMinutes != null ? String(sop.estimatedMinutes) : "",
        deadlineType: (sop.deadlineType as FormState["deadlineType"]) ?? "None",
        deadlineDate: sop.deadlineDate ? new Date(sop.deadlineDate).toISOString().slice(0, 16) : "",
        deadlineDays: sop.deadlineDays != null ? String(sop.deadlineDays) : "",
        deadlineBasis: (sop.deadlineBasis as FormState["deadlineBasis"]) ?? "Publish",
      });
      setBlocks(sop.blocks?.length ? sop.blocks : legacyContentToBlocks(sop.content));
      setLoading(false);
    })();
  }, [isNew, params.id]);

  // Load deadline exemptions for this SOP
  const loadExemptions = async (id: string) => {
    const res = await fetch(`/api/sop-exemptions?sopId=${id}`);
    if (res.ok) setExemptions(await res.json());
  };
  useEffect(() => {
    if (sopId) loadExemptions(sopId);
  }, [sopId]);

  // Load employee list for the exemption picker
  useEffect(() => {
    fetch("/api/employees")
      .then(r => r.ok ? r.json() : [])
      .then((list: { email: string; name: string }[]) => setEmployees(Array.isArray(list) ? list.map(e => ({ email: e.email, name: e.name })) : []))
      .catch(() => {});
  }, []);

  const addExemption = async () => {
    if (!sopId || !exemptEmail.trim()) return;
    const res = await fetch("/api/sop-exemptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sopId, email: exemptEmail.trim(), reason: exemptReason.trim() || undefined }),
    });
    if (res.ok) {
      setExemptEmail("");
      setExemptReason("");
      loadExemptions(sopId);
      showToast("Exemption added.");
    }
  };

  const removeExemption = async (id: string) => {
    if (!sopId) return;
    await fetch("/api/sop-exemptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadExemptions(sopId);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const buildPayload = (overrides: Partial<FormState> = {}) => {
    const f = { ...form, ...overrides };
    return {
      title: f.title,
      department: f.department,
      roles: f.roles,
      tier: f.tier,
      category: f.category || "General",
      contentType: f.contentType,
      status: f.status,
      isRequired: f.isRequired,
      estimatedMinutes: f.estimatedMinutes ? Number(f.estimatedMinutes) : null,
      deadlineType: f.deadlineType,
      deadlineDate: f.deadlineType === "Fixed" && f.deadlineDate ? new Date(f.deadlineDate).toISOString() : null,
      deadlineDays: f.deadlineType === "Relative" && f.deadlineDays ? Number(f.deadlineDays) : null,
      deadlineBasis: f.deadlineType === "Relative" ? f.deadlineBasis : null,
      blocks,
      content: blocks.find(b => b.type === "paragraph")?.content as string ?? "",
    };
  };

  const save = async (overrides: Partial<FormState> = {}) => {
    if (!form.title.trim()) { showToast("Add a title before saving."); return; }
    if (!form.department)   { showToast("Select a department before saving."); return; }

    setSaving(true);
    try {
      const payload = buildPayload(overrides);
      if (sopId) {
        await fetch("/api/sops", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sopId, ...payload }),
        });
      } else {
        const res = await fetch("/api/sops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const created = await res.json();
        if (created?.id) {
          setSopId(created.id);
          router.replace(`/admin/lms/sop-builder/${created.id}`);
        }
      }
      if (Object.keys(overrides).length) setForm(f => ({ ...f, ...overrides }));
      showToast("Saved.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    const next: "Draft" | "Published" = form.status === "Published" ? "Draft" : "Published";
    await save({ status: next });
  };

  const duplicate = async () => {
    if (!sopId) return;
    const res = await fetch("/api/sops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateOf: sopId }),
    });
    const created = await res.json();
    if (created?.id) router.push(`/admin/lms/sop-builder/${created.id}`);
  };

  const archive = async () => {
    if (!sopId) return;
    if (!confirm("Archive this SOP?")) return;
    await fetch("/api/sops", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sopId }),
    });
    router.push("/admin/lms");
  };

  const applyDraft = (draft: GeneratedDraft) => {
    setForm(f => ({
      ...f,
      title: draft.title || f.title,
      department: lockedDepartment ?? draft.department ?? f.department,
      roles: draft.roles?.length ? draft.roles : f.roles,
      tier: (LMS_TIERS as readonly string[]).includes(draft.level) ? draft.level as LmsTier : f.tier,
      category: draft.category || f.category,
      estimatedMinutes: draft.estimatedMinutes ? String(draft.estimatedMinutes) : f.estimatedMinutes,
      status: "Draft", // AI output is always a draft — never auto-published
    }));

    const aiBlocks: SOPBlock[] = [];
    if (draft.summary) aiBlocks.push({ id: `${Date.now()}-summary`, type: "callout", content: { style: "info", text: draft.summary } });
    if (draft.learningObjectives?.length) aiBlocks.push({ id: `${Date.now()}-objectives`, type: "checklist", content: draft.learningObjectives });
    aiBlocks.push(...draft.blocks);
    if (draft.checklist?.length) aiBlocks.push({ id: `${Date.now()}-checklist`, type: "checklist", content: draft.checklist });
    if (draft.quiz?.length) aiBlocks.push({ id: `${Date.now()}-quiz`, type: "quiz", content: draft.quiz });
    if (draft.acknowledgementText) aiBlocks.push({ id: `${Date.now()}-ack`, type: "callout", content: { style: "success", text: draft.acknowledgementText } });

    setBlocks(aiBlocks);
    showToast("AI draft loaded — review and edit before publishing.");
  };

  const departmentOptions = useMemo(
    () => (lockedDepartment ? [lockedDepartment] : DEPARTMENTS),
    [lockedDepartment]
  );

  if (loading) {
    return <div className="w-full max-w-4xl mx-auto py-20 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-3" /> Loading SOP…</div>;
  }
  if (notFound) {
    return (
      <div className="w-full max-w-4xl mx-auto py-20 text-center text-slate-500">
        <p className="text-sm mb-3">SOP not found.</p>
        <Link href="/admin/lms" className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to LMS Admin</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="module-header rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/admin/lms" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition mb-3">
              <ArrowLeft size={12} /> Back to LMS Admin
            </Link>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">SOP Builder</p>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>{isNew && !sopId ? "Create SOP / Course" : form.title || "Untitled"}</h2>
            <p className="text-sm text-slate-400 opacity-70">Build Notion-style content from structured blocks — no hardcoding required.</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={() => setAiOpen(true)} className="flex items-center gap-2 bg-purple-600/90 hover:bg-purple-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl">
              <Sparkles size={15} /> Generate with AI
            </button>
            <button onClick={() => setPreview(p => !p)} className="flex items-center gap-2 border border-slate-600 hover:border-indigo-400/50 transition text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl">
              {preview ? <EyeOff size={15} /> : <Eye size={15} />} {preview ? "Back to editor" : "Preview as employee"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-900/15 px-4 py-2.5 mb-4 text-sm text-emerald-300">
          <CheckCircle2 size={14} /> {toast}
        </div>
      )}

      {preview ? (
        <div className="card rounded-2xl p-6">
          <div className="mb-5 pb-5 border-b border-slate-700/40">
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-1">{form.category || "General"} · {form.tier}{form.estimatedMinutes ? ` · ~${form.estimatedMinutes} min` : ""}</p>
            <h3 className="font-bold text-xl text-slate-100">{form.title || "Untitled"}</h3>
          </div>
          <BlockRenderer blocks={blocks} interactive />
        </div>
      ) : (
        <>
          {/* Metadata */}
          <div className="card rounded-2xl p-6 mb-6">
            <h4 className="text-sm font-semibold text-slate-200 mb-4">Details</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="sf-label">Title *</label>
                <input className="sf-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="SOP / course title…" />
              </div>

              <div>
                <label className="sf-label">Type</label>
                <select className="sf-input" value={form.contentType} onChange={e => setForm(f => ({ ...f, contentType: e.target.value as FormState["contentType"] }))}>
                  <option value="SOP">SOP</option>
                  <option value="Course">Course</option>
                </select>
              </div>
              <div>
                <label className="sf-label">Category</label>
                <input className="sf-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Posting, Compliance…" />
              </div>

              <div>
                <label className="sf-label">Department</label>
                <select className="sf-input" value={form.department} disabled={!!lockedDepartment} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  <option value="">Select…</option>
                  {departmentOptions.map(d => <option key={d}>{d}</option>)}
                </select>
                {lockedDepartment && <p className="text-xs text-slate-600 mt-1">Department Heads can only manage SOPs for their own department.</p>}
              </div>
              <div>
                <label className="sf-label">Training level</label>
                <select className="sf-input" value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value as LmsTier }))}>
                  {LMS_TIERS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="sf-label">Status</label>
                <select className="sf-input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as FormState["status"] }))}>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
              <div>
                <label className="sf-label">Estimated completion time (minutes)</label>
                <input type="number" min={0} className="sf-input" value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: e.target.value }))} placeholder="e.g. 12" />
              </div>

              <div className="md:col-span-2">
                <label className="sf-label">Acknowledgement deadline</label>
                <div className="flex flex-wrap items-center gap-2">
                  <select className="sf-input w-auto" value={form.deadlineType} onChange={e => setForm(f => ({ ...f, deadlineType: e.target.value as FormState["deadlineType"] }))}>
                    <option value="None">No deadline</option>
                    <option value="Fixed">Fixed date &amp; time</option>
                    <option value="Relative">Relative — X days after…</option>
                  </select>
                  {form.deadlineType === "Fixed" && (
                    <input
                      type="datetime-local" className="sf-input w-auto"
                      value={form.deadlineDate}
                      onChange={e => setForm(f => ({ ...f, deadlineDate: e.target.value }))}
                    />
                  )}
                  {form.deadlineType === "Relative" && (
                    <>
                      <input
                        type="number" min={1} className="sf-input w-20"
                        value={form.deadlineDays}
                        onChange={e => setForm(f => ({ ...f, deadlineDays: e.target.value }))}
                        placeholder="days"
                      />
                      <span className="text-sm text-slate-400">days after</span>
                      <select className="sf-input w-auto" value={form.deadlineBasis} onChange={e => setForm(f => ({ ...f, deadlineBasis: e.target.value as FormState["deadlineBasis"] }))}>
                        <option value="Publish">publish date</option>
                        <option value="Assignment">employee's assignment date</option>
                      </select>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Employees see this deadline on the {form.contentType.toLowerCase()} and are flagged as overdue if not acknowledged in time.
                  Individual employees can be exempted below.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="sf-label">Role access</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMPLOYEE_ROLES.map(role => {
                    const active = form.roles.includes(role);
                    return (
                      <button
                        key={role} type="button"
                        onClick={() => setForm(f => ({ ...f, roles: active ? f.roles.filter(r => r !== role) : [...f.roles, role] }))}
                        className={`text-xs rounded-lg px-2.5 py-1.5 border transition ${active ? "border-indigo-400/60 bg-indigo-900/30 text-indigo-300" : "border-slate-700/50 text-slate-400 hover:border-slate-600"}`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-600 mt-1">Leave empty to make it visible to every role in the department.</p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input type="checkbox" id="ack" checked={form.isRequired} onChange={e => setForm(f => ({ ...f, isRequired: e.target.checked }))} style={{ width: "auto" }} />
                <label htmlFor="ack" className="text-sm text-slate-300 cursor-pointer">Required acknowledgement for certification</label>
              </div>
            </div>
          </div>

          {/* Deadline exemptions */}
          {sopId && (
            <div className="card rounded-2xl p-6 mb-6">
              <h4 className="text-sm font-semibold text-slate-200 mb-1">Deadline exemptions</h4>
              <p className="text-xs text-slate-600 mb-4">
                Exempt specific employees from this {form.contentType.toLowerCase()}'s acknowledgement deadline (e.g. new hires who need more time).
                Other employees are still bound by the deadline above.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <input
                  className="sf-input flex-1 min-w-[180px]" list="sop-employee-emails" placeholder="Employee email…"
                  value={exemptEmail} onChange={e => setExemptEmail(e.target.value)}
                />
                <datalist id="sop-employee-emails">
                  {employees.map(e => <option key={e.email} value={e.email}>{e.name}</option>)}
                </datalist>
                <input
                  className="sf-input flex-1 min-w-[180px]" placeholder="Reason (optional)"
                  value={exemptReason} onChange={e => setExemptReason(e.target.value)}
                />
                <button onClick={addExemption} className="bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2 rounded-xl shrink-0">
                  Add exemption
                </button>
              </div>
              {exemptions.length === 0 ? (
                <p className="text-sm text-slate-500">No exemptions yet.</p>
              ) : (
                <div className="space-y-2">
                  {exemptions.map(ex => (
                    <div key={ex.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/40 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-200 truncate">{ex.email}</p>
                        {ex.reason && <p className="text-xs text-slate-500 truncate">{ex.reason}</p>}
                      </div>
                      <button onClick={() => removeExemption(ex.id)} className="text-rose-400 hover:text-rose-300 text-xs shrink-0">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Block editor */}
          <div className="card rounded-2xl p-6 mb-6">
            <h4 className="text-sm font-semibold text-slate-200 mb-4">Content blocks</h4>
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          </div>

          {/* Actions */}
          <div className="card rounded-2xl p-5 mb-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={() => save()} disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
              {sopId && (
                <>
                  <button onClick={togglePublish} disabled={saving} className={`flex items-center gap-2 transition text-sm font-semibold px-4 py-2.5 rounded-xl border ${form.status === "Published" ? "border-amber-500/40 text-amber-300 hover:border-amber-400/60" : "border-emerald-500/40 text-emerald-300 hover:border-emerald-400/60"}`}>
                    {form.status === "Published" ? <EyeOff size={14} /> : <Eye size={14} />}
                    {form.status === "Published" ? "Unpublish" : "Publish"}
                  </button>
                  <button onClick={duplicate} className="flex items-center gap-2 border border-slate-600 hover:border-indigo-400/50 transition text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl">
                    <Copy size={14} /> Duplicate
                  </button>
                  <button onClick={archive} className="flex items-center gap-2 border border-slate-600 hover:border-rose-400/50 transition text-slate-400 hover:text-rose-300 text-sm font-semibold px-4 py-2.5 rounded-xl ml-auto">
                    <Archive size={14} /> Archive
                  </button>
                </>
              )}
            </div>
            {form.status === "Draft" && (
              <p className="flex items-center gap-1.5 text-xs text-amber-400/80 mt-3">
                <AlertTriangle size={12} /> This {form.contentType.toLowerCase()} is a draft — employees won't see it until you publish.
              </p>
            )}
          </div>
        </>
      )}

      <GenerateWithAIModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        lockedDepartment={lockedDepartment}
        onGenerated={applyDraft}
      />
    </div>
  );
}
