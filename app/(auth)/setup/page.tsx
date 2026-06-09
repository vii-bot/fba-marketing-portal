import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SetupForm from "@/components/setup/SetupForm";

export default async function SetupPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if ((session.user as any).profileComplete) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0f1117" }}>
      <SetupForm defaultName={session.user.name} />
    </div>
  );
}
