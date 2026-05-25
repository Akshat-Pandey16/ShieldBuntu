import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertTriangle, ArrowDown, CheckCircle2, Circle, XCircle, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/format";
import { eventLevelVisual, toneText } from "@/lib/statusTheme";
import { cn } from "@/lib/utils";
import type { RunStreamEvent } from "@/lib/useRunStream";

interface RunEventListProps {
  events: RunStreamEvent[];
  emptyMessage?: string;
}

const levelIcon: Record<RunStreamEvent["level"], LucideIcon> = {
  info: Circle,
  change: Zap,
  warning: AlertTriangle,
  error: XCircle,
  fatal: XCircle,
};

function EventRowImpl({ event }: { event: RunStreamEvent }) {
  const isHeader = event.message.startsWith("TASK:") || event.message.startsWith("PLAY:");
  const isRecap = event.message === "PLAY RECAP";
  const isOk = event.message.startsWith("OK ");
  const vis = eventLevelVisual[event.level];
  const Icon = isOk ? CheckCircle2 : levelIcon[event.level];
  const iconClass = isOk ? "text-success" : toneText[vis.tone];

  return (
    <div
      className={cn(
        "group hover:bg-secondary/40 flex items-start gap-3 px-5 py-2 font-mono text-xs transition-colors",
        isHeader && "bg-muted/40",
        isRecap && "from-brand/10 bg-gradient-to-r to-transparent",
      )}
    >
      <span className="text-muted-foreground/60 w-10 shrink-0 text-right tabular-nums">
        #{event.seq}
      </span>
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", iconClass)} />
      <span
        className={cn(
          "flex-1 break-words leading-relaxed",
          isHeader && "text-foreground font-medium uppercase tracking-wide",
          isRecap && "text-brand font-semibold uppercase tracking-wide",
        )}
      >
        {event.message}
      </span>
      <span className="text-muted-foreground/60 shrink-0 tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
        {formatTime(event.ts)}
      </span>
    </div>
  );
}

const EventRow = memo(EventRowImpl);

export function RunEventList({ events, emptyMessage = "No events yet." }: RunEventListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const virtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 12,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;
    const onScroll = () => {
      const dist = parent.scrollHeight - (parent.scrollTop + parent.clientHeight);
      stickRef.current = dist < 24;
      setShowJump(!stickRef.current && parent.scrollHeight > parent.clientHeight + 80);
    };
    parent.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => parent.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    if (!stickRef.current || events.length === 0) return;
    const parent = parentRef.current;
    if (!parent) return;
    parent.scrollTop = parent.scrollHeight;
  }, [events.length]);

  if (events.length === 0) {
    return <p className="text-muted-foreground px-6 py-10 text-center text-sm">{emptyMessage}</p>;
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div className="relative">
      <div
        ref={parentRef}
        className="scrollbar-thin max-h-[70vh] min-h-[20rem] overflow-y-auto"
      >
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}
        >
          {items.map((row) => {
            const event = events[row.index];
            if (!event) return null;
            return (
              <div
                key={event.seq}
                data-index={row.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${row.start}px)`,
                }}
              >
                <EventRow event={event} />
              </div>
            );
          })}
        </div>
      </div>

      {showJump && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <Button
            size="sm"
            variant="outline"
            className="pointer-events-auto glass-strong gap-1.5 shadow-soft"
            onClick={() => {
              stickRef.current = true;
              const parent = parentRef.current;
              if (parent) parent.scrollTop = parent.scrollHeight;
              setShowJump(false);
            }}
          >
            <ArrowDown className="size-3.5" />
            Jump to latest
          </Button>
        </div>
      )}
    </div>
  );
}
