"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: err } = await signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    });

    if (err) {
      setError(err.message ?? "Invalid credentials. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center gap-3 mb-6">
          <img src="/x-logo-fba.webp" alt="FBA X" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-slate-100">FBA X Department</h1>
            <p className="text-xs text-slate-500">Internal Training &amp; Operations Platform</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-8">
          Sign in with your company email to access your dashboard, learning resources, and team tools.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="sf-label">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@company.com"
                className="sf-input pl-9"
              />
            </div>
          </div>

          <div>
            <label className="sf-label">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="sf-input pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-rose-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glow-btn w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Mail size={16} />
            {loading ? "Signing in…" : "Sign in with Company Email"}
          </button>
        </form>

        <p className="text-xs text-slate-600 mt-6 text-center">
          Access is limited to registered FBA X Department employees.
        </p>
      </div>
    </div>
  );
}
