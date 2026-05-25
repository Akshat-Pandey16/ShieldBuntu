import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Circle, XCircle, Zap } from "lucide-react";
import autoAnimate from "@formkit/auto-animate";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { RunStreamEvent } from "@/lib/useRunStream";

const levelConfig: Record<RunStreamEvent["level"], { color: string; Icon: typeof Circle }> = {
  info: { color: "text-muted-foreground", Icon: Circle },
  change: { color: "text-accent", Icon: Zap },
  warning: { color: "text-warning", Icon: AlertTriangle },
  error: { color: "text-destructive", Icon: XCircle },
  fatal: { color: "text-destructive", Icon: XCircle },
};

interface RunEventListProps {
  events: RunStreamEvent[];
  emptyMessage?: string;
  autoScroll?: boolean;
}

export function RunEventList({
  events,
  emptyMessage = "No events yet.",
  autoScroll = true,
}: RunEventListProps) {
  const parentRef = useRef<HTMLOListElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (parentRef.current) autoAnimate(parentRef.current, { duration: 150 });
  }, []);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [events.length, autoScroll]);

  if (events.length === 0) {
    return <p className="text-muted-foreground p-8 text-center text-sm">{emptyMessage}</p>;
  }

  return (
    <>
      <ol ref={parentRef} className="divide-border divide-y">
        {events.map((event) => {
          const cfg = levelConfig[event.level] ?? levelConfig.info;
          const isHeader = event.message.startsWith("TASK:") || event.message.startsWith("PLAY:");
          const isOk = event.message.startsWith("OK ");
          const FinalIcon = isOk ? CheckCircle2 : cfg.Icon;
          const iconColor = isOk ? "text-success" : cfg.color;
          return (
            <li
              key={event.seq}
              className={cn(
                "group hover:bg-secondary/50 flex items-start gap-3 px-5 py-2.5 font-mono text-xs transition-colors",
                isHeader && "bg-muted/40",
              )}
            >
              <span className="text-muted-foreground/70 w-9 shrink-0 text-right tabular-nums">
                #{event.seq}
              </span>
              <FinalIcon className={cn("mt-0.5 size-3.5 shrink-0", iconColor)} />
              <span
                className={cn(
                  "flex-1 break-all leading-relaxed",
                  isHeader && "text-foreground font-medium uppercase tracking-wide",
                )}
              >
                {event.message}
              </span>
              <span className="text-muted-foreground/70 shrink-0 tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                {formatTime(event.ts)}
              </span>
            </li>
          );
        })}
      </ol>
      <div ref={bottomRef} />
    </>
  );
}
