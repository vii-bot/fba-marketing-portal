import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SidebarClient from "@/components/layout/SidebarClient";
import IdleSessionGuard from "@/components/auth/IdleSessionGuard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");
  if (!(session.user as any).profileComplete) redirect("/setup");

  return (
    <div className="flex min-h-screen">
      <IdleSessionGuard />
      <SidebarClient />
      <main
        className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col"
        style={{ minHeight: "100vh" }}
      >
        {children}
        <footer className="mt-auto border-t border-slate-700/50 pt-12 pb-4 text-center text-xs text-slate-400">
          <p>All rights reserved. Fatbear Agency LLC.</p>
        </footer>
      </main>
    </div>
  );
}
