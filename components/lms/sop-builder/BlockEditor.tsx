"use client";

import { useRef, useState } from "react";
import {
  Plus, Trash2, Copy, ChevronUp, ChevronDown, Upload, Loader2, X,
} from "lucide-react";
import { mockUploadFile, resolveUploadUrl } from "@/lib/mock-upload";
import {
  BLOCK_TYPE_META, emptyBlock, blockTypeMeta,
  type SOPBlock, type BlockType, type VideoBlockContent, type FileBlockContent,
  type ImageBlockContent, type CalloutBlockContent, type EmbedBlockContent, type QuizQuestion,
} from "@/lib/sop-blocks";

interface Props {
  blocks: SOPBlock[];
  onChange: (blocks: SOPBlock[]) => void;
}

export function BlockEditor({ blocks, onChange }: Props) {
  const [picker, setPicker] = useState<number | null>(null); // index to insert after, or -1 for start

  const update = (id: string, content: any) =>
    onChange(blocks.map(b => (b.id === id ? { ...b, content } : b)));

  const remove = (id: string) => onChange(blocks.filter(b => b.id !== id));

  const duplicate = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const copy = { ...blocks[idx], id: `${blocks[idx].id}-copy-${Date.now()}` };
    onChange([...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)]);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex(b => b.id === id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const insertAt = (index: number, type: BlockType) => {
    const next = [...blocks];
    next.splice(index + 1, 0, emptyBlock(type));
    onChange(next);
    setPicker(null);
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <p className="text-sm text-slate-500 italic py-4 text-center">No blocks yet — add your first block below.</p>
      )}

      {blocks.map((block, i) => (
        <div key={block.id} className="group relative rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1 pt-1 shrink-0">
              <button onClick={() => move(block.id, -1)} disabled={i === 0} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition"><ChevronUp size={14} /></button>
              <button onClick={() => move(block.id, 1)} disabled={i === blocks.length - 1} className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition"><ChevronDown size={14} /></button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{blockTypeMeta(block.type).label}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => duplicate(block.id)} title="Duplicate block" className="text-slate-500 hover:text-indigo-400 transition p-1"><Copy size={13} /></button>
                  <button onClick={() => remove(block.id)} title="Remove block" className="text-slate-500 hover:text-rose-400 transition p-1"><Trash2 size={13} /></button>
                </div>
              </div>

              <BlockFields block={block} onChange={content => update(block.id, content)} />
            </div>
          </div>

          <AddBlockInline open={picker === i} onToggle={() => setPicker(picker === i ? null : i)} onPick={t => insertAt(i, t)} />
        </div>
      ))}

      <AddBlockInline open={picker === -1} onToggle={() => setPicker(picker === -1 ? null : -1)} onPick={t => insertAt(blocks.length - 1, t)} standalone />
    </div>
  );
}

// ── Add-block picker ──────────────────────────────────────────────────────────

function AddBlockInline({ open, onToggle, onPick, standalone }: { open: boolean; onToggle: () => void; onPick: (t: BlockType) => void; standalone?: boolean }) {
  return (
    <div className={standalone ? "" : "mt-3 pt-3 border-t border-slate-700/30"}>
      <button onClick={onToggle} className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition">
        <Plus size={13} /> Add block
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {BLOCK_TYPE_META.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.type}
                onClick={() => onPick(m.type)}
                className="flex items-center gap-2 rounded-lg border border-slate-700/50 px-2.5 py-2 text-left hover:border-indigo-400/50 hover:bg-slate-800/50 transition"
              >
                <Icon size={14} className="text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{m.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{m.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Per-type field editors ────────────────────────────────────────────────────

function BlockFields({ block, onChange }: { block: SOPBlock; onChange: (content: any) => void }) {
  switch (block.type) {
    case "heading":
      return <input className="sf-input" placeholder="Heading text…" value={block.content as string} onChange={e => onChange(e.target.value)} />;

    case "paragraph":
      return <textarea className="sf-input" placeholder="Paragraph text…" style={{ minHeight: 90 }} value={block.content as string} onChange={e => onChange(e.target.value)} />;

    case "checklist":
      return <ListEditor items={block.content as string[]} onChange={onChange} placeholder="Checklist step…" addLabel="Add step" />;

    case "image":
      return <ImageFields content={block.content as ImageBlockContent} onChange={onChange} />;

    case "video":
      return <VideoFields content={block.content as VideoBlockContent} onChange={onChange} />;

    case "file":
      return <FileFields content={block.content as FileBlockContent} onChange={onChange} />;

    case "callout":
      return <CalloutFields content={block.content as CalloutBlockContent} onChange={onChange} />;

    case "divider":
      return <p className="text-xs text-slate-500 italic">A horizontal divider — no content needed.</p>;

    case "embed":
      return <EmbedFields content={block.content as EmbedBlockContent} onChange={onChange} />;

    case "quiz":
      return <QuizFields questions={block.content as QuizQuestion[]} onChange={onChange} />;

    default:
      return null;
  }
}

// ── Repeatable string list (checklist) ────────────────────────────────────────

function ListEditor({ items, onChange, placeholder, addLabel }: { items: string[]; onChange: (items: string[]) => void; placeholder: string; addLabel: string }) {
  const set = (i: number, v: string) => onChange(items.map((it, idx) => (idx === i ? v : it)));
  const add = () => onChange([...items, ""]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className="sf-input" placeholder={placeholder} value={item} onChange={e => set(i, e.target.value)} />
          <button onClick={() => remove(i)} className="text-slate-500 hover:text-rose-400 transition p-1 shrink-0"><X size={14} /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition">
        <Plus size={12} /> {addLabel}
      </button>
    </div>
  );
}

// ── Mock upload control (shared by image/video/file) ──────────────────────────

function UploadControl({ accept, currentUrl, currentName, onUploaded }: {
  accept: string;
  currentUrl?: string;
  currentName?: string;
  onUploaded: (result: { url: string; name: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await mockUploadFile(file);
      onUploaded(result);
    } finally {
      setUploading(false);
    }
  };

  const preview = currentUrl ? resolveUploadUrl(currentUrl) : null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-xs font-semibold rounded-lg border border-slate-600 px-3 py-2 text-slate-300 hover:border-indigo-400/50 hover:text-indigo-300 transition disabled:opacity-50"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        {uploading ? "Uploading…" : currentUrl ? "Replace file" : "Upload file"}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      {currentUrl ? (
        <span className="text-xs text-slate-500 truncate">{currentName || "Uploaded"} {!preview && "(stored URL — preview unavailable)"}</span>
      ) : (
        <span className="text-xs text-slate-600">No file uploaded yet</span>
      )}
    </div>
  );
}

// Note: uploads here are simulated via lib/mock-upload (localStorage + fake URL),
// since no storage backend exists yet. Swap mockUploadFile for a real upload call
// when one is available — blocks only ever store a URL string either way.

function ImageFields({ content, onChange }: { content: ImageBlockContent; onChange: (c: ImageBlockContent) => void }) {
  return (
    <div className="space-y-2">
      <UploadControl accept="image/*" currentUrl={content.url} currentName={content.caption} onUploaded={r => onChange({ ...content, url: r.url })} />
      <input className="sf-input" placeholder="Caption (optional)…" value={content.caption ?? ""} onChange={e => onChange({ ...content, caption: e.target.value })} />
      <input className="sf-input" placeholder="…or paste an image URL" value={isLocalRef(content.url) ? "" : content.url} onChange={e => onChange({ ...content, url: e.target.value })} />
    </div>
  );
}

function VideoFields({ content, onChange }: { content: VideoBlockContent; onChange: (c: VideoBlockContent) => void }) {
  return (
    <div className="space-y-2">
      <input className="sf-input" placeholder="Video title…" value={content.title} onChange={e => onChange({ ...content, title: e.target.value })} />
      <UploadControl accept="video/*" currentUrl={content.url} currentName={content.title} onUploaded={r => onChange({ ...content, url: r.url })} />
      <input className="sf-input" placeholder="…or paste a video URL (e.g. uploaded-video-url.mp4)" value={isLocalRef(content.url) ? "" : content.url} onChange={e => onChange({ ...content, url: e.target.value })} />
      <textarea className="sf-input" placeholder="Description (optional)…" style={{ minHeight: 60 }} value={content.description ?? ""} onChange={e => onChange({ ...content, description: e.target.value })} />
      <UploadControl accept="image/*" currentUrl={content.thumbnail} currentName="Thumbnail" onUploaded={r => onChange({ ...content, thumbnail: r.url })} />
    </div>
  );
}

function FileFields({ content, onChange }: { content: FileBlockContent; onChange: (c: FileBlockContent) => void }) {
  return (
    <div className="space-y-2">
      <input className="sf-input" placeholder="File name / label…" value={content.name} onChange={e => onChange({ ...content, name: e.target.value })} />
      <UploadControl accept="*/*" currentUrl={content.url} currentName={content.name} onUploaded={r => onChange({ ...content, url: r.url, name: content.name || r.name })} />
      <input className="sf-input" placeholder="…or paste a file URL" value={isLocalRef(content.url) ? "" : content.url} onChange={e => onChange({ ...content, url: e.target.value })} />
      <textarea className="sf-input" placeholder="Description (optional)…" style={{ minHeight: 60 }} value={content.description ?? ""} onChange={e => onChange({ ...content, description: e.target.value })} />
    </div>
  );
}

function CalloutFields({ content, onChange }: { content: CalloutBlockContent; onChange: (c: CalloutBlockContent) => void }) {
  return (
    <div className="space-y-2">
      <select className="sf-input" value={content.style} onChange={e => onChange({ ...content, style: e.target.value as CalloutBlockContent["style"] })}>
        <option value="info">Info</option>
        <option value="warning">Warning</option>
        <option value="success">Success</option>
      </select>
      <textarea className="sf-input" placeholder="Callout text…" style={{ minHeight: 70 }} value={content.text} onChange={e => onChange({ ...content, text: e.target.value })} />
    </div>
  );
}

function EmbedFields({ content, onChange }: { content: EmbedBlockContent; onChange: (c: EmbedBlockContent) => void }) {
  return (
    <div className="space-y-2">
      <input className="sf-input" placeholder="https://…" value={content.url} onChange={e => onChange({ ...content, url: e.target.value })} />
      <input className="sf-input" placeholder="Display label (optional)…" value={content.label ?? ""} onChange={e => onChange({ ...content, label: e.target.value })} />
    </div>
  );
}

function QuizFields({ questions, onChange }: { questions: QuizQuestion[]; onChange: (qs: QuizQuestion[]) => void }) {
  const setQ = (i: number, q: QuizQuestion) => onChange(questions.map((it, idx) => (idx === i ? q : it)));
  const addQ = () => onChange([...questions, { question: "", options: ["", ""], answer: "" }]);
  const removeQ = (i: number) => onChange(questions.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {questions.map((q, qi) => (
        <div key={qi} className="rounded-lg border border-slate-700/40 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input className="sf-input" placeholder="Question…" value={q.question} onChange={e => setQ(qi, { ...q, question: e.target.value })} />
            <button onClick={() => removeQ(qi)} className="text-slate-500 hover:text-rose-400 transition p-1 shrink-0"><Trash2 size={13} /></button>
          </div>
          <ListEditor
            items={q.options}
            placeholder="Option…"
            addLabel="Add option"
            onChange={opts => setQ(qi, { ...q, options: opts })}
          />
          <select className="sf-input" value={q.answer} onChange={e => setQ(qi, { ...q, answer: e.target.value })}>
            <option value="">Select correct answer…</option>
            {q.options.filter(Boolean).map((opt, oi) => <option key={oi} value={opt}>{opt}</option>)}
          </select>
        </div>
      ))}
      <button onClick={addQ} className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition">
        <Plus size={12} /> Add question
      </button>
    </div>
  );
}

function isLocalRef(url: string | undefined): boolean {
  return !!url && url.startsWith("local-upload://");
}
