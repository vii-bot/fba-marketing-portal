"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  id: string; type: string; message: string; href: string | null; isRead: boolean; createdAt: string;
}

const TYPE_COLOR: Record<string, string> = {
  NewSOP:              "text-indigo-400",
  SOPUpdated:          "text-amber-400",
  AssessmentRequired:  "text-sky-400",
  CertificationEarned: "text-amber-400",
  StrikeIssued:        "text-rose-400",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const load = () => fetch("/api/notifications").then(r => r.json()).then(setNotifications).catch(() => {});
  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) });
    load();
  };

  const markOne = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Notifications</h2>
            <p className="text-sm text-slate-400 opacity-70">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
          </div>
          {unread > 0 && (
            <button onClick={markAll} className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition">
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card rounded-xl py-12 text-center text-slate-500">
          <Bell size={36} className="mx-auto mb-2 opacity-25" />
          <p className="text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`card rounded-xl p-4 flex items-start gap-4 transition ${!n.isRead ? "border-indigo-500/30 bg-indigo-900/10" : ""}`}
              onClick={() => { if (!n.isRead) markOne(n.id); }}
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.isRead ? "bg-slate-700" : "bg-indigo-400"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold mb-0.5 ${TYPE_COLOR[n.type] ?? "text-slate-400"}`}>{n.type.replace(/([A-Z])/g, " $1").trim()}</p>
                <p className="text-sm text-slate-300">{n.message}</p>
                {n.href && (
                  <Link href={n.href} className="text-xs text-indigo-400 hover:text-indigo-300 transition mt-1 block">
                    View →
                  </Link>
                )}
              </div>
              <p className="text-xs text-slate-600 shrink-0">{formatDate(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
