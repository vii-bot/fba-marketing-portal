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

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    const { error: err } = await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    if (err) {
      setError(err.message ?? "Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-100">FBA Marketing Portal</h1>
            <p className="text-xs text-slate-500">Fatbear Agency — Internal Operations</p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-8">
          Sign in with your company email to access your dashboard, learning resources, and team tools.
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-5 flex items-center justify-center gap-2.5 rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:border-slate-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Sign in with Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

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

        {/* DEV ONLY — remove this block + app/api/dev-login/route.ts when done */}
        {process.env.NODE_ENV !== "production" && (
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await fetch("/api/dev-login", { method: "POST" });
              window.location.href = "/dashboard";
            }}
            className="w-full mt-3 rounded-xl border border-dashed border-amber-500/40 px-4 py-2.5 text-xs font-semibold text-amber-300 hover:border-amber-400 transition disabled:opacity-60"
          >
            Dev Login (skip auth — admin)
          </button>
        )}

        <p className="text-xs text-slate-600 mt-6 text-center">
          Access is limited to registered Fatbear Agency employees.
        </p>
      </div>
    </div>
  );
}
