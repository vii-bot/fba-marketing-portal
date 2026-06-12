import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSOP } from "@/lib/permissions";
import { getSOPDeadline } from "@/lib/sop-deadlines";
import {
  TIER_COLORS, TIER_BADGES, TIER_PREREQUISITES,
  LMS_TIERS, type LmsTier,
} from "@/lib/utils";
import { Award, Lock } from "lucide-react";
import ResourcePortalClient from "@/components/lms/ResourcePortalClient";
import type { SOPBlock } from "@/lib/sop-blocks";

function calcTierProgress(
  tier: LmsTier,
  sops: { id: string; tier: string; isRequired: boolean }[],
  sopAcks: Set<string>
): number {
  const tierSops = sops.filter(s => s.tier === tier && s.isRequired);
  const total    = tierSops.length;
  if (total === 0) return 100;
  const done = tierSops.filter(s => sopAcks.has(s.id)).length;
  return Math.round((done / total) * 100);
}

export default async function ResourcePortalPage() {
  const session  = await auth.api.getSession({ headers: await headers() });
  const email    = session!.user.email;
  const isSuperAdmin = (session!.user as any).role === "admin";
  const me = session!.user as any;

  const [sopAckList, allSops, employee, exemptions] = await Promise.all([
    prisma.sOPAcknowledgement.findMany({ where: { email } }),
    prisma.sOP.findMany({ where: { isArchived: false } }),
    prisma.employee.findUnique({ where: { email }, select: { createdAt: true } }),
    prisma.sOPExemption.findMany({ where: { email } }),
  ]);

  // Employees only see Published SOPs/courses that match their department + role
  const sops = allSops.filter(s => canViewSOP(me, s));

  const sopAcks = new Set(
    sopAckList
      .filter(a => { const sop = sops.find(s => s.id === a.sopId); return sop && a.version === sop.version; })
      .map(a => a.sopId)
  );

  const exemptSet = new Set(exemptions.map(e => e.sopId));
  const deadlines = Object.fromEntries(
    sops.map(sop => [sop.id, getSOPDeadline(sop, employee?.createdAt ?? null, sopAcks.has(sop.id), exemptSet.has(sop.id))])
  );

  const tierProgress = Object.fromEntries(
    LMS_TIERS.map(tier => [tier, calcTierProgress(tier, sops, sopAcks)])
  ) as Record<LmsTier, number>;

  // Super admins bypass tier prerequisites — all tiers are always unlocked
  const tierUnlocked = Object.fromEntries(
    LMS_TIERS.map(tier => {
      const prereq = TIER_PREREQUISITES[tier];
      const unlocked = isSuperAdmin || !prereq || tierProgress[prereq] === 100;
      return [tier, unlocked];
    })
  ) as Record<LmsTier, boolean>;

  // Overall progress
  const allReqSops    = sops.filter(s => s.isRequired);
  const totalItems    = allReqSops.length;
  const doneItems     = allReqSops.filter(s => sopAcks.has(s.id)).length;
  const overallPct    = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const certifications = LMS_TIERS.filter(t => tierUnlocked[t] && tierProgress[t] === 100);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="module-header rounded-2xl p-8 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Learning Management System</p>
            <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>Resource Portal</h2>
            <p className="text-sm text-slate-400 opacity-70">
              Complete each tier to unlock the next. Introductory → Intermediate → Advanced → Upskill.
            </p>
          </div>
        </div>
      </div>

      {/* Overall progress */}
      <div className="card rounded-xl p-6 mb-6 border border-indigo-500/20">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-200">Overall Progress</h4>
          <span className="text-2xl font-bold text-indigo-300">{overallPct}%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-700 overflow-hidden mb-4">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {LMS_TIERS.map(tier => {
            const locked = !tierUnlocked[tier];
            const pct    = tierProgress[tier];
            return (
              <div key={tier} className={`text-center ${locked ? "opacity-40" : ""}`}>
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  {locked && <Lock size={10} className="text-slate-500" />}
                  <p className={`text-xs uppercase tracking-widest ${locked ? "text-slate-600" : TIER_COLORS[tier]}`}>{tier}</p>
                </div>
                <p className={`text-xl font-bold ${locked ? "text-slate-600" : "text-slate-200"}`}>{locked ? "—" : `${pct}%`}</p>
                {!locked && pct === 100 && (
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <Award size={11} className="text-amber-400" />
                    <span className="text-xs text-amber-400">Certified</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          {certifications.map(tier => (
            <div key={tier} className="flex items-center gap-2 rounded-xl px-4 py-2.5 border border-amber-500/30 bg-amber-900/15">
              <Award size={16} className="text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">{TIER_BADGES[tier]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Per-tier sections */}
      {LMS_TIERS.map((tier) => {
        const locked    = !tierUnlocked[tier];
        const prereq    = TIER_PREREQUISITES[tier];
        const prereqPct = prereq ? tierProgress[prereq] : 100;
        const pct       = tierProgress[tier];
        const tierSops  = sops.filter(s => s.tier === tier);

        return (
          <div key={tier} className="mb-8">
            {/* Tier header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {locked
                  ? <Lock size={16} className="text-slate-600" />
                  : pct === 100
                    ? <Award size={16} className="text-amber-400" />
                    : null
                }
                <h3 className={`font-bold text-base ${locked ? "text-slate-600" : TIER_COLORS[tier]}`}>{tier}</h3>
                {!locked && pct === 100 && <span className="text-xs text-amber-400/80">{TIER_BADGES[tier]}</span>}
              </div>
              <span className={`text-sm font-semibold ${locked ? "text-slate-700" : "text-slate-400"}`}>
                {locked ? "Locked" : `${pct}%`}
              </span>
            </div>

            {/* Locked overlay */}
            {locked ? (
              <div className="rounded-2xl border border-slate-700/40 bg-slate-800/20 p-8 text-center">
                <Lock size={28} className="mx-auto mb-3 text-slate-600" />
                <p className="text-sm font-semibold text-slate-500 mb-1">{tier} is locked</p>
                <p className="text-xs text-slate-600">
                  Complete {prereq} first — currently at {prereqPct}%
                </p>
                {prereqPct > 0 && (
                  <div className="mt-4 max-w-xs mx-auto">
                    <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${TIER_COLORS[prereq!]?.replace("text-", "bg-") ?? "bg-indigo-500"}`}
                        style={{ width: `${prereqPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{prereqPct}% of {prereq} complete — need 100%</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? "bg-amber-400" : "bg-indigo-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* SOPs for this tier */}
                {tierSops.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tierSops.map(sop => {
                      const acked      = sopAcks.has(sop.id);
                      const needsReack = !acked && sopAckList.some(a => a.sopId === sop.id);
                      const { deadline, isOverdue } = deadlines[sop.id];
                      return (
                        <ResourcePortalClient
                          key={sop.id}
                          sop={{ ...sop, blocks: sop.blocks as unknown as SOPBlock[] | null }}
                          acked={acked}
                          needsReack={needsReack}
                          deadline={deadline ? deadline.toISOString() : null}
                          isOverdue={isOverdue}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-700/40 bg-slate-800/10 p-6 text-center">
                    <p className="text-sm text-slate-500">No SOPs assigned to this tier for your role yet.</p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
