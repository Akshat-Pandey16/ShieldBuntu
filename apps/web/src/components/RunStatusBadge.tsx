import { CheckCircle2, Circle, CircleDot, OctagonX, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { StatusDot } from "@/components/StatusDot";
import { cn } from "@/lib/utils";

export type RunStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

interface Config {
  label: string;
  tone: "muted" | "accent" | "success" | "destructive" | "warning";
  Icon: LucideIcon;
  pulse?: boolean;
}

const config: Record<RunStatus, Config> = {
  pending: { label: "Pending", tone: "muted", Icon: Circle },
  running: { label: "Running", tone: "accent", Icon: CircleDot, pulse: true },
  succeeded: { label: "Succeeded", tone: "success", Icon: CheckCircle2 },
  failed: { label: "Failed", tone: "destructive", Icon: XCircle },
  cancelled: { label: "Cancelled", tone: "warning", Icon: OctagonX },
};

interface RunStatusBadgeProps {
  status: string;
  variant?: "pill" | "icon" | "compact";
  className?: string;
}

export function RunStatusBadge({ status, variant = "pill", className }: RunStatusBadgeProps) {
  const cfg = config[status as RunStatus] ?? config.pending;
  if (variant === "icon") {
    const Icon = cfg.Icon;
    return (
      <Icon
        className={cn(
          "size-4",
          {
            "text-muted-foreground": cfg.tone === "muted",
            "text-accent": cfg.tone === "accent",
            "text-success": cfg.tone === "success",
            "text-destructive": cfg.tone === "destructive",
            "text-warning": cfg.tone === "warning",
          },
          cfg.pulse && "animate-pulse",
          className,
        )}
      />
    );
  }
  if (variant === "compact") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
        <StatusDot tone={cfg.tone} pulse={cfg.pulse} size="sm" />
        <span className="text-foreground">{cfg.label}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        {
          "border-muted-foreground/30 text-muted-foreground": cfg.tone === "muted",
          "border-accent/40 text-accent bg-accent/10": cfg.tone === "accent",
          "border-success/40 text-success bg-success/10": cfg.tone === "success",
          "border-destructive/40 text-destructive bg-destructive/10": cfg.tone === "destructive",
          "border-warning/40 text-warning bg-warning/10": cfg.tone === "warning",
        },
        className,
      )}
    >
      <StatusDot tone={cfg.tone} pulse={cfg.pulse} size="sm" />
      {cfg.label}
    </span>
  );
}
