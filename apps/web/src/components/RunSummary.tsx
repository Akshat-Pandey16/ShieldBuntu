import {
  AlertOctagon,
  CheckCircle2,
  CircleSlash,
  LifeBuoy,
  RefreshCcw,
  WifiOff,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface RunSummaryProps {
  summary: Record<string, unknown> | null | undefined;
}

interface Item {
  key: string;
  label: string;
  value: number;
  tone: "brand" | "success" | "muted" | "destructive" | "warning" | "info";
  Icon: LucideIcon;
  alwaysShow?: boolean;
}

const toneClass: Record<Item["tone"], string> = {
  brand: "text-brand bg-brand/12 ring-brand/25",
  success: "text-success bg-success/12 ring-success/25",
  muted: "text-muted-foreground bg-muted/40 ring-border/60",
  destructive: "text-destructive bg-destructive/12 ring-destructive/30",
  warning: "text-warning bg-warning/12 ring-warning/30",
  info: "text-info bg-info/12 ring-info/30",
};

function numericValue(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function RunSummary({ summary }: RunSummaryProps) {
  const s = summary ?? {};
  const error = typeof s.error === "string" ? s.error : null;

  const items: Item[] = [
    {
      key: "changed",
      label: "Changed",
      value: numericValue(s.changed),
      tone: "brand",
      Icon: Zap,
      alwaysShow: true,
    },
    {
      key: "ok",
      label: "OK",
      value: numericValue(s.ok),
      tone: "success",
      Icon: CheckCircle2,
      alwaysShow: true,
    },
    {
      key: "skipped",
      label: "Skipped",
      value: numericValue(s.skipped),
      tone: "muted",
      Icon: CircleSlash,
      alwaysShow: true,
    },
    {
      key: "failures",
      label: "Failed",
      value: numericValue(s.failures),
      tone: "destructive",
      Icon: XCircle,
      alwaysShow: true,
    },
    {
      key: "unreachable",
      label: "Unreachable",
      value: numericValue(s.unreachable),
      tone: "warning",
      Icon: WifiOff,
    },
    {
      key: "rescued",
      label: "Rescued",
      value: numericValue(s.rescued),
      tone: "info",
      Icon: LifeBuoy,
    },
    {
      key: "ignored",
      label: "Ignored",
      value: numericValue(s.ignored),
      tone: "muted",
      Icon: RefreshCcw,
    },
  ];

  const visible = items.filter((i) => i.alwaysShow || i.value > 0);

  if (visible.length === 0 && !error) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {visible.map((item) => {
          const dim = item.value === 0;
          return (
            <div
              key={item.key}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 ring-1 transition-opacity",
                toneClass[item.tone],
                dim && "opacity-55",
              )}
            >
              <item.Icon className="size-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">
                {item.label}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">{item.value}</span>
            </div>
          );
        })}
      </div>
      {error && (
        <div className="border-destructive/30 bg-destructive/8 text-destructive flex items-start gap-2.5 rounded-xl border p-3 text-xs">
          <AlertOctagon className="mt-0.5 size-4 shrink-0" />
          <div>
            <div className="text-foreground text-[11px] font-medium uppercase tracking-wide">
              Engine error
            </div>
            <div className="text-muted-foreground mt-0.5 break-words font-mono">{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
