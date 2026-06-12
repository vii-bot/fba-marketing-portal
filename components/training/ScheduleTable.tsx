"use client";

import { SCHEDULE_SHIFTS, SHIFT_START_UTC_HOUR } from "@/lib/utils";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

interface ScheduleEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  schedule: unknown;
}

function formatShiftStart(code: string): string {
  const utcHour = SHIFT_START_UTC_HOUR[code];
  if (utcHour === undefined) return code;
  const ref = new Date(Date.UTC(2024, 0, 1, utcHour, 0, 0));
  return ref.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ScheduleTable({ employees }: { employees: ScheduleEmployee[] }) {
  return (
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
                    const code = sched[d];
                    const shift = SCHEDULE_SHIFTS.find(s => s.code === code);
                    return (
                      <td key={d}>
                        {code ? (
                          <span className={`text-xs font-semibold ${shift?.color ?? "text-indigo-300"}`} suppressHydrationWarning>
                            {code === "OFF" ? "OFF" : formatShiftStart(code)}
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
  );
}
