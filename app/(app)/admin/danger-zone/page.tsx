"use client";

import { useState } from "react";

function DangerBtn({ label, onClick, outline = false, disabled }: {
  label: string; onClick: () => void; outline?: boolean; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`shrink-0 font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50 ${
        outline
          ? "border border-rose-500/50 hover:border-rose-400 hover:text-rose-300 text-rose-400"
          : "bg-rose-700 hover:bg-rose-600 text-white"
      }`}
    >
      {label}
    </button>
  );
}

export default function DangerZonePage() {
  const [msg, setMsg]         = useState("");
  const [loading, setLoading] = useState(false);

  const run = async (action: string) => {
    if (!confirm(`This will permanently delete data. Are you sure?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clear?action=${action}`, { method: "DELETE" });
      if (res.ok) setMsg("Cleared successfully.");
      else setMsg("Error during clear.");
    } catch { setMsg("Error during clear."); }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6 border border-rose-500/30" style={{ background: "linear-gradient(135deg,rgba(239,68,68,.08),rgba(153,27,27,.05))" }}>
        <p className="text-xs uppercase tracking-wider text-rose-400 mb-2">System</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Danger Zone</h2>
        <p className="text-sm text-slate-400 opacity-70">Destructive database actions. All deletions are permanent and cannot be undone.</p>
      </div>

      <div className="card rounded-xl p-4 mb-6 border border-amber-500/20 bg-amber-900/10">
        <p className="text-sm text-amber-200/80">These actions permanently wipe records from the database. Ensure you have any necessary exports before proceeding.</p>
      </div>

      <div className="space-y-4">
        <div className="card rounded-xl p-6 border border-rose-500/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm mb-1">Clear Strike Database</h4>
              <p className="text-xs text-slate-400">Deletes all strike records and all associated appeals.</p>
            </div>
            <DangerBtn label="Clear Strikes" onClick={() => run("strikes")} disabled={loading} />
          </div>
        </div>

        <div className="card rounded-xl p-6 border border-rose-500/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm mb-1">Clear Appeals Only</h4>
              <p className="text-xs text-slate-400">Deletes all appeal records. Strike records remain intact.</p>
            </div>
            <DangerBtn label="Clear Appeals" onClick={() => run("appeals")} disabled={loading} outline />
          </div>
        </div>

        <div className="card rounded-xl p-6 border border-rose-500/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm mb-1">Clear OT & Attendance Database</h4>
              <p className="text-xs text-slate-400">Deletes all attendance requests — OT, weekend OT, day-off, and offset records.</p>
            </div>
            <DangerBtn label="Clear Attendance" onClick={() => run("attendance")} disabled={loading} outline />
          </div>
        </div>

        <div className="card rounded-xl p-6 border border-red-600/40 bg-red-900/10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-red-300 text-sm mb-1">Clear All Databases</h4>
              <p className="text-xs text-slate-400">Wipes strikes, appeals, and all attendance records in one action.</p>
            </div>
            <button
              onClick={() => run("all")}
              disabled={loading}
              className="shrink-0 bg-red-700 hover:bg-red-600 transition text-white font-bold text-sm px-4 py-2 rounded-xl disabled:opacity-50"
            >
              Clear Everything
            </button>
          </div>
        </div>

        <div className="card rounded-xl p-6 border border-rose-500/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm mb-1">Clear Employee Database</h4>
              <p className="text-xs text-slate-400">Deletes all employee records. Strike and OT records are not affected.</p>
            </div>
            <DangerBtn label="Clear Employees" onClick={() => run("employees")} disabled={loading} outline />
          </div>
        </div>
      </div>

      {msg && <p className="text-sm text-emerald-400 font-medium mt-6 text-center">{msg}</p>}
    </div>
  );
}
