import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ───────────────────────────────────────────────────────────────────────
// DEV LOGIN BYPASS — local development only, hard-gated by NODE_ENV so it
// can never run in a production build (Netlify/Vercel always set
// NODE_ENV=production). Logs in as a local admin account without needing
// real credentials.
//
// TO REMOVE: delete this file and the "Dev Login" button in
// app/(auth)/login/page.tsx.
// ───────────────────────────────────────────────────────────────────────

const DEV_EMAIL = "dev-admin@fatbearagency.com";
const DEV_PASSWORD = "dev-bypass-local-only-123";
const DEV_NAME = "Dev Admin";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const existing = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
  if (!existing) {
    await auth.api.signUpEmail({
      body: { email: DEV_EMAIL, password: DEV_PASSWORD, name: DEV_NAME },
      headers: req.headers,
    });
  }

  await prisma.user.update({
    where: { email: DEV_EMAIL },
    data: { role: "admin", profileComplete: true },
  });

  const signInResponse = await auth.api.signInEmail({
    body: { email: DEV_EMAIL, password: DEV_PASSWORD },
    asResponse: true,
    headers: req.headers,
  });

  const res = NextResponse.json({ success: true });
  for (const cookie of signInResponse.headers.getSetCookie()) {
    res.headers.append("set-cookie", cookie);
  }
  return res;
}
