"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface InviteInfo {
  email: string; name: string; role: string; department: string;
}

function AcceptInviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token  = params.get("token") ?? "";

  const [invite,   setInvite]   = useState<InviteInfo | null>(null);
  const [error,    setError]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!token) { setError("Missing invite token."); setChecking(false); return; }
    fetch(`/api/invite?token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setInvite)
      .catch(status => setError(status === 410 ? "This invite link has expired or already been used." : "Invalid invite link."))
      .finally(() => setChecking(false));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true);

    const res = await fetch("/api/auth/sign-up/email", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: invite!.email, password, name: invite!.name, callbackURL: "/dashboard" }),
    });

    if (res.ok) {
      // Mark invite as used
      await fetch("/api/invite", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      router.push("/setup");
    } else {
      const d = await res.json();
      setError(d.message ?? "Failed to create account.");
      setLoading(false);
    }
  };

  if (checking) return <div className="text-center text-slate-400 text-sm">Validating invite…</div>;

  return (
    <div className="card rounded-2xl p-8 w-full max-w-md mx-auto">
      {error && !invite ? (
        <div className="text-center">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <a href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm">Go to Login →</a>
        </div>
      ) : invite ? (
        <>
          <h2 className="font-bold text-slate-100 text-lg mb-1">Welcome, {invite.name}!</h2>
          <p className="text-sm text-slate-400 mb-6">
            You&apos;ve been invited to join the FBA Marketing Portal as <strong className="text-slate-300">{invite.role}</strong> in the <strong className="text-slate-300">{invite.department}</strong> department.
            Set a password to activate your account.
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div><label className="sf-label">Email</label><input className="sf-input opacity-60" value={invite.email} disabled /></div>
            <div><label className="sf-label">Password *</label><input className="sf-input" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" /></div>
            <div><label className="sf-label">Confirm Password *</label><input className="sf-input" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" /></div>
            {error && <p className="text-rose-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
              {loading ? "Creating account…" : "Activate Account"}
            </button>
          </form>
        </>
      ) : null}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0f1117" }}>
      <Suspense><AcceptInviteForm /></Suspense>
    </div>
  );
}
