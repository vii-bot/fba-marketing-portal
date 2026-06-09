"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, RefreshCw, ArrowLeft, Clock } from "lucide-react";
import { BlockRenderer } from "@/components/lms/sop-builder/BlockRenderer";
import type { SOPBlock } from "@/lib/sop-blocks";

interface SOP {
  id: string; title: string; tier: string; isRequired: boolean; category: string;
  content: string; version: number; blocks?: SOPBlock[] | null; estimatedMinutes?: number | null;
}

interface Props {
  sop: SOP;
  acked: boolean;
  needsReack: boolean;
}

export default function SOPDetailClient({ sop, acked: initAcked, needsReack }: Props) {
  const [acked, setAcked] = useState(initAcked);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/sop-acknowledgements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sopId: sop.id }),
    }).catch(() => {});
  }, [sop.id]);

  const acknowledge = async () => {
    setLoading(true);
    try {
      await fetch("/api/sop-acknowledgements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId: sop.id }),
      });
      setAcked(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition mb-6"
      >
        <ArrowLeft size={15} />
        Back to Resource Portal
      </button>

      {/* Header */}
      <div className="module-header rounded-2xl p-8 mb-6">
        <div className="flex items-start gap-3 mb-3">
          {acked
            ? <CheckCircle2 size={20} className="text-emerald-400 mt-0.5 shrink-0" />
            : needsReack
              ? <RefreshCw size={20} className="text-amber-400 mt-0.5 shrink-0" />
              : <Circle size={20} className="text-slate-600 mt-0.5 shrink-0" />
          }
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-1">{sop.tier} · {sop.category}</p>
            <h1 className="text-xl font-bold text-slate-100 leading-snug">{sop.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
          <span>v{sop.version}</span>
          <span>·</span>
          <span>{sop.isRequired ? "Required" : "Optional"}</span>
          {sop.estimatedMinutes && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={11} />{sop.estimatedMinutes} min</span>
            </>
          )}
          {acked && !needsReack && (
            <>
              <span>·</span>
              <span className="text-emerald-500/80 font-medium">Acknowledged</span>
            </>
          )}
          {needsReack && (
            <>
              <span>·</span>
              <span className="text-amber-400 font-medium">Re-acknowledgement needed</span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="card rounded-xl p-6 mb-6 border border-slate-700/40">
        {sop.blocks?.length ? (
          <BlockRenderer blocks={sop.blocks} interactive />
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
            {sop.content}
          </div>
        )}
      </div>

      {/* Acknowledgement */}
      {!acked && (
        <div className={`card rounded-xl p-5 border ${needsReack ? "border-amber-500/30" : "border-slate-700/40"}`}>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={false}
              onChange={e => { if (e.target.checked) acknowledge(); }}
              disabled={loading}
              style={{ width: "auto", marginTop: 2 }}
              className="rounded border-slate-600 text-indigo-500"
            />
            <span className={`text-sm select-none leading-relaxed transition ${needsReack ? "text-amber-300/80 group-hover:text-amber-200" : "text-slate-300 group-hover:text-slate-200"}`}>
              {needsReack
                ? `I have read and understood the updated version (v${sop.version}) of this SOP.`
                : "I have read and understood this SOP."
              }
            </span>
          </label>
          {loading && <p className="text-xs text-indigo-400 mt-2">Saving…</p>}
        </div>
      )}

      {acked && !needsReack && (
        <div className="card rounded-xl p-5 border border-emerald-500/15 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400/80">You have acknowledged this SOP.</p>
        </div>
      )}
    </div>
  );
}
