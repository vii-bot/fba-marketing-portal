"use client";

import { useState } from "react";
import { AlertTriangle, Info, CheckCircle2, FileText, Link2, Play } from "lucide-react";
import { resolveUploadUrl } from "@/lib/mock-upload";
import type {
  SOPBlock, BlockType, VideoBlockContent, FileBlockContent, ImageBlockContent,
  CalloutBlockContent, EmbedBlockContent, QuizQuestion,
} from "@/lib/sop-blocks";

const CALLOUT_STYLES: Record<CalloutBlockContent["style"], { border: string; bg: string; text: string; icon: typeof Info }> = {
  info:    { border: "border-indigo-500/30", bg: "bg-indigo-900/15", text: "text-indigo-300", icon: Info },
  warning: { border: "border-amber-500/30",  bg: "bg-amber-900/15",  text: "text-amber-300",  icon: AlertTriangle },
  success: { border: "border-emerald-500/30",bg: "bg-emerald-900/15",text: "text-emerald-300",icon: CheckCircle2 },
};

interface Props {
  blocks: SOPBlock[];
  /** When true, renders interactive checklist/quiz controls (employee view). */
  interactive?: boolean;
}

export function BlockRenderer({ blocks, interactive = false }: Props) {
  if (!blocks?.length) {
    return <p className="text-sm text-slate-500 italic">No content yet.</p>;
  }
  return (
    <div className="space-y-4">
      {blocks.map(block => <BlockView key={block.id} block={block} interactive={interactive} />)}
    </div>
  );
}

function BlockView({ block, interactive }: { block: SOPBlock; interactive: boolean }) {
  switch (block.type as BlockType) {
    case "heading":
      return <h3 className="font-bold text-lg text-slate-100">{block.content as string}</h3>;

    case "paragraph":
      return <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{block.content as string}</p>;

    case "checklist":
      return <ChecklistView items={block.content as string[]} interactive={interactive} />;

    case "image": {
      const c = block.content as ImageBlockContent;
      const src = resolveUploadUrl(c.url);
      return (
        <figure>
          {src
            ? <img src={src} alt={c.caption ?? ""} className="rounded-xl max-w-full border border-slate-700/50" />
            : <EmptyMedia label="Image not yet uploaded" />}
          {c.caption && <figcaption className="text-xs text-slate-500 mt-1.5">{c.caption}</figcaption>}
        </figure>
      );
    }

    case "video": {
      const c = block.content as VideoBlockContent;
      const src = resolveUploadUrl(c.url);
      return (
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          {src
            ? <video src={src} controls poster={c.thumbnail ? (resolveUploadUrl(c.thumbnail) ?? undefined) : undefined} className="w-full bg-black" style={{ maxHeight: 360 }} />
            : <EmptyMedia label="Video not yet uploaded" icon={Play} />}
          <div className="p-3">
            <p className="text-sm font-medium text-slate-200">{c.title || "Untitled video"}</p>
            {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
          </div>
        </div>
      );
    }

    case "file": {
      const c = block.content as FileBlockContent;
      const src = resolveUploadUrl(c.url);
      return (
        <a
          href={src ?? "#"}
          download={c.name}
          target="_blank" rel="noreferrer"
          className={`flex items-center gap-3 rounded-xl border border-slate-700/50 p-3 transition ${src ? "hover:border-indigo-400/50" : "opacity-60 pointer-events-none"}`}
        >
          <FileText size={18} className="text-indigo-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-slate-200 truncate">{c.name || "Untitled file"}</p>
            {c.description && <p className="text-xs text-slate-500 truncate">{c.description}</p>}
          </div>
        </a>
      );
    }

    case "callout": {
      const c = block.content as CalloutBlockContent;
      const s = CALLOUT_STYLES[c.style] ?? CALLOUT_STYLES.info;
      const Icon = s.icon;
      return (
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${s.border} ${s.bg}`}>
          <Icon size={16} className={`shrink-0 mt-0.5 ${s.text}`} />
          <p className={`text-sm leading-relaxed ${s.text}`}>{c.text}</p>
        </div>
      );
    }

    case "divider":
      return <hr className="border-slate-700/50" />;

    case "embed": {
      const c = block.content as EmbedBlockContent;
      if (!c.url) return <EmptyMedia label="No link added" icon={Link2} />;
      return (
        <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition underline underline-offset-2">
          <Link2 size={14} /> {c.label || c.url}
        </a>
      );
    }

    case "quiz":
      return <QuizView questions={block.content as QuizQuestion[]} interactive={interactive} />;

    default:
      return null;
  }
}

function EmptyMedia({ label, icon: Icon = FileText }: { label: string; icon?: typeof FileText }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-600 bg-slate-800/30 rounded-xl">
      <Icon size={24} className="opacity-40" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

function ChecklistView({ items, interactive }: { items: string[]; interactive: boolean }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return (
    <ul className="space-y-2">
      {items.filter(Boolean).map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
          {interactive ? (
            <input
              type="checkbox"
              checked={checked.has(i)}
              onChange={() => setChecked(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })}
              style={{ width: "auto", marginTop: 3 }}
              className="rounded border-slate-600 text-indigo-500"
            />
          ) : (
            <CheckCircle2 size={14} className="text-slate-600 shrink-0 mt-0.5" />
          )}
          <span className={checked.has(i) ? "line-through text-slate-500" : ""}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function QuizView({ questions, interactive }: { questions: QuizQuestion[]; interactive: boolean }) {
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-xl border border-slate-700/50 p-4 space-y-4">
      <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Knowledge Check</p>
      {questions.filter(q => q.question).map((q, qi) => (
        <div key={qi}>
          <p className="text-sm text-slate-200 mb-2">{qi + 1}. {q.question}</p>
          <div className="space-y-1.5">
            {q.options.filter(Boolean).map((opt, oi) => {
              const selected = picked[qi] === opt;
              const isAnswer = revealed && opt === q.answer;
              const isWrong  = revealed && selected && opt !== q.answer;
              return (
                <label key={oi} className={`flex items-center gap-2.5 text-sm rounded-lg px-3 py-2 cursor-pointer border transition
                  ${isAnswer ? "border-emerald-500/40 bg-emerald-900/15 text-emerald-300"
                    : isWrong ? "border-rose-500/40 bg-rose-900/15 text-rose-300"
                    : selected ? "border-indigo-500/40 bg-indigo-900/15 text-indigo-200"
                    : "border-slate-700/50 text-slate-300 hover:border-slate-600"}`}>
                  <input
                    type="radio"
                    name={`quiz-${qi}`}
                    checked={selected}
                    disabled={!interactive}
                    onChange={() => setPicked(p => ({ ...p, [qi]: opt }))}
                    style={{ width: "auto" }}
                  />
                  {opt}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {interactive && (
        <button
          onClick={() => setRevealed(true)}
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
        >
          Check answers
        </button>
      )}
    </div>
  );
}
