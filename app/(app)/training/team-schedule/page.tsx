import { TrainingPage } from "@/components/layout/TrainingPage";
import { prisma } from "@/lib/prisma";
import { ScheduleTable } from "@/components/training/ScheduleTable";

export default async function TeamSchedulePage() {
  const employees = await prisma.employee.findMany({
    where: { status: "Active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, schedule: true },
  });

  return (
    <TrainingPage>
      <div className="w-full max-w-6xl mx-auto pb-12">
        <div className="module-header rounded-2xl p-8 mb-8">
          <h2 className="font-bold text-slate-100 mb-2" style={{ fontSize: 23 }}>Team Schedule</h2>
          <p className="opacity-70 text-sm text-slate-300">Full team shift schedule by day of week. Shift start times are shown in your local timezone.</p>
        </div>

        {/* Coverage Notes */}
        <div className="card rounded-xl p-6 mb-6 bg-indigo-900/15 border border-indigo-500/20">
          <h4 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-4">Coverage Notes</h4>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="flex items-start gap-2"><span className="shrink-0">📢</span><span><strong>Always confirmed:</strong> Check Discord before shift for last-minute changes</span></p>
            <p className="flex items-start gap-2"><span className="shrink-0">🔄</span><span><strong>Coverage backup:</strong> If a team member calls out, the next available member covers their accounts</span></p>
            <p className="flex items-start gap-2"><span className="shrink-0">📧</span><span><strong>Shift changes:</strong> For schedule adjustments or shift swaps, please email your respective Department Head.</span></p>
          </div>
        </div>

        {/* Schedule Table */}
        {employees.length === 0 ? (
          <div className="card rounded-xl py-12 text-center text-slate-500">
            <p className="text-sm">No active employees added yet. Admins can add employees in the Employee Database.</p>
          </div>
        ) : (
          <ScheduleTable employees={employees} />
        )}
      </div>
    </TrainingPage>
  );
}
