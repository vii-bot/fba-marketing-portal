import { TrainingPage } from "@/components/layout/TrainingPage";

export default function PayrollPage() {
  return (
    <TrainingPage>
      <div className="w-full max-w-6xl mx-auto">
        <div className="module-header rounded-2xl p-8 mb-8">
          <h2 className="font-bold text-slate-100 mb-2" style={{ fontSize: 23 }}>Payroll</h2>
          <p className="opacity-70 text-sm text-slate-300">Payment structure, pay schedule, and payroll information.</p>
        </div>
        <div className="space-y-6">
          <div className="card rounded-xl p-6">
            <h4 className="font-semibold text-indigo-300 mb-3">Payment Structure</h4>
            <div className="space-y-3">
              {[
                { label: "Pay Schedule", value: "Every 5th and 20th of each month" },
                { label: "Payment Method", value: "PayPal" },
                { label: "Overtime Compensation", value: "OT hours paid at specified rate (see your contract)" },
              ].map(item => (
                <div key={item.label} className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs uppercase text-indigo-400 font-medium mb-1">{item.label}</p>
                  <p className="text-sm text-slate-300">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card rounded-xl p-6">
            <h4 className="font-semibold text-indigo-300 mb-4">Understanding Your Paycheck</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-4 bg-indigo-900/25 border border-indigo-500/20 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">⏰</div>
                <div><p className="text-xs font-semibold text-slate-200 mb-0.5">Base Hours</p><p className="text-xs text-slate-400">Standard weekly hours × hourly rate</p></div>
              </div>
              <div className="rounded-xl p-4 bg-amber-900/25 border border-amber-500/20 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">➕</div>
                <div><p className="text-xs font-semibold text-slate-200 mb-0.5">Overtime</p><p className="text-xs text-slate-400">OT hours × OT rate (usually 1.5×)</p></div>
              </div>
            </div>
            <p className="text-xs text-amber-300 mt-3">💡 Keep records of your clock-in/out times for verification.</p>
          </div>

          <div className="card rounded-xl p-6">
            <h4 className="font-semibold text-indigo-300 mb-3">Payroll Accuracy</h4>
            <p className="text-sm text-slate-300 mb-3">If you notice a discrepancy in your paycheck:</p>
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="flex items-start gap-2"><span>🕐</span><span>Review your hours logged in the Cubicle Bot</span></li>
              <li className="flex items-start gap-2"><span>✅</span><span>Verify all approved OT requests were included</span></li>
              <li className="flex items-start gap-2"><span>☕</span><span>Check that all breaks were logged correctly</span></li>
              <li className="flex items-start gap-2"><span>📩</span><span>Contact your manager with documentation</span></li>
              <li className="flex items-start gap-2"><span>📄</span><span>Provide proof of hours worked if needed</span></li>
            </ul>
          </div>

          <div className="card rounded-xl p-6">
            <h4 className="font-semibold text-indigo-300 mb-3">OT Payment Notes</h4>
            <ul className="text-sm text-slate-300 space-y-2">
              <li className="flex items-start gap-2"><span>✅</span><span>OT must be pre-approved to be paid</span></li>
              <li className="flex items-start gap-2"><span>⚠️</span><span>Unapproved OT hours may not be compensated</span></li>
              <li className="flex items-start gap-2"><span>📅</span><span>Weekend OT requires Friday 4:00 PM CST approval</span></li>
              <li className="flex items-start gap-2"><span>📝</span><span>Track all OT hours for your records</span></li>
              <li className="flex items-start gap-2"><span>🚨</span><span>Report discrepancies immediately</span></li>
            </ul>
          </div>
        </div>
      </div>
    </TrainingPage>
  );
}
