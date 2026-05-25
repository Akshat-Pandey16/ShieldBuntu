import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type EventLevel, type RunStatus } from "./api";

export interface RunStreamEvent {
  seq: number;
  level: EventLevel;
  message: string;
  ts: string;
}

export interface RunTerminalEvent {
  run_id: string;
  status: RunStatus;
  exit_code: number | null;
}

interface UseRunStreamOptions {
  runId: string | undefined;
  enabled?: boolean;
}

interface UseRunStreamResult {
  events: RunStreamEvent[];
  terminal: RunTerminalEvent | null;
  connected: boolean;
  retryCount: number;
  reset: () => void;
}

const MAX_EVENTS = 5_000;
const eventsKey = (runId: string) => ["run", runId, "events"] as const;
const EMPTY: RunStreamEvent[] = [];

function safeParse<T>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function appendDedup(prev: RunStreamEvent[], incoming: RunStreamEvent): RunStreamEvent[] {
  const lastSeq = prev.length === 0 ? 0 : prev[prev.length - 1]!.seq;
  if (incoming.seq <= lastSeq) return prev;
  const next = [...prev, incoming];
  return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
}

function mergeBatch(prev: RunStreamEvent[], batch: RunStreamEvent[]): RunStreamEvent[] {
  let result = prev;
  for (const incoming of batch) {
    result = appendDedup(result, incoming);
  }
  return result;
}

export function useRunStream({ runId, enabled = true }: UseRunStreamOptions): UseRunStreamResult {
  const queryClient = useQueryClient();
  const { data: events = EMPTY } = useQuery<RunStreamEvent[]>({
    queryKey: runId ? eventsKey(runId) : ["run", "noop", "events"],
    queryFn: () => Promise.resolve([] as RunStreamEvent[]),
    enabled: !!runId,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });

  const [terminal, setTerminal] = useState<RunTerminalEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);
  const retryRef = useRef(0);

  const reset = useCallback(() => {
    stoppedRef.current = true;
    sourceRef.current?.close();
    sourceRef.current = null;
    if (reconnectRef.current != null) {
      window.clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
    retryRef.current = 0;
    if (runId) queryClient.setQueryData<RunStreamEvent[]>(eventsKey(runId), []);
    setTerminal(null);
    setConnected(false);
    setRetryCount(0);
  }, [queryClient, runId]);

  useEffect(() => {
    if (!enabled || !runId) return;

    stoppedRef.current = false;
    let cancelled = false;

    const readCurrent = (): RunStreamEvent[] =>
      queryClient.getQueryData<RunStreamEvent[]>(eventsKey(runId)) ?? [];

    const currentLastSeq = (): number => {
      const cur = readCurrent();
      return cur.length === 0 ? 0 : cur[cur.length - 1]!.seq;
    };

    const writeAppend = (incoming: RunStreamEvent): void => {
      queryClient.setQueryData<RunStreamEvent[]>(eventsKey(runId), (prev) =>
        appendDedup(prev ?? [], incoming),
      );
    };

    const writeBatch = (batch: RunStreamEvent[]): void => {
      queryClient.setQueryData<RunStreamEvent[]>(eventsKey(runId), (prev) =>
        mergeBatch(prev ?? [], batch),
      );
    };

    const hydrate = async (): Promise<void> => {
      try {
        const { data } = await api.GET("/api/runs/{run_id}/events", {
          params: {
            path: { run_id: runId },
            query: { since_seq: currentLastSeq(), limit: 5000 },
          },
        });
        if (cancelled || !data || data.length === 0) return;
        writeBatch(
          data.map((ev) => ({
            seq: ev.seq,
            level: ev.level,
            message: ev.message,
            ts: ev.ts,
          })),
        );
      } catch {
        // SSE replay handles missed events
      }
    };

    const open = (): void => {
      if (stoppedRef.current || cancelled) return;
      const url = `/api/runs/${runId}/stream?since_seq=${currentLastSeq()}`;
      const source = new EventSource(url, { withCredentials: true });
      sourceRef.current = source;

      source.addEventListener("open", () => {
        if (cancelled) return;
        setConnected(true);
        retryRef.current = 0;
        setRetryCount(0);
      });

      source.addEventListener("event", (e: MessageEvent) => {
        const payload = safeParse<RunStreamEvent>(e.data);
        if (!payload) return;
        writeAppend(payload);
      });

      source.addEventListener("terminal", (e: MessageEvent) => {
        const payload = safeParse<RunTerminalEvent>(e.data);
        if (payload) setTerminal(payload);
        stoppedRef.current = true;
        source.close();
        sourceRef.current = null;
        setConnected(false);
      });

      source.addEventListener("error", () => {
        source.close();
        sourceRef.current = null;
        setConnected(false);
        if (stoppedRef.current || cancelled) return;
        retryRef.current += 1;
        setRetryCount(retryRef.current);
        const delay = Math.min(15000, 750 * Math.pow(2, Math.min(retryRef.current - 1, 4)));
        reconnectRef.current = window.setTimeout(() => {
          reconnectRef.current = null;
          open();
        }, delay);
      });
    };

    void hydrate().finally(open);

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      sourceRef.current?.close();
      sourceRef.current = null;
      if (reconnectRef.current != null) {
        window.clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      setConnected(false);
    };
  }, [enabled, runId, queryClient]);

  return { events, terminal, connected, retryCount, reset };
}
