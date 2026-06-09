import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { canManageLMS } from "@/lib/permissions";
import { generateDraft, type GenerateDraftInput } from "@/lib/ai/generate-draft";

// POST { type, department, roles, level, category, rawNotes, tone?, difficulty? }
// Generates an AI draft for review in the SOP Builder. Never persists or publishes —
// the admin must load, edit, and manually publish the result.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!canManageLMS(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const input: GenerateDraftInput = {
    type:       body.type === "Course" ? "Course" : "SOP",
    department: String(body.department ?? ""),
    roles:      Array.isArray(body.roles) ? body.roles.map(String) : [],
    level:      String(body.level ?? ""),
    category:   String(body.category ?? ""),
    rawNotes:   String(body.rawNotes ?? ""),
    tone:       body.tone ? String(body.tone) : undefined,
    difficulty: body.difficulty ? String(body.difficulty) : undefined,
  };

  if (!input.rawNotes.trim()) {
    return NextResponse.json({ error: "Add some raw notes describing the process before generating a draft." }, { status: 400 });
  }

  const result = await generateDraft(input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Generation failed. Please try again." }, { status: 422 });
  }

  return NextResponse.json({ draft: result.draft });
}
