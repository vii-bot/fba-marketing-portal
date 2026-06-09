// AI-assisted SOP/Course draft generation.
//
// The admin supplies raw notes + metadata; the LLM turns them into a structured
// draft that loads into the SOP Builder for manual review. The LLM never
// auto-publishes — `generateDraft` always returns status-less draft data and
// the caller is responsible for forcing status to "Draft".
//
// If ANTHROPIC_API_KEY is set, the real Claude API is used. Otherwise a
// deterministic mock builds a structurally-valid draft from the notes, so the
// UI can be exercised end-to-end without an API key.

import { generateId } from "@/lib/utils";
import type { SOPBlock, BlockType } from "@/lib/sop-blocks";

export interface GenerateDraftInput {
  type: "SOP" | "Course";
  department: string;
  roles: string[];
  level: string;
  category: string;
  rawNotes: string;
  tone?: string;
  difficulty?: string;
}

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

export interface GeneratedDraft {
  title: string;
  department: string;
  roles: string[];
  level: string;
  category: string;
  estimatedMinutes: number;
  summary: string;
  learningObjectives: string[];
  blocks: SOPBlock[];
  checklist: string[];
  quiz: GeneratedQuizQuestion[];
  acknowledgementText: string;
  adminReviewNeeded: string[];
}

export const SYSTEM_PROMPT =
  "You are generating internal company SOP and LMS training drafts. Be clear, structured, practical, and easy for new employees to follow. Do not invent policies, tools, names, deadlines, or rules that were not provided by the admin. If information is missing, add a section called ‘Admin Review Needed’ instead of guessing.";

export function buildUserPrompt(input: GenerateDraftInput): string {
  return `You are an internal LMS and SOP drafting assistant.

Turn the admin's raw notes into a structured SOP or course draft.

Rules:
- Do not invent company policies.
- Do not invent tools, deadlines, names, or requirements.
- Use only the information provided.
- If something is unclear, include it under "Admin Review Needed."
- Make the output clear enough for a new employee.
- Use simple operational language.
- Return valid JSON only.
- Do not include markdown outside the JSON.

Context supplied by the admin:
- Creating: ${input.type}
- Department: ${input.department}
- Role access: ${input.roles.join(", ") || "(not specified)"}
- Training level: ${input.level}
- Category: ${input.category}
${input.tone ? `- Desired tone: ${input.tone}\n` : ""}${input.difficulty ? `- Estimated difficulty: ${input.difficulty}\n` : ""}
Required JSON format:
{
  "title": "",
  "department": "",
  "roles": [],
  "level": "",
  "category": "",
  "estimatedMinutes": 0,
  "summary": "",
  "learningObjectives": [],
  "blocks": [
    {
      "id": "",
      "type": "",
      "content": ""
    }
  ],
  "checklist": [],
  "quiz": [
    {
      "question": "",
      "options": [],
      "answer": ""
    }
  ],
  "acknowledgementText": "",
  "adminReviewNeeded": []
}

Admin raw notes:
${input.rawNotes}`;
}

// ── Public entry point ────────────────────────────────────────────────────────

export interface GenerateDraftResult {
  ok: boolean;
  draft?: GeneratedDraft;
  error?: string;
}

export async function generateDraft(input: GenerateDraftInput): Promise<GenerateDraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: true, draft: mockGenerateDraft(input) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(input) }],
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `The AI service returned an error (${res.status}). Please try again.` };
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    return validateDraftJSON(text);
  } catch {
    return { ok: false, error: "Couldn't reach the AI service. Check your connection and try again." };
  }
}

// ── JSON validation ───────────────────────────────────────────────────────────

// "warning" is accepted as an alias for "callout" — the bugs.md spec lists both
// names depending on context, but the block schema only defines "callout".
const KNOWN_BLOCK_TYPES = [
  "heading", "paragraph", "checklist", "callout", "warning",
  "image", "video", "divider", "quiz", "embed", "file",
];

export function validateDraftJSON(raw: string): GenerateDraftResult {
  let parsed: any;
  try {
    parsed = JSON.parse(stripMarkdownFence(raw));
  } catch {
    return { ok: false, error: "The AI response wasn't valid JSON. You can try generating again." };
  }

  const required = [
    "title", "department", "roles", "level", "category", "estimatedMinutes",
    "summary", "learningObjectives", "blocks", "checklist", "quiz",
    "acknowledgementText", "adminReviewNeeded",
  ];
  for (const key of required) {
    if (!(key in parsed)) {
      return { ok: false, error: `The AI response was missing "${key}". You can try generating again.` };
    }
  }
  if (!Array.isArray(parsed.blocks) || !Array.isArray(parsed.roles) || !Array.isArray(parsed.learningObjectives)
      || !Array.isArray(parsed.checklist) || !Array.isArray(parsed.quiz) || !Array.isArray(parsed.adminReviewNeeded)) {
    return { ok: false, error: "The AI response had an unexpected shape. You can try generating again." };
  }

  const blocks: SOPBlock[] = parsed.blocks.filter(Boolean).map((b: any) => {
    const type = normalizeBlockType(b?.type);
    return {
      id: typeof b?.id === "string" && b.id ? b.id : generateId("block"),
      type,
      content: normalizeBlockContent(type, b?.content),
    };
  });

  const draft: GeneratedDraft = {
    title:               String(parsed.title ?? ""),
    department:          String(parsed.department ?? ""),
    roles:               parsed.roles.map(String),
    level:               String(parsed.level ?? ""),
    category:            String(parsed.category ?? ""),
    estimatedMinutes:    Number(parsed.estimatedMinutes) || 0,
    summary:             String(parsed.summary ?? ""),
    learningObjectives:  parsed.learningObjectives.map(String),
    blocks,
    checklist:           parsed.checklist.map(String),
    quiz:                parsed.quiz.map((q: any) => ({
      question: String(q?.question ?? ""),
      options:  Array.isArray(q?.options) ? q.options.map(String) : [],
      answer:   String(q?.answer ?? ""),
    })),
    acknowledgementText: String(parsed.acknowledgementText ?? ""),
    adminReviewNeeded:   parsed.adminReviewNeeded.map(String),
  };

  return { ok: true, draft };
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function normalizeBlockType(type: unknown): BlockType {
  const t = String(type ?? "").toLowerCase();
  if (t === "warning") return "callout";
  if (KNOWN_BLOCK_TYPES.includes(t)) return t as BlockType;
  return "paragraph";
}

// The LLM may return content in slightly different shapes than our internal
// block schema (e.g. a plain string for a callout). Coerce into the shape the
// editor/renderer expect, defaulting anything missing.
function normalizeBlockContent(type: BlockType, content: unknown): any {
  const obj = (content && typeof content === "object" && !Array.isArray(content)) ? content as Record<string, any> : {};
  const str = typeof content === "string" ? content : "";

  switch (type) {
    case "heading":
    case "paragraph":
      return str || (obj.text ?? "");
    case "checklist":
      return Array.isArray(content) ? content.map(String) : (str ? [str] : [""]);
    case "image":
      return { url: String(obj.url ?? ""), caption: obj.caption != null ? String(obj.caption) : "" };
    case "video":
      return {
        title: String(obj.title ?? ""),
        url: String(obj.url ?? ""),
        description: obj.description != null ? String(obj.description) : "",
        thumbnail: obj.thumbnail != null ? String(obj.thumbnail) : undefined,
      };
    case "file":
      return {
        name: String(obj.name ?? obj.title ?? ""),
        url: String(obj.url ?? ""),
        description: obj.description != null ? String(obj.description) : "",
      };
    case "callout":
      return {
        style: ["info", "warning", "success"].includes(obj.style) ? obj.style : "warning",
        text: str || String(obj.text ?? ""),
      };
    case "embed":
      return { url: String(obj.url ?? ""), label: obj.label != null ? String(obj.label) : "" };
    case "quiz":
      return Array.isArray(content)
        ? content.map((q: any) => ({
            question: String(q?.question ?? ""),
            options:  Array.isArray(q?.options) ? q.options.map(String) : [],
            answer:   String(q?.answer ?? ""),
          }))
        : [{ question: "", options: ["", ""], answer: "" }];
    case "divider":
      return null;
    default:
      return content ?? "";
  }
}

// ── Mock generator (no API key needed) ───────────────────────────────────────

export function mockGenerateDraft(input: GenerateDraftInput): GeneratedDraft {
  const notes = input.rawNotes.trim();
  const sentences = notes.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  const title = notes
    ? `${input.type === "Course" ? "Course" : "SOP"}: ${(sentences[0] ?? notes).slice(0, 70).replace(/[.!?]$/, "")}`
    : `Untitled ${input.type} Draft`;

  const adminReviewNeeded: string[] = [];
  if (!notes) adminReviewNeeded.push("No raw notes were provided — add the operational details this draft should cover.");
  if (!input.category) adminReviewNeeded.push("Category was not specified.");
  if (sentences.length < 2) adminReviewNeeded.push("The notes are short — add more step-by-step detail so employees have enough context.");

  const blocks: SOPBlock[] = [
    { id: generateId("block"), type: "heading", content: title.replace(/^(SOP|Course):\s*/, "") },
    {
      id: generateId("block"),
      type: "paragraph",
      content: notes || "(No notes provided yet — describe the process here.)",
    },
  ];

  if (sentences.length > 1) {
    blocks.push({ id: generateId("block"), type: "checklist", content: sentences.slice(0, 8) });
  }

  blocks.push({
    id: generateId("block"),
    type: "video",
    content: { title: "Upload demo video here", url: "", description: "Add a screen recording that walks through this process." },
  });

  if (adminReviewNeeded.length) {
    blocks.push({ id: generateId("block"), type: "heading", content: "Admin Review Needed" });
    blocks.push({ id: generateId("block"), type: "checklist", content: adminReviewNeeded });
  }

  const checklist = sentences.length ? sentences.slice(0, 6) : ["(Add checklist steps once notes are provided.)"];

  return {
    title,
    department: input.department,
    roles: input.roles,
    level: input.level,
    category: input.category || "General",
    estimatedMinutes: Math.max(5, Math.min(45, sentences.length * 3 || 10)),
    summary: notes
      ? `This draft was generated from the admin's notes and covers: ${(sentences[0] ?? notes).slice(0, 140)}`
      : "No summary available yet — raw notes were empty. Add details and regenerate.",
    learningObjectives: sentences.length
      ? sentences.slice(0, 4).map(s => `Understand how to: ${s.replace(/[.!?]$/, "").toLowerCase()}`)
      : ["(Add learning objectives once notes are provided.)"],
    blocks,
    checklist,
    quiz: [{
      question: `What is the main purpose of "${title.replace(/^(SOP|Course):\s*/, "")}"?`,
      options: [
        sentences[0]?.slice(0, 60) || "As described in the notes",
        "To skip required steps",
        "To avoid documentation",
        "None of the above",
      ],
      answer: sentences[0]?.slice(0, 60) || "As described in the notes",
    }],
    acknowledgementText: `I have read and understood this ${input.type.toLowerCase()} and will follow the steps as described.`,
    adminReviewNeeded,
  };
}
