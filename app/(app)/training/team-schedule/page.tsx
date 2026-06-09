import { TrainingPage } from "@/components/layout/TrainingPage";
import { prisma } from "@/lib/prisma";
import { SCHEDULE_SHIFTS } from "@/lib/utils";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default async function TeamSchedulePage() {
  const employees = await prisma.employee.findMany({
    where: { status: "Active" },
    orderBy: { name: "asc" },
  });

  return (
    <TrainingPage>
      <div className="w-full max-w-6xl mx-auto pb-12">
        <div className="module-header rounded-2xl p-8 mb-8">
          <h2 className="font-bold text-slate-100 mb-2" style={{ fontSize: 23 }}>Team Schedule</h2>
          <p className="opacity-70 text-sm text-slate-300">Full team shift schedule by day of week. Times are in CST.</p>
        </div>

        {/* Schedule Legends */}
        <div className="card rounded-xl p-6 mb-6 border border-indigo-500/20">
          <h4 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-4">Schedule Legends</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SCHEDULE_SHIFTS.map(shift => (
              <div key={shift.code} className="bg-slate-800/40 rounded-lg p-3 text-center">
                <p className={`text-base font-bold mb-1 ${shift.color}`}>{shift.code}</p>
                <p className="text-xs text-slate-400">{shift.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Coverage Notes */}
        <div className="card rounded-xl p-6 mb-6 bg-indigo-900/15 border border-indigo-500/20">
          <h4 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-4">Coverage Notes</h4>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="flex items-start gap-2"><span className="shrink-0">📢</span><span><strong>Always confirmed:</strong> Check Discord before shift for last-minute changes</span></p>
            <p className="flex items-start gap-2"><span className="shrink-0">🔄</span><span><strong>Coverage backup:</strong> If a team member calls out, the next available member covers their accounts</span></p>
            <p className="flex items-start gap-2"><span className="shrink-0">📧</span><span><strong>Shift changes:</strong> Email <a href="mailto:vii@fatbearagency.com" className="text-indigo-400 hover:text-indigo-300 transition">vii@fatbearagency.com</a> for schedule adjustments or swaps</span></p>
          </div>
        </div>

        {/* Schedule Table */}
        {employees.length === 0 ? (
          <div className="card rounded-xl py-12 text-center text-slate-500">
            <p className="text-sm">No active employees added yet. Admins can add employees in the Employee Database.</p>
          </div>
        ) : (
          <div className="card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    {DAYS.map(d => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => {
                    const sched = (emp.schedule as Record<string, string>) ?? {};
                    return (
                      <tr key={emp.id}>
                        <td>
                          <div className="text-slate-200 font-medium">{emp.name}</div>
                          <div className="text-xs text-slate-500">{emp.email}</div>
                        </td>
                        <td>{emp.role}</td>
                        {DAYS.map(d => {
                          const shift = SCHEDULE_SHIFTS.find(s => s.code === sched[d]);
                          return (
                            <td key={d}>
                              {sched[d] ? (
                                <span className={`text-xs font-semibold ${shift?.color ?? "text-indigo-300"}`}>
                                  {sched[d]}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-600">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </TrainingPage>
  );
}
