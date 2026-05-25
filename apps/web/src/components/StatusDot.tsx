import { cn } from "@/lib/utils";
import { toneBg } from "@/lib/statusTheme";
import type { StatusVisual } from "@/lib/statusTheme";

interface StatusDotProps {
  tone?: StatusVisual["tone"];
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusDot({ tone = "muted", pulse, size = "md", className }: StatusDotProps) {
  const dim = size === "sm" ? "size-1.5" : "size-2";
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", dim, className)}
    >
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            toneBg[tone],
          )}
        />
      )}
      <span className={cn("relative inline-flex size-full rounded-full", toneBg[tone])} />
    </span>
  );
}
