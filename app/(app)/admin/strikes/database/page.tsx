"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatDate, STRIKE_TYPES, STRIKE_LEVELS, STRIKE_STATUSES } from "@/lib/utils";
import Link from "next/link";
import { Plus, Inbox, Pencil, Trash2 } from "lucide-react";

interface Strike {
  id: string; strikeCode: string; name: string; email: string; role: string;
  type: string; level: string; incidentDate: string; quarter: string; year: number;
  status: string; requireAck: boolean; reason: string; action: string; notes: string;
}

export default function StrikeDatabasePage() {
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [filtered, setFiltered] = useState<Strike[]>([]);
  const [search, setSearch]   = useState("");
  const [typeF,  setTypeF]    = useState("");
  const [statusF,setStatusF]  = useState("");
  const [qF,     setQF]       = useState("");
  const [yearF,  setYearF]    = useState("");
  const [editId, setEditId]   = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Strike>>({});

  const load = async () => {
    const res = await fetch("/api/strikes");
    if (res.ok) { const d = await res.json(); setStrikes(d); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let r = [...strikes];
    if (search)  r = r.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()));
    if (typeF)   r = r.filter(s => s.type === typeF);
    if (statusF) r = r.filter(s => s.status === statusF);
    if (qF)      r = r.filter(s => s.quarter === qF);
    if (yearF)   r = r.filter(s => String(s.year) === yearF);
    setFiltered(r);
  }, [strikes, search, typeF, statusF, qF, yearF]);

  const openEdit = (s: Strike) => { setEditId(s.id); setEditData({ type: s.type, level: s.level, status: s.status, incidentDate: s.incidentDate?.slice(0,10), reason: s.reason, action: s.action, notes: s.notes }); };

  const saveEdit = async () => {
    await fetch("/api/strikes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...editData }) });
    setEditId(null);
    load();
  };

  const deleteStrike = async (id: string) => {
    if (!confirm("Delete this strike permanently?")) return;
    await fetch("/api/strikes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const set = (k: string, v: string) => setEditData(d => ({ ...d, [k]: v }));

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-rose-400 mb-2">Strike System</p>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Strike Database</h2>
            <p className="text-sm text-slate-400 opacity-70">All strike records — search, filter, and manage.</p>
          </div>
          <Link href="/admin/strikes/submit" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl shrink-0">
            <Plus size={15} /> New Strike
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <input className="db-filter w-full" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="db-filter" value={typeF} onChange={e => setTypeF(e.target.value)}>
            <option value="">All Types</option>
            {STRIKE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="db-filter" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All Statuses</option>
            {STRIKE_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="db-filter" value={qF} onChange={e => setQF(e.target.value)}>
            <option value="">All Quarters</option>
            {["Q1","Q2","Q3","Q4"].map(q => <option key={q}>{q}</option>)}
          </select>
          <select className="db-filter" value={yearF} onChange={e => setYearF(e.target.value)}>
            <option value="">All Years</option>
            {["2026","2025","2027"].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Inbox size={36} className="mx-auto mb-2.5 opacity-25" />
            <p className="text-sm">No strikes match current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>Employee</th><th>Role</th><th>Type</th><th>Level</th><th>Date</th><th>Qtr</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="text-xs text-slate-500 font-mono">{s.strikeCode}</td>
                    <td><div className="text-slate-200 font-medium">{s.name}</div><div className="text-xs text-slate-500">{s.email}</div></td>
                    <td>{s.role}</td>
                    <td><Badge label={s.type} /></td>
                    <td><Badge label={s.level} /></td>
                    <td>{formatDate(s.incidentDate)}</td>
                    <td>{s.quarter} {s.year}</td>
                    <td><Badge label={s.status} /></td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(s)} className="text-indigo-400 hover:text-indigo-300 transition"><Pencil size={14} /></button>
                        <button onClick={() => deleteStrike(s.id)} className="text-rose-400 hover:text-rose-300 transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        open={!!editId}
        onClose={() => setEditId(null)}
        title="Edit Strike Record"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button onClick={saveEdit} className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Save Changes</button>
            <button onClick={() => setEditId(null)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-slate-500 transition">Cancel</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="sf-label">Strike Type</label>
              <select className="sf-input" value={editData.type ?? ""} onChange={e => set("type", e.target.value)}>
                {STRIKE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="sf-label">Strike Level</label>
              <select className="sf-input" value={editData.level ?? ""} onChange={e => set("level", e.target.value)}>
                {STRIKE_LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="sf-label">Status</label>
              <select className="sf-input" value={editData.status ?? ""} onChange={e => set("status", e.target.value)}>
                {STRIKE_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="sf-label">Incident Date</label><input className="sf-input" type="date" value={editData.incidentDate ?? ""} onChange={e => set("incidentDate", e.target.value)} /></div>
          </div>
          <div><label className="sf-label">Reason</label><textarea className="sf-input" value={editData.reason ?? ""} onChange={e => set("reason", e.target.value)} /></div>
          <div><label className="sf-label">Corrective Action</label><textarea className="sf-input" style={{ minHeight: 60 }} value={editData.action ?? ""} onChange={e => set("action", e.target.value)} /></div>
          <div><label className="sf-label">Notes</label><textarea className="sf-input" style={{ minHeight: 60 }} value={editData.notes ?? ""} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </Modal>
    </div>
  );
}
