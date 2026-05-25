import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RunStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

const statusConfig: Record<
  RunStatus,
  { label: string; variant: "default" | "muted" | "accent" | "success" | "destructive" }
> = {
  pending: { label: "Pending", variant: "muted" },
  running: { label: "Running", variant: "accent" },
  succeeded: { label: "Succeeded", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

interface RunStatusBadgeProps {
  status: string;
  className?: string;
}

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  const cfg = statusConfig[status as RunStatus] ?? { label: status, variant: "muted" as const };
  return (
    <Badge variant={cfg.variant} className={cn(status === "running" && "animate-pulse", className)}>
      {cfg.label}
    </Badge>
  );
}
