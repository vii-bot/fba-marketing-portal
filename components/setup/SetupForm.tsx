"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  defaultName: string;
}

export default function SetupForm({ defaultName }: Props) {
  const router = useRouter();
  const [name,    setName]    = useState(defaultName ?? "");
  const [discord, setDiscord] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim())    { setError("Display name is required."); return; }
    if (!discord.trim()) { setError("Discord username is required."); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/profile", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim(), discordUsername: discord.trim(), profileComplete: true }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="card rounded-2xl p-8 w-full max-w-md mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">FBA Marketing Portal</p>
        <h2 className="font-bold text-slate-100 text-xl mb-1">Create your profile</h2>
        <p className="text-sm text-slate-400">This is how your teammates will see you.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="sf-label">Display Name *</label>
          <input
            className="sf-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
        </div>
        <div>
          <label className="sf-label">Discord Username *</label>
          <input
            className="sf-input"
            value={discord}
            onChange={e => setDiscord(e.target.value)}
            placeholder="yourusername"
          />
          <p className="text-xs text-slate-600 mt-1">Without the @</p>
        </div>

        {error && <p className="text-rose-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 mt-2"
        >
          {loading ? "Saving…" : "Continue to Dashboard"}
        </button>
      </form>
    </div>
  );
}
