"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDate, getQuarter } from "@/lib/utils";
import { Inbox, ArrowLeft } from "lucide-react";

interface Strike {
  id: string; strikeCode: string; name: string; email: string; role: string;
  type: string; level: string; incidentDate: string; status: string; quarter: string; year: number;
}

interface Profile {
  email: string; name: string; role: string;
  activeCount: number; totalCount: number;
  highestLevel: string; strikes: Strike[];
}

function getRiskClass(level: string) {
  if (level === "Terminated") return "text-rose-400 font-bold";
  if (level === "Final Warning") return "text-orange-400";
  if (level === "For Evaluation") return "text-amber-400";
  if (level === "On Strike") return "text-amber-300";
  return "text-emerald-400";
}

export default function StrikeProfilesPage() {
  const [allStrikes, setAllStrikes] = useState<Strike[]>([]);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/strikes").then(r => r.json()).then(setAllStrikes);
  }, []);

  const profiles: Profile[] = Object.values(
    allStrikes.reduce<Record<string, Profile>>((acc, s) => {
      if (!acc[s.email]) acc[s.email] = { email: s.email, name: s.name, role: s.role, activeCount: 0, totalCount: 0, highestLevel: "", strikes: [] };
      acc[s.email].totalCount++;
      if (s.status === "Active") acc[s.email].activeCount++;
      acc[s.email].strikes.push(s);
      const levels = ["First Warning","On Strike","Final Warning","For Evaluation","Terminated"];
      if (!acc[s.email].highestLevel || levels.indexOf(s.level) > levels.indexOf(acc[s.email].highestLevel)) {
        acc[s.email].highestLevel = s.level;
      }
      return acc;
    }, {})
  );

  const filtered = profiles.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase())
  );

  const currentQ    = getQuarter(new Date());
  const currentYear = new Date().getFullYear();

  const selectedProfile = selected ? profiles.find(p => p.email === selected) : null;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-rose-400 mb-2">Strike System</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Employee Profiles</h2>
        <p className="text-sm text-slate-400 opacity-70">Per-employee active and historical strike counts.</p>
      </div>

      <div className="flex gap-3 mb-5">
        <input className="db-filter flex-1" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        {selected && (
          <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 text-sm hover:border-slate-500 transition flex items-center gap-2">
            <ArrowLeft size={14} /> All Employees
          </button>
        )}
      </div>

      {!selected && (
        <>
          {filtered.length === 0 ? (
            <div className="card rounded-xl py-12 text-center text-slate-500">
              <Inbox size={36} className="mx-auto mb-2.5 opacity-25" />
              <p className="text-sm">No employee strike records found.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(p => (
                <button key={p.email} onClick={() => setSelected(p.email)} className="card rounded-xl p-5 text-left hover:border-indigo-400 transition w-full">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.role}</p>
                    </div>
                    {p.activeCount > 0 && <Badge label={p.highestLevel} />}
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400 mt-3">
                    <span><span className={`font-bold text-sm ${p.activeCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>{p.activeCount}</span> active</span>
                    <span><span className="font-bold text-sm text-slate-300">{p.totalCount}</span> total</span>
                  </div>
                  <p className={`text-xs mt-1 ${getRiskClass(p.highestLevel)}`}>
                    {p.highestLevel || "No active strikes"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {selectedProfile && (
        <div className="space-y-5">
          <div className="card rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-100 text-base">{selectedProfile.name}</h3>
                <p className="text-sm text-slate-400">{selectedProfile.role} · {selectedProfile.email}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${selectedProfile.activeCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                  {selectedProfile.activeCount}
                </p>
                <p className="text-xs text-slate-500">active strikes</p>
              </div>
            </div>

            <h4 className="text-xs uppercase tracking-widest text-indigo-400 mb-3">
              Active Strikes — {currentQ} {currentYear}
            </h4>
            {selectedProfile.strikes.filter(s => s.status === "Active" && s.quarter === currentQ && s.year === currentYear).length === 0 ? (
              <p className="text-sm text-slate-500">No active strikes this quarter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>ID</th><th>Type</th><th>Level</th><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {selectedProfile.strikes
                      .filter(s => s.status === "Active" && s.quarter === currentQ && s.year === currentYear)
                      .map(s => (
                        <tr key={s.id}>
                          <td className="font-mono text-xs text-slate-500">{s.strikeCode}</td>
                          <td><Badge label={s.type} /></td>
                          <td><Badge label={s.level} /></td>
                          <td>{formatDate(s.incidentDate)}</td>
                          <td><Badge label={s.status} /></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card rounded-xl p-6">
            <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Full History</h4>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>ID</th><th>Type</th><th>Level</th><th>Date</th><th>Quarter</th><th>Status</th></tr></thead>
                <tbody>
                  {selectedProfile.strikes.map(s => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs text-slate-500">{s.strikeCode}</td>
                      <td><Badge label={s.type} /></td>
                      <td><Badge label={s.level} /></td>
                      <td>{formatDate(s.incidentDate)}</td>
                      <td>{s.quarter} {s.year}</td>
                      <td><Badge label={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
