"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, LMS_TIERS, TIER_COLORS, DEPARTMENTS, type LmsTier } from "@/lib/utils";
import { Plus, Pencil, Archive, BookOpen, Inbox, RefreshCw, Copy, Eye, EyeOff } from "lucide-react";

interface SOP {
  id: string; title: string; category: string; content: string; tier: string; contentType: string;
  version: number; isRequired: boolean; isArchived: boolean; department: string;
  status: string; roles: string[]; estimatedMinutes: number | null;
  createdBy: string; createdAt: string; updatedAt: string;
  acknowledgements: { email: string; version: number }[];
}

interface Employee { email: string; name: string; role: string; department: string; }

export default function AdminLMSPage() {
  const router = useRouter();
  const [sops,      setSops]      = useState<SOP[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tab,       setTab]       = useState<"sops"|"progress"|"assessments">("sops");
  const [deptF,     setDeptF]     = useState("");
  const [tierF,     setTierF]     = useState("");

  const load = async () => {
    const [s, e] = await Promise.all([
      fetch("/api/sops?archived=false").then(r => r.json()),
      fetch("/api/employees").then(r => r.json()),
    ]);
    setSops(Array.isArray(s) ? s : []);
    setEmployees(Array.isArray(e) ? e : []);
  };

  useEffect(() => { load(); }, []);

  const bumpVersion = async (id: string) => {
    if (!confirm("Bump version? This will invalidate all existing acknowledgements and require re-acknowledgement.")) return;
    await fetch("/api/sops", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, bumpVersion: true }) });
    load();
  };

  const togglePublish = async (s: SOP) => {
    const status = s.status === "Published" ? "Draft" : "Published";
    await fetch("/api/sops", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, status }) });
    load();
  };

  const duplicate = async (id: string) => {
    const res = await fetch("/api/sops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ duplicateOf: id }) });
    const created = await res.json();
    if (created?.id) router.push(`/admin/lms/sop-builder/${created.id}`);
  };

  const archive = async (id: string) => {
    if (!confirm("Archive this SOP?")) return;
    await fetch("/api/sops", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const filteredSops = sops.filter(s => {
    if (deptF && s.department !== deptF && s.department !== "All Departments") return false;
    if (tierF && s.tier !== tierF) return false;
    return true;
  });

  // Progress calculations
  const progressByEmployee = employees.map(emp => {
    const total = sops.filter(s => s.isRequired).length;
    const done  = sops.filter(s => s.isRequired && s.acknowledgements?.some(a => a.email === emp.email && a.version === s.version)).length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    return { ...emp, total, done, pct };
  }).sort((a, b) => a.pct - b.pct);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Learning Management System</p>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>LMS Admin Dashboard</h2>
            <p className="text-sm text-slate-400 opacity-70">Manage SOPs, track employee progress, and monitor certifications.</p>
          </div>
          <Link href="/admin/lms/sop-builder/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl shrink-0">
            <Plus size={15} /> New SOP
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total SOPs",    value: sops.length },
          { label: "Required",      value: sops.filter(s => s.isRequired).length },
          { label: "Introductory",  value: sops.filter(s => s.tier === "Introductory").length },
          { label: "Advanced",      value: sops.filter(s => s.tier === "Advanced").length },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-indigo-300">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-6">
        {(["sops","progress","assessments"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition capitalize ${tab === t ? "bg-slate-700 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}>{t}</button>
        ))}
      </div>

      {/* SOPs tab */}
      {tab === "sops" && (
        <>
          <div className="card rounded-xl p-4 mb-4">
            <div className="flex gap-2">
              <select className="db-filter" value={tierF} onChange={e => setTierF(e.target.value)}>
                <option value="">All Tiers</option>
                {LMS_TIERS.map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="db-filter" value={deptF} onChange={e => setDeptF(e.target.value)}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {filteredSops.length === 0 ? (
            <div className="card rounded-xl py-12 text-center text-slate-500">
              <Inbox size={36} className="mx-auto mb-2 opacity-25" />
              <p className="text-sm">No SOPs yet. <Link href="/admin/lms/sop-builder/new" className="text-indigo-400 hover:text-indigo-300">Create the first →</Link></p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSops.map(s => (
                <div key={s.id} className="card rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-slate-200">{s.title}</span>
                        <span className={`text-xs font-semibold ${TIER_COLORS[s.tier as LmsTier] ?? "text-slate-400"}`}>{s.tier}</span>
                        {s.contentType === "Course" && <span className="text-xs text-purple-400/80">Course</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${s.status === "Published" ? "text-emerald-400 bg-emerald-500/10" : "text-slate-400 bg-slate-600/20"}`}>{s.status ?? "Published"}</span>
                        {s.isRequired && <span className="text-xs text-amber-400/80">Required</span>}
                        <span className="text-xs text-slate-600">v{s.version}</span>
                      </div>
                      <p className="text-xs text-slate-500">{s.category} · {s.department} · {formatDate(s.updatedAt)}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {s.acknowledgements?.filter(a => a.version === s.version).length ?? 0} acknowledged current version
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => router.push(`/admin/lms/sop-builder/${s.id}`)} title="Edit" className="text-indigo-400 hover:text-indigo-300 transition p-1"><Pencil size={14} /></button>
                      <button onClick={() => togglePublish(s)} title={s.status === "Published" ? "Unpublish" : "Publish"} className="text-emerald-400 hover:text-emerald-300 transition p-1">
                        {s.status === "Published" ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => duplicate(s.id)} title="Duplicate" className="text-slate-400 hover:text-slate-200 transition p-1"><Copy size={14} /></button>
                      <button onClick={() => bumpVersion(s.id)} title="Bump version — requires re-acknowledgement" className="text-amber-400 hover:text-amber-300 transition p-1"><RefreshCw size={14} /></button>
                      <button onClick={() => archive(s.id)} title="Archive" className="text-slate-500 hover:text-rose-400 transition p-1"><Archive size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Progress tab */}
      {tab === "progress" && (
        <>
          <div className="card rounded-xl overflow-hidden">
            {progressByEmployee.length === 0 ? (
              <div className="py-12 text-center text-slate-500"><p className="text-sm">No employees found.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Employee</th><th>Department</th><th>Role</th><th>SOPs Done</th><th>Progress</th></tr></thead>
                  <tbody>
                    {progressByEmployee.map(emp => (
                      <tr key={emp.email}>
                        <td><div className="text-slate-200">{emp.name}</div><div className="text-xs text-slate-500">{emp.email}</div></td>
                        <td>{emp.department}</td>
                        <td className="text-xs">{emp.role}</td>
                        <td>{emp.done} / {emp.total}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden min-w-[80px]">
                              <div className={`h-full rounded-full ${emp.pct === 100 ? "bg-amber-400" : "bg-indigo-500"}`} style={{ width: `${emp.pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 shrink-0">{emp.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Assessments tab */}
      {tab === "assessments" && (
        <div className="card rounded-xl py-12 text-center text-slate-500">
          <BookOpen size={36} className="mx-auto mb-2 opacity-25" />
          <p className="text-sm">Assessment builder coming soon.</p>
          <p className="text-xs mt-1">Create assessments from the SOP editor by attaching questions.</p>
        </div>
      )}

    </div>
  );
}
