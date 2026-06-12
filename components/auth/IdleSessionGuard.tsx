"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

const IDLE_WARNING_MS   = 29 * 60 * 1000; // show warning at 29 minutes idle
const IDLE_LOGOUT_MS    = 30 * 60 * 1000; // sign out at 30 minutes idle
const CHECK_INTERVAL_MS = 15 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

// Signs the user out after 30 minutes of inactivity, with a warning banner
// at the 29-minute mark so unsaved work isn't lost without notice. Doesn't
// use the better-auth useSession() hook, so it's safe to render directly
// from a server-component layout.
export default function IdleSessionGuard() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const onActivity = () => {
      lastActivity.current = Date.now();
      setShowWarning(false);
    };
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, onActivity, { passive: true }));

    const interval = setInterval(async () => {
      const idleFor = Date.now() - lastActivity.current;
      if (idleFor >= IDLE_LOGOUT_MS) {
        clearInterval(interval);
        try { await signOut(); } catch {}
        router.push("/login");
      } else if (idleFor >= IDLE_WARNING_MS) {
        setShowWarning(true);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, onActivity));
      clearInterval(interval);
    };
  }, [router]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-amber-500/40 bg-slate-900/95 p-4 shadow-lg">
      <p className="text-sm font-semibold text-amber-300 mb-1">You&apos;ll be logged out soon</p>
      <p className="text-xs text-slate-400">
        You&apos;ve been inactive for a while. Move your mouse or click anywhere to stay logged in.
      </p>
    </div>
  );
}
