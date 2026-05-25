import { useEffect, useRef, useState } from "react";

export interface RunStreamEvent {
  seq: number;
  level: "info" | "change" | "warning" | "error" | "fatal";
  message: string;
  ts: string;
}

export interface RunTerminalEvent {
  run_id: string;
  status: "succeeded" | "failed" | "cancelled";
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
  reset: () => void;
}

function parseSse<T>(raw: unknown): T | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function useRunStream({ runId, enabled = true }: UseRunStreamOptions): UseRunStreamResult {
  const [events, setEvents] = useState<RunStreamEvent[]>([]);
  const [terminal, setTerminal] = useState<RunTerminalEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || !runId) {
      return;
    }

    const source = new EventSource(`/api/runs/${runId}/stream`, {
      withCredentials: true,
    });
    sourceRef.current = source;

    const onOpen = () => setConnected(true);

    const onEvent = (e: MessageEvent) => {
      const payload = parseSse<RunStreamEvent>(e.data);
      if (!payload) return;
      setEvents((prev) => {
        if (prev.some((p) => p.seq === payload.seq)) return prev;
        return [...prev, payload].sort((a, b) => a.seq - b.seq);
      });
    };

    const onTerminal = (e: MessageEvent) => {
      const payload = parseSse<RunTerminalEvent>(e.data);
      if (payload) setTerminal(payload);
      source.close();
      setConnected(false);
    };

    const onError = () => {
      setConnected(false);
      source.close();
    };

    source.addEventListener("open", onOpen);
    source.addEventListener("event", onEvent);
    source.addEventListener("terminal", onTerminal);
    source.addEventListener("error", onError);

    return () => {
      source.removeEventListener("open", onOpen);
      source.removeEventListener("event", onEvent);
      source.removeEventListener("terminal", onTerminal);
      source.removeEventListener("error", onError);
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [runId, enabled]);

  const reset = () => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setEvents([]);
    setTerminal(null);
    setConnected(false);
  };

  return { events, terminal, connected, reset };
}
