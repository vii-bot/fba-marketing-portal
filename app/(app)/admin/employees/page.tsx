"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EMPLOYEE_ROLES, DEPARTMENTS, SCHEDULE_SHIFTS, formatDate } from "@/lib/utils";
import { UserPlus, Pencil, Trash2, Inbox, Mail, Copy, Check } from "lucide-react";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const ACCESS_TOOLS = ["sheets","dropbox","infloww","xbots","linkme","beacons","website","notion","multilogin"];

interface Employee {
  id: string; name: string; email: string; role: string; department: string;
  startDate: string | null; status: string; notes: string; discordUsername: string | null;
  schedule: Record<string, string> | null;
  access: Record<string, boolean> | null;
}

const emptyForm = () => ({
  name: "", email: "", role: EMPLOYEE_ROLES[0], department: DEPARTMENTS[6], // X
  startDate: "", status: "Active", notes: "", discordUsername: "",
  schedule: {} as Record<string, string>,
  access: {} as Record<string, boolean>,
});

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [roleF, setRoleF]   = useState("");
  const [statF, setStatF]   = useState("");
  const [deptF, setDeptF]   = useState("");
  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [tab, setTab]       = useState<"info"|"schedule"|"access">("info");
  const [form, setForm]     = useState(emptyForm());
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const load = async () => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (roleF)  p.set("role", roleF);
    if (statF)  p.set("status", statF);
    const res = await fetch(`/api/employees?${p}`);
    if (res.ok) setEmployees(await res.json());
  };

  useEffect(() => { load(); }, [search, roleF, statF]);

  const openAdd = () => { setEditId(null); setForm(emptyForm()); setTab("info"); setModal(true); setInviteLink(null); };
  const openEdit = (e: Employee) => {
    setEditId(e.id);
    setForm({ name: e.name, email: e.email, role: e.role, department: e.department, startDate: e.startDate?.slice(0,10) ?? "", status: e.status, notes: e.notes ?? "", discordUsername: e.discordUsername ?? "", schedule: e.schedule ?? {}, access: e.access ?? {} });
    setTab("info"); setModal(true); setInviteLink(null);
  };

  const save = async () => {
    const body = editId ? { ...form, id: editId } : form;
    const res = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok && !editId) {
      // New employee — offer invite
      const saved = await res.json();
      const invRes = await fetch("/api/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId: saved.id }) });
      if (invRes.ok) { const { inviteUrl } = await invRes.json(); setInviteLink(inviteUrl); }
    } else {
      setModal(false);
    }
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this employee?")) return;
    await fetch("/api/employees", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const setF = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setSched = (day: string, v: string) => setForm(f => ({ ...f, schedule: { ...f.schedule, [day]: v } }));
  const setAcc   = (tool: string, v: boolean) => setForm(f => ({ ...f, access: { ...f.access, [tool]: v } }));

  const copyInvite = () => {
    if (inviteLink) { navigator.clipboard.writeText(inviteLink); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }
  };

  const filtered = employees.filter(e => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleF && e.role !== roleF) return false;
    if (statF && e.status !== statF) return false;
    if (deptF && e.department !== deptF) return false;
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">HR</p>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Employee Database</h2>
            <p className="text-sm text-slate-400 opacity-70">Manage team members, schedules, and access.</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl shrink-0">
            <UserPlus size={15} /> Add Employee
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total",      value: employees.length, color: "text-slate-300" },
          { label: "Active",     value: employees.filter(e => e.status === "Active").length, color: "text-emerald-400" },
          { label: "Inactive",   value: employees.filter(e => e.status === "Inactive").length, color: "text-amber-400" },
          { label: "Terminated", value: employees.filter(e => e.status === "Terminated").length, color: "text-rose-400" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs text-slate-500 uppercase mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <input className="db-filter flex-1 min-w-[160px]" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="db-filter" value={deptF} onChange={e => setDeptF(e.target.value)}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
          <select className="db-filter" value={roleF} onChange={e => setRoleF(e.target.value)}>
            <option value="">All Roles</option>
            {EMPLOYEE_ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <select className="db-filter" value={statF} onChange={e => setStatF(e.target.value)}>
            <option value="">All Status</option>
            {["Active","Inactive","On Leave","Terminated"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Inbox size={36} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm">No employees found. <button onClick={openAdd} className="text-indigo-400 hover:text-indigo-300">Add the first →</button></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Role</th><th>Start Date</th><th>Status</th><th>Department</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td><div className="text-slate-200 font-medium">{e.name}</div><div className="text-xs text-slate-500">{e.email}</div></td>
                    <td>{e.role}</td>
                    <td>{e.startDate ? formatDate(e.startDate) : "—"}</td>
                    <td><Badge label={e.status} /></td>
                    <td className="text-xs text-slate-400">{e.department}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(e)} className="text-indigo-400 hover:text-indigo-300"><Pencil size={14} /></button>
                        <button onClick={() => del(e.id)} className="text-rose-400 hover:text-rose-300"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => { setModal(false); setInviteLink(null); }}
        title={editId ? "Edit Employee" : "Add Employee"}
        maxWidth="max-w-2xl"
        footer={
          inviteLink ? (
            <button onClick={() => { setModal(false); setInviteLink(null); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Done</button>
          ) : (
            <>
              <button onClick={save} className="flex-1 bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-2.5 rounded-xl text-sm">Save Employee</button>
              <button onClick={() => setModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm">Cancel</button>
            </>
          )
        }
      >
        {/* Invite link shown after creation */}
        {inviteLink ? (
          <div className="space-y-4">
            <div className="rounded-xl p-4 bg-emerald-900/20 border border-emerald-500/30">
              <p className="text-sm font-semibold text-emerald-300 mb-2">Employee created! Share this invite link:</p>
              <p className="text-xs text-slate-500 mb-3">The link expires in 7 days. The employee will set their own password on first login.</p>
              <div className="flex gap-2">
                <input className="sf-input flex-1 text-xs font-mono" value={inviteLink} readOnly />
                <button onClick={copyInvite} className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 transition rounded-lg text-white text-xs font-semibold flex items-center gap-1.5">
                  {inviteCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/60 rounded-xl p-1 mb-4">
              {(["info","schedule","access"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition capitalize ${tab === t ? "bg-slate-700 text-slate-200" : "text-slate-500 hover:text-slate-300"}`}>{t}</button>
              ))}
            </div>

            {tab === "info" && (
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="sf-label">Name *</label><input className="sf-input" value={form.name} onChange={e => setF("name", e.target.value)} /></div>
                <div><label className="sf-label">Email *</label><input className="sf-input" type="email" value={form.email} onChange={e => setF("email", e.target.value)} /></div>
                <div><label className="sf-label">Role *</label><select className="sf-input" value={form.role} onChange={e => setF("role", e.target.value)}>{EMPLOYEE_ROLES.map(r => <option key={r}>{r}</option>)}</select></div>
                <div><label className="sf-label">Department</label><select className="sf-input" value={form.department} onChange={e => setF("department", e.target.value)}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></div>
                <div><label className="sf-label">Start Date</label><input className="sf-input" type="date" value={form.startDate} onChange={e => setF("startDate", e.target.value)} /></div>
                <div><label className="sf-label">Status</label><select className="sf-input" value={form.status} onChange={e => setF("status", e.target.value)}>{["Active","Inactive","On Leave","Terminated"].map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="sf-label">Discord Username</label><input className="sf-input" value={form.discordUsername} onChange={e => setF("discordUsername", e.target.value)} placeholder="@handle" /></div>
                <div className="md:col-span-2"><label className="sf-label">Notes</label><textarea className="sf-input" style={{minHeight:60}} value={form.notes} onChange={e => setF("notes", e.target.value)} /></div>
              </div>
            )}

            {tab === "schedule" && (
              <div>
                <p className="text-xs text-slate-500 mb-4">Assign a shift code per day (matches Schedule Legends).</p>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map(d => (
                    <div key={d} className="text-center">
                      <p className="text-xs text-slate-500 mb-1">{d}</p>
                      <select className="sf-input text-xs p-1.5" value={form.schedule[d] ?? ""} onChange={e => setSched(d, e.target.value)}>
                        <option value="">—</option>
                        {SCHEDULE_SHIFTS.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {SCHEDULE_SHIFTS.map(s => (
                    <div key={s.code} className="text-xs flex items-center gap-2">
                      <span className={`font-bold ${s.color}`}>{s.code}</span>
                      <span className="text-slate-500">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "access" && (
              <div>
                <label className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 mb-5 border cursor-pointer transition ${form.access.superAdmin ? "bg-indigo-600/15 border-indigo-500/40" : "card border-slate-700/60 hover:border-indigo-500/30"}`}>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">Super Admin Access</p>
                    <p className="text-xs text-slate-500 mt-0.5">Grants full portal access — can manage strikes, employees, LMS, and all admin tools.</p>
                  </div>
                  <input type="checkbox" checked={!!form.access.superAdmin} onChange={e => setAcc("superAdmin", e.target.checked)} style={{ width: "auto" }} className="rounded text-indigo-500 shrink-0" />
                </label>

                <p className="text-xs text-slate-500 mb-3">Tool access</p>
                <div className="grid grid-cols-3 gap-3">
                  {ACCESS_TOOLS.map(tool => (
                    <label key={tool} className="flex items-center gap-2.5 cursor-pointer card rounded-lg px-3 py-2.5 hover:border-indigo-400/40 transition capitalize">
                      <input type="checkbox" checked={!!form.access[tool]} onChange={e => setAcc(tool, e.target.checked)} style={{ width: "auto" }} className="rounded text-indigo-500" />
                      <span className="text-sm text-slate-300">{tool.charAt(0).toUpperCase() + tool.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
