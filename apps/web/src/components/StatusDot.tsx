import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "info" | "muted" | "accent";

interface StatusDotProps {
  tone?: Tone;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  accent: "bg-accent",
  muted: "bg-muted-foreground/60",
};

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
            toneClasses[tone],
          )}
        />
      )}
      <span className={cn("relative inline-flex size-full rounded-full", toneClasses[tone])} />
    </span>
  );
}
