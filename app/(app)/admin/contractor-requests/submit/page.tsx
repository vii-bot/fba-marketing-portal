"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import {
  CONTRACTOR_REQUEST_TYPES, CONTRACTOR_REQUEST_DEPARTMENTS, COMPENSATION_TYPES,
  adjustToPayPeriod,
} from "@/lib/utils";

const EQUIPMENT_RETURN_OPTIONS = ["Yes", "No", "Other"];
const YES_NO = ["Yes", "No"];
const LOCATIONS = ["International", "U.S."];

const emptyForm = () => ({
  department: CONTRACTOR_REQUEST_DEPARTMENTS[0],
  customDepartment: "",
  requestType: CONTRACTOR_REQUEST_TYPES[0],

  // Termination
  contractorName: "",
  role: "",
  lastWorkingDay: "",
  reason: "",
  equipmentReturn: "",
  equipmentReturnOther: "",
  additionalNotes: "",

  // Department Transfer
  currentDepartment: "",
  changingRoles: "",
  previousRole: "",
  newDepartment: "",
  newRole: "",
  newCompensation: "",
  effectiveDate: "",

  // Compensation Adjustment
  currentRole: "",
  switchingRoles: "",
  compensationType: "",
  hourlyRate: "",
  salaryAmount: "",
  reasonNotes: "",

  // Hire
  location: "",
  fullLegalName: "",
  preferredName: "",
  personalEmail: "",
  personalPhone: "",
  jobTitle: "",
  taskDescription: "",
  startDate: "",
});

export default function ContractorRequestFormPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const set = (k: keyof ReturnType<typeof emptyForm>, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inp = (key: keyof ReturnType<typeof emptyForm>) => ({
    className: "sf-input" as string,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(key, e.target.value),
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    const res = await fetch("/api/contractor-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSuccess("Contractor change request submitted.");
      setForm(emptyForm());
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to submit request.");
    }
    setLoading(false);
  };

  const adjustedEffectiveDate = form.requestType === "Compensation Adjustment" && form.effectiveDate
    ? adjustToPayPeriod(form.effectiveDate)
    : null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="module-header rounded-2xl p-8 mb-6">
        <p className="text-xs uppercase tracking-wider text-indigo-400 mb-2">Contractor Change Requests</p>
        <h2 className="font-bold text-slate-100 mb-1" style={{ fontSize: 23 }}>FBA Contractor Change Request</h2>
        <p className="text-sm text-slate-400 opacity-70">Submit terminations, transfers, compensation changes, and new hires.</p>
        <Link href="/admin/contractor-requests" className="inline-block mt-3 text-xs text-indigo-400 hover:text-indigo-300">View request dashboard →</Link>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {/* Common fields */}
        <div className="card rounded-xl p-6 space-y-4">
          <div>
            <label className="sf-label">Requester Email</label>
            <input className="sf-input" value={session?.user?.email ?? ""} disabled />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="sf-label">Department *</label>
              <select required {...inp("department")}>
                {CONTRACTOR_REQUEST_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>
            {form.department === "Other" && (
              <div>
                <label className="sf-label">Specify Department *</label>
                <input required {...inp("customDepartment")} placeholder="Department name" />
              </div>
            )}
            <div>
              <label className="sf-label">Request Type *</label>
              <select required {...inp("requestType")}>
                {CONTRACTOR_REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Termination */}
        {form.requestType === "Termination" && (
          <div className="card rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-rose-300 text-sm">Termination Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="sf-label">Contractor&apos;s Name *</label><input required {...inp("contractorName")} /></div>
              <div><label className="sf-label">Title / Role *</label><input required {...inp("role")} /></div>
              <div><label className="sf-label">Last Working Day *</label><input required type="date" {...inp("lastWorkingDay")} /></div>
              <div>
                <label className="sf-label">Equipment Return Needed *</label>
                <select required {...inp("equipmentReturn")}>
                  <option value="">Select…</option>
                  {EQUIPMENT_RETURN_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {form.equipmentReturn === "Other" && (
                <div className="md:col-span-2"><label className="sf-label">Specify Equipment Return *</label><input required {...inp("equipmentReturnOther")} /></div>
              )}
            </div>
            <div><label className="sf-label">Reason for Termination *</label><textarea required {...inp("reason")} /></div>
            <div><label className="sf-label">Additional Notes</label><textarea {...inp("additionalNotes")} placeholder="Optional…" /></div>
          </div>
        )}

        {/* Department Transfer */}
        {form.requestType === "Department Transfer" && (
          <div className="card rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-sky-300 text-sm">Department Transfer Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="sf-label">Contractor&apos;s Name *</label><input required {...inp("contractorName")} /></div>
              <div><label className="sf-label">Current Department *</label><input required {...inp("currentDepartment")} /></div>
              <div>
                <label className="sf-label">Will they be changing roles? *</label>
                <select required {...inp("changingRoles")}>
                  <option value="">Select…</option>
                  {YES_NO.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div><label className="sf-label">Previous Role *</label><input required {...inp("previousRole")} /></div>
              <div><label className="sf-label">New Department *</label><input required {...inp("newDepartment")} /></div>
              <div><label className="sf-label">New Role *</label><input required {...inp("newRole")} /></div>
              <div><label className="sf-label">New Compensation *</label><input required {...inp("newCompensation")} placeholder="e.g. $5.00/hr" /></div>
              <div><label className="sf-label">Effective Date *</label><input required type="date" {...inp("effectiveDate")} /></div>
            </div>
            <div><label className="sf-label">Additional Notes</label><textarea {...inp("additionalNotes")} placeholder="Optional…" /></div>
          </div>
        )}

        {/* Compensation Adjustment */}
        {form.requestType === "Compensation Adjustment" && (
          <div className="card rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-emerald-300 text-sm">Compensation Adjustment Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="sf-label">Contractor&apos;s Name *</label><input required {...inp("contractorName")} /></div>
              <div><label className="sf-label">Current Title / Role *</label><input required {...inp("currentRole")} /></div>
              <div>
                <label className="sf-label">Will they be switching roles? *</label>
                <select required {...inp("switchingRoles")}>
                  <option value="">Select…</option>
                  {YES_NO.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="sf-label">New Compensation Type *</label>
                <select required {...inp("compensationType")}>
                  <option value="">Select…</option>
                  {COMPENSATION_TYPES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {form.compensationType === "Hourly" && (
                <div><label className="sf-label">New Hourly Rate *</label><input required type="number" step="0.01" min="0" {...inp("hourlyRate")} placeholder="e.g. 4.50" /></div>
              )}
              {form.compensationType === "Salary / Flat Rate" && (
                <div><label className="sf-label">New Salary / Flat Rate Amount *</label><input required type="number" step="0.01" min="0" {...inp("salaryAmount")} placeholder="e.g. 800" /></div>
              )}
              <div>
                <label className="sf-label">Effective Date of Change *</label>
                <input required type="date" {...inp("effectiveDate")} />
                {adjustedEffectiveDate && adjustedEffectiveDate !== form.effectiveDate && (
                  <p className="text-xs text-amber-400 mt-1">Will be adjusted to {adjustedEffectiveDate} (next pay period start).</p>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
              <p className="text-xs text-slate-400">
                Wage changes must take effect on the first day of a pay period, either the 1st or 16th of each month.
                If you select a date that falls mid-pay-period, the effective date will automatically be adjusted to
                the next upcoming period.
              </p>
            </div>
            <div><label className="sf-label">Reason / Notes</label><textarea {...inp("reasonNotes")} placeholder="Optional…" /></div>
          </div>
        )}

        {/* Hire */}
        {form.requestType === "Hire" && (
          <div className="card rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-indigo-300 text-sm">Hire Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="sf-label">Location *</label>
                <select required {...inp("location")}>
                  <option value="">Select…</option>
                  {LOCATIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div><label className="sf-label">Full Legal Name *</label><input required {...inp("fullLegalName")} /></div>
              <div><label className="sf-label">Preferred Name</label><input {...inp("preferredName")} /></div>
              <div><label className="sf-label">Personal Email Address *</label><input required type="email" {...inp("personalEmail")} /></div>
              <div><label className="sf-label">Personal Phone Number *</label><input required {...inp("personalPhone")} /></div>
              <div><label className="sf-label">Job Title / Role *</label><input required {...inp("jobTitle")} /></div>
              <div><label className="sf-label">Start Date *</label><input required type="date" {...inp("startDate")} /></div>
              <div>
                <label className="sf-label">Compensation Structure *</label>
                <select required {...inp("compensationType")}>
                  <option value="">Select…</option>
                  {COMPENSATION_TYPES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {form.compensationType === "Hourly" && (
                <div><label className="sf-label">Hourly Rate *</label><input required type="number" step="0.01" min="0" {...inp("hourlyRate")} placeholder="e.g. 4.25" /></div>
              )}
              {form.compensationType === "Salary / Flat Rate" && (
                <div><label className="sf-label">Salary / Flat Rate Amount *</label><input required type="number" step="0.01" min="0" {...inp("salaryAmount")} placeholder="e.g. 800" /></div>
              )}
            </div>
            <div><label className="sf-label">Brief Description of Tasks / Responsibilities *</label><textarea required {...inp("taskDescription")} /></div>
          </div>
        )}

        {error   && <p className="text-sm text-rose-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400 font-medium">{success}</p>}
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60">
          {loading ? "Submitting…" : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
