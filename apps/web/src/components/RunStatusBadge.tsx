import { StatusDot } from "@/components/StatusDot";
import { getRunStatusVisual, toneText, tonePill } from "@/lib/statusTheme";
import { cn } from "@/lib/utils";

interface RunStatusBadgeProps {
  status: string;
  variant?: "pill" | "icon" | "compact";
  className?: string;
}

export function RunStatusBadge({ status, variant = "pill", className }: RunStatusBadgeProps) {
  const cfg = getRunStatusVisual(status);

  if (variant === "icon") {
    const Icon = cfg.Icon;
    return (
      <Icon
        className={cn(
          "size-4",
          toneText[cfg.tone],
          cfg.pulse && "animate-pulse",
          className,
        )}
        aria-label={cfg.label}
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
        tonePill[cfg.tone],
        className,
      )}
    >
      <StatusDot tone={cfg.tone} pulse={cfg.pulse} size="sm" />
      {cfg.label}
    </span>
  );
}
