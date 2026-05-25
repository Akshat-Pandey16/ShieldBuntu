import {
  CheckCircle2,
  CircleDashed,
  CircleDot,
  CircleMinus,
  OctagonX,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { EventLevel, RunStatus } from "./api";

export interface StatusVisual {
  label: string;
  tone: "muted" | "brand" | "success" | "destructive" | "warning" | "info";
  Icon: LucideIcon;
  pulse?: boolean;
}

export const runStatusVisual: Record<RunStatus, StatusVisual> = {
  pending: { label: "Pending", tone: "muted", Icon: CircleDashed },
  running: { label: "Running", tone: "brand", Icon: CircleDot, pulse: true },
  succeeded: { label: "Applied", tone: "success", Icon: CheckCircle2 },
  no_change: { label: "No change", tone: "info", Icon: CircleMinus },
  failed: { label: "Failed", tone: "destructive", Icon: XCircle },
  cancelled: { label: "Cancelled", tone: "warning", Icon: OctagonX },
};

export function getRunStatusVisual(status: string | undefined | null): StatusVisual {
  return (status && runStatusVisual[status as RunStatus]) || runStatusVisual.pending;
}

export const toneText: Record<StatusVisual["tone"], string> = {
  muted: "text-muted-foreground",
  brand: "text-brand",
  success: "text-success",
  destructive: "text-destructive",
  warning: "text-warning",
  info: "text-info",
};

export const toneBg: Record<StatusVisual["tone"], string> = {
  muted: "bg-muted",
  brand: "bg-brand",
  success: "bg-success",
  destructive: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
};

export const tonePill: Record<StatusVisual["tone"], string> = {
  muted: "border-muted-foreground/30 text-muted-foreground bg-muted/40",
  brand: "border-brand/40 text-brand bg-brand/12",
  success: "border-success/40 text-success bg-success/12",
  destructive: "border-destructive/40 text-destructive bg-destructive/12",
  warning: "border-warning/40 text-warning bg-warning/12",
  info: "border-info/40 text-info bg-info/12",
};

export const eventLevelVisual: Record<EventLevel, { tone: StatusVisual["tone"] }> = {
  info: { tone: "muted" },
  change: { tone: "brand" },
  warning: { tone: "warning" },
  error: { tone: "destructive" },
  fatal: { tone: "destructive" },
};
