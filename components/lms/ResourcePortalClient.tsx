import Link from "next/link";
import { CheckCircle2, Circle, RefreshCw, Clock, ArrowRight } from "lucide-react";
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

export default function ResourcePortalClient({ sop, acked, needsReack }: Props) {
  const borderColor = needsReack
    ? "border-amber-500/30"
    : acked
      ? "border-emerald-500/15"
      : "border-slate-700/40";

  const statusBadge = needsReack
    ? <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">Re-ack needed</span>
    : acked
      ? <span className="text-xs text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">Acknowledged</span>
      : <span className="text-xs text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-full shrink-0">Not started</span>;

  return (
    <Link
      href={`/resource-portal/${sop.id}`}
      className={`card rounded-xl border ${borderColor} p-4 flex flex-col gap-3 hover:bg-slate-800/30 hover:border-slate-600/50 transition-all group no-underline`}
    >
      {/* Top row: status icon + badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {acked
            ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            : needsReack
              ? <RefreshCw size={14} className="text-amber-400 shrink-0" />
              : <Circle size={14} className="text-slate-600 shrink-0" />
          }
          <span className="text-xs text-slate-500">{sop.category}</span>
        </div>
        {statusBadge}
      </div>

      {/* Title */}
      <p className={`text-sm font-semibold leading-snug ${acked && !needsReack ? "text-slate-400" : "text-slate-100"}`}>
        {sop.title}
      </p>

      {/* Bottom row: metadata + arrow */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>{sop.isRequired ? "Required" : "Optional"}</span>
          {sop.estimatedMinutes && (
            <>
              <span>·</span>
              <Clock size={10} />
              <span>{sop.estimatedMinutes} min</span>
            </>
          )}
        </div>
        <ArrowRight size={13} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </Link>
  );
}
