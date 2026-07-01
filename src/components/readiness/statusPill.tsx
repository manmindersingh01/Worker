import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import type { ClientReadinessItem } from "~/lib/readiness/serialize";

type Status = ClientReadinessItem["status"];

const CONFIG: Record<
  Status,
  { label: string; icon: React.ElementType; className: string }
> = {
  PRESENT: {
    label: "Present",
    icon: CheckCircle2,
    className: "border-success/40 bg-success/10 text-success",
  },
  PARTIAL: {
    label: "Partial",
    icon: AlertTriangle,
    className: "border-warning/40 bg-warning/10 text-warning",
  },
  MISSING: {
    label: "Missing",
    icon: XCircle,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  NEEDS_REVIEW: {
    label: "Needs review",
    icon: HelpCircle,
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
};

export function StatusPill({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const c = CONFIG[status];
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        c.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {c.label}
    </span>
  );
}

/** The colour band for an overall / category score, used across the dashboard. */
export function scoreTone(score: number): {
  label: string;
  text: string;
  bar: string;
} {
  if (score >= 80)
    return { label: "On track", text: "text-success", bar: "bg-success" };
  if (score >= 50)
    return { label: "At risk", text: "text-warning", bar: "bg-warning" };
  return { label: "Not ready", text: "text-destructive", bar: "bg-destructive" };
}
