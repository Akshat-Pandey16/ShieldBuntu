import { AlertTriangle, CheckCircle2, Circle, XCircle, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { RunStreamEvent } from "@/lib/useRunStream";

const levelConfig: Record<RunStreamEvent["level"], { color: string; Icon: typeof Circle }> = {
  info: { color: "text-muted-foreground", Icon: Circle },
  change: { color: "text-accent", Icon: Zap },
  warning: { color: "text-amber-400", Icon: AlertTriangle },
  error: { color: "text-destructive", Icon: XCircle },
  fatal: { color: "text-destructive", Icon: XCircle },
};

interface RunEventListProps {
  events: RunStreamEvent[];
  emptyMessage?: string;
}

export function RunEventList({ events, emptyMessage = "No events yet." }: RunEventListProps) {
  if (events.length === 0) {
    return <p className="text-muted-foreground p-6 text-center text-sm">{emptyMessage}</p>;
  }
  return (
    <ol className="divide-border divide-y">
      {events.map((event) => {
        const cfg = levelConfig[event.level] ?? levelConfig.info;
        const Icon = cfg.Icon;
        const isSuccess = event.message.startsWith("OK ") || event.message === "PLAY RECAP";
        const FinalIcon = isSuccess && event.level === "info" ? CheckCircle2 : Icon;
        return (
          <li key={event.seq} className="flex items-start gap-3 px-4 py-2.5 font-mono text-xs">
            <span className="text-muted-foreground w-10 shrink-0 text-right tabular-nums">
              #{event.seq}
            </span>
            <FinalIcon className={cn("mt-0.5 size-3.5 shrink-0", cfg.color)} />
            <span className="flex-1 break-all">{event.message}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatTime(event.ts)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
