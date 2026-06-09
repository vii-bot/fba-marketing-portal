"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { LMS_TIERS, EMPLOYEE_ROLES, DEPARTMENTS, type LmsTier } from "@/lib/utils";
import type { GeneratedDraft } from "@/lib/ai/generate-draft";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Department locked for non-executive admins (Department Heads); null = free choice */
  lockedDepartment: string | null;
  onGenerated: (draft: GeneratedDraft) => void;
}

interface FormState {
  type: "SOP" | "Course";
  department: string;
  roles: string[];
  level: LmsTier;
  category: string;
  rawNotes: string;
  tone: string;
  difficulty: string;
}

const initialForm = (lockedDepartment: string | null): FormState => ({
  type: "SOP",
  department: lockedDepartment ?? "",
  roles: [],
  level: "Introductory",
  category: "",
  rawNotes: "",
  tone: "",
  difficulty: "",
});

export function GenerateWithAIModal({ open, onClose, lockedDepartment, onGenerated }: Props) {
  const [form, setForm]       = useState<FormState>(() => initialForm(lockedDepartment));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const toggleRole = (role: string) =>
    setForm(f => ({ ...f, roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role] }));

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sops/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed. Please try again.");
        return;
      }
      onGenerated(data.draft as GeneratedDraft);
      onClose();
      setForm(initialForm(lockedDepartment));
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!loading) onClose(); }}
      title="Generate with AI"
      maxWidth="max-w-2xl"
      footer={<>
        <button
          onClick={generate}
          disabled={loading || !form.rawNotes.trim()}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? "Generating draft…" : "Generate draft"}
        </button>
        <button onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm disabled:opacity-50">Cancel</button>
      </>}
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          The AI drafts a structure from your notes — it never invents policies, tools, names, or deadlines, and the
          result always lands here as a <strong className="text-slate-400">draft</strong> for you to review, edit, and
          publish manually.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="sf-label">What do you want to create?</label>
            <select className="sf-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as FormState["type"] }))}>
              <option value="SOP">SOP</option>
              <option value="Course">Course</option>
            </select>
          </div>
          <div>
            <label className="sf-label">Department</label>
            <select
              className="sf-input"
              value={form.department}
              disabled={!!lockedDepartment}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            >
              <option value="">Select…</option>
              {(lockedDepartment ? [lockedDepartment] : DEPARTMENTS).map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="sf-label">Training level</label>
            <select className="sf-input" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value as LmsTier }))}>
              {LMS_TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="sf-label">Category</label>
            <input className="sf-input" placeholder="e.g. Posting, Compliance…" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="sf-label">Role access</label>
          <div className="flex flex-wrap gap-1.5">
            {EMPLOYEE_ROLES.map(role => (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`text-xs rounded-lg px-2.5 py-1.5 border transition ${form.roles.includes(role) ? "border-indigo-400/60 bg-indigo-900/30 text-indigo-300" : "border-slate-700/50 text-slate-400 hover:border-slate-600"}`}
              >
                {role}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-1">Leave empty to make it visible to every role in the department.</p>
        </div>

        <div>
          <label className="sf-label">Raw notes / instructions *</label>
          <textarea
            className="sf-input"
            style={{ minHeight: 140 }}
            placeholder="Paste or write the operational details, steps, and context the draft should be based on…"
            value={form.rawNotes}
            onChange={e => setForm(f => ({ ...f, rawNotes: e.target.value }))}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="sf-label">Desired tone (optional)</label>
            <input className="sf-input" placeholder="e.g. Friendly, formal, concise…" value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} />
          </div>
          <div>
            <label className="sf-label">Estimated difficulty (optional)</label>
            <input className="sf-input" placeholder="e.g. Easy, moderate, advanced…" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-900/15 p-3.5">
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-rose-300">{error}</p>
              <button onClick={generate} className="text-xs font-semibold text-rose-300/80 hover:text-rose-200 transition mt-1.5 inline-flex items-center gap-1">
                <RefreshCw size={11} /> Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
