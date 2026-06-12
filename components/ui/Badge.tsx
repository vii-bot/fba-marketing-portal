import { cn } from "@/lib/utils";

type BadgeVariant =
  | "pending" | "active" | "appealed" | "resolved" | "archived"
  | "first" | "onstrike" | "final" | "eval" | "term"
  | "compliance" | "attendance";

const variantMap: Record<string, string> = {
  "pending review": "badge-pending",
  active:           "badge-active",
  appealed:         "badge-appealed",
  resolved:         "badge-resolved",
  archived:         "badge-archived",
  "first warning":  "badge-first",
  "on strike":      "badge-onstrike",
  "final warning":  "badge-final",
  "for evaluation": "badge-eval",
  terminated:       "badge-term",
  compliance:       "badge-compliance",
  attendance:       "badge-attendance",

  // Employee login/setup status (lib/employee-status.ts)
  "login active":          "badge-resolved",
  "profile setup pending": "badge-pending",
  "invite sent":           "badge-appealed",
  "invite expired":        "badge-term",
  "permissions pending":   "badge-archived",
};

export function Badge({ label, className }: { label: string; className?: string }) {
  const variant = variantMap[label.toLowerCase()] ?? "badge-archived";
  return (
    <span className={cn("badge", variant, className)}>
      {label}
    </span>
  );
}
