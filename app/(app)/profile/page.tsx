"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { User, Save, ExternalLink } from "lucide-react";
import { EMPLOYEE_ROLES, DEPARTMENTS } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface Profile {
  id: string; name: string; email: string; role: string; department: string | null;
  jobTitle: string | null; profilePicture: string | null; bannerImage: string | null;
  discordUsername: string | null; createdAt: string;
  employee: {
    startDate: string | null; status: string; schedule: any; access: any;
    contract: string | null; discordUsername: string | null;
    department: string; role: string;
  } | null;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form,    setForm]    = useState({ name: "", discordUsername: "" });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then((p: Profile) => {
      setProfile(p);
      setForm({
        name:            p.name,
        discordUsername: p.discordUsername ?? p.employee?.discordUsername ?? "",
      });
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!profile) return <div className="w-full max-w-4xl mx-auto pt-8 text-center text-slate-500 text-sm">Loading profile…</div>;

  const emp = profile.employee;
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const schedule = emp?.schedule as Record<string, string> | null;
  const access   = emp?.access   as Record<string, boolean> | null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="module-header rounded-2xl p-8 mb-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-slate-700/60 border border-slate-600/40 flex items-center justify-center shrink-0">
          <User size={28} className="text-slate-400" />
        </div>
        <div>
          <p className="font-bold text-slate-100 text-xl">{profile.name}</p>
          <p className="text-sm text-slate-400">{emp?.role ?? profile.role} · {emp?.department ?? profile.department ?? "—"}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Edit profile */}
        <div className="md:col-span-2 space-y-5">
          <div className="card rounded-xl p-6">
            <h4 className="font-semibold text-indigo-300 text-sm mb-4">Edit Profile</h4>
            <div className="space-y-4">
              <div><label className="sf-label">Display Name</label><input className="sf-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
              <div><label className="sf-label">Discord Username</label><input className="sf-input" value={form.discordUsername} onChange={e => setForm(f => ({...f, discordUsername: e.target.value}))} placeholder="yourusername" /></div>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60">
                <Save size={14} /> {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Schedule */}
          {schedule && (
            <div className="card rounded-xl p-6">
              <h4 className="font-semibold text-slate-200 text-sm mb-4">My Schedule</h4>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS.map(d => (
                  <div key={d} className="bg-slate-800/40 rounded-lg py-3 px-1">
                    <p className="text-xs text-slate-500 mb-1">{d}</p>
                    <p className={`text-xs font-semibold ${schedule[d] ? "text-indigo-300" : "text-slate-600"}`}>
                      {schedule[d] ?? "OFF"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access */}
          {access && (
            <div className="card rounded-xl p-6">
              <h4 className="font-semibold text-slate-200 text-sm mb-4">Tool Access</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(access).map(([tool, hasAccess]) => (
                  <div key={tool} className={`rounded-lg px-3 py-2 text-xs font-medium capitalize ${hasAccess ? "bg-emerald-900/25 border border-emerald-500/20 text-emerald-300" : "bg-slate-800/30 border border-slate-700/30 text-slate-600"}`}>
                    {hasAccess ? "✓" : "✗"} {tool}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Info sidebar */}
        <div className="space-y-5">
          <div className="card rounded-xl p-5">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-widest mb-4">Employee Info</h4>
            <div className="space-y-3 text-sm">
              {[
                { label: "Email",       value: profile.email },
                { label: "Role",        value: emp?.role ?? profile.role },
                { label: "Department",  value: emp?.department ?? profile.department },
                { label: "Start Date",  value: emp?.startDate ? formatDate(emp.startDate) : "—" },
                { label: "Status",      value: emp?.status ?? "—" },
                { label: "Discord",     value: form.discordUsername || "—" },
              ].map(row => (
                <div key={row.label}>
                  <p className="text-xs text-slate-500">{row.label}</p>
                  <p className="text-slate-300 font-medium mt-0.5">{row.value ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contract */}
          {emp?.contract && (
            <div className="card rounded-xl p-5">
              <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-widest mb-3">Contract</h4>
              <a href={emp.contract} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition">
                <ExternalLink size={13} /> View Contract PDF
              </a>
            </div>
          )}

          {/* Account info */}
          <div className="card rounded-xl p-5">
            <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-widest mb-3">Account</h4>
            <p className="text-xs text-slate-500">Member since</p>
            <p className="text-sm text-slate-300 mt-0.5">{formatDate(profile.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
