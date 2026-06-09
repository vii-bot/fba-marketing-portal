import Link from "next/link";
import { Calendar, Clock, CalendarOff, ClipboardList } from "lucide-react";

export default function SchedulePage() {
  return (
    <div className="w-full max-w-6xl mx-auto pb-12">
      <div className="module-header rounded-2xl p-8 mb-8">
        <h2 className="font-bold text-slate-100 mb-2" style={{ fontSize: 23 }}>My Schedule</h2>
        <p className="text-sm text-slate-400 opacity-70">Quick access to team tools, requests, and operational workflows.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/training/team-schedule" className="ops-card block">
          <Calendar size={28} className="text-indigo-400 mb-3" />
          <p className="font-semibold text-slate-100 mb-1">Team Schedule</p>
          <p className="text-sm text-slate-400">View the full team&apos;s shift schedule by day.</p>
        </Link>

        <Link href="/attendance?tab=ot" className="ops-card block">
          <Clock size={28} className="text-emerald-400 mb-3" />
          <p className="font-semibold text-slate-100 mb-1">Submit OT Request</p>
          <p className="text-sm text-slate-400">Log overtime hours for the current week.</p>
        </Link>

        <Link href="/attendance?tab=leave" className="ops-card block">
          <CalendarOff size={28} className="text-amber-400 mb-3" />
          <p className="font-semibold text-slate-100 mb-1">Submit Leave Request</p>
          <p className="text-sm text-slate-400">Request a day off or emergency leave.</p>
        </Link>

        <Link href="/my-requests" className="ops-card block">
          <ClipboardList size={28} className="text-indigo-300 mb-3" />
          <p className="font-semibold text-slate-100 mb-1">My OT Requests</p>
          <p className="text-sm text-slate-400">Track your submitted requests and OT balance.</p>
        </Link>
      </div>
    </div>
  );
}
