"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, Users2, BookOpen, ShieldCheck,
  GraduationCap, LogOut, User, X, Menu, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth-client";
import { useState, useEffect } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: (path: string) => boolean;
};

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard",       label: "My Dashboard",    icon: <LayoutDashboard size={16} /> },
  { href: "/schedule",        label: "My Schedule",     icon: <Calendar size={16} /> },
  { href: "/my-creators",     label: "My Creators",     icon: <Users2 size={16} /> },
  { href: "/resource-portal", label: "Resource Portal", icon: <BookOpen size={16} /> },
];

const ADMIN_NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Admin Dashboard",
    icon: <ShieldCheck size={16} />,
    match: (p) => p === "/admin" || (p.startsWith("/admin/") && !p.startsWith("/admin/lms")),
  },
  {
    href: "/admin/lms",
    label: "LMS Dashboard",
    icon: <GraduationCap size={16} />,
    match: (p) => p.startsWith("/admin/lms"),
  },
];

function NavLink({
  item,
  pathname,
  onClose,
}: {
  item: NavItem;
  pathname: string;
  onClose: () => void;
}) {
  const isActive = item.match ? item.match(pathname) : pathname === item.href;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300",
        isActive && "active"
      )}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const [open, setOpen]     = useState(false);
  const [unread, setUnread] = useState(0);

  const isAdmin = user?.role === "admin";
  const close   = () => setOpen(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then(r => r.ok ? r.json() : [])
      .then((ns: { isRead: boolean }[]) => setUnread(ns.filter(n => !n.isRead).length))
      .catch(() => {});
  }, [pathname]);

  const handleSignOut = async () => {
    try { await signOut(); } catch {}
    router.push("/login");
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-indigo-600 text-white">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={close} />}

      <aside
        className={cn(
          "sidebar fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40 w-64 flex flex-col shrink-0 overflow-y-auto transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ background: "var(--bg-secondary)" }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-lg font-bold text-slate-100">Fatbear Agency</h1>
          <p className="text-xs text-slate-400 opacity-60">Marketing Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 text-sm flex flex-col">
          {MAIN_NAV.map(item => (
            <NavLink key={item.href} item={item} pathname={pathname} onClose={close} />
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs uppercase tracking-widest text-slate-600 font-semibold">Admin</p>
              </div>
              {ADMIN_NAV.map(item => (
                <NavLink key={item.href} item={item} pathname={pathname} onClose={close} />
              ))}
            </>
          )}

          {/* Account section */}
          <div className="mt-auto border-t border-slate-700/50 pt-2">
            <Link
              href="/notifications"
              onClick={close}
              className={cn("nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 justify-between", pathname === "/notifications" && "active")}
            >
              <div className="flex items-center gap-3">
                <Bell size={15} />
                Notifications
              </div>
              {unread > 0 && (
                <span className="bg-indigo-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>

            <Link
              href="/profile"
              onClick={close}
              className={cn("nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300", pathname === "/profile" && "active")}
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <User size={10} className="text-indigo-300" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name ?? "—"}</p>
                <p className="text-xs text-slate-600 truncate capitalize">{user?.role?.replace(/-/g, " ") ?? ""}</p>
              </div>
            </Link>

            <button
              onClick={handleSignOut}
              className="nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-rose-400 text-sm"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
