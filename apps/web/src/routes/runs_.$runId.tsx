import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ChevronLeft, OctagonX, Radio, ShieldOff } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { RunEventList } from "@/components/RunEventList";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { StatusDot } from "@/components/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { formatDuration, formatTimestamp } from "@/lib/format";
import { useRunStream } from "@/lib/useRunStream";

export const Route = createFileRoute("/runs_/$runId")({
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient, location.href),
  component: RunDetailPage,
});

const TERMINAL = new Set(["succeeded", "failed", "cancelled"]);

function RunDetailPage() {
  const { runId } = Route.useParams();
  const queryClient = useQueryClient();

  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: async () => {
      const { data, response } = await api.GET("/api/runs/{run_id}", {
        params: { path: { run_id: runId } },
      });
      if (response.status === 404) return null;
      return data ?? null;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL.has(status)) return false;
      return 1500;
    },
  });

  const isTerminal = runQuery.data ? TERMINAL.has(runQuery.data.status) : false;
  const stream = useRunStream({ runId, enabled: !!runQuery.data });

  useEffect(() => {
    if (stream.terminal) {
      void queryClient.invalidateQueries({ queryKey: ["run", runId] });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    }
  }, [stream.terminal, queryClient, runId]);

  const cancelRun = useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST("/api/runs/{run_id}/cancel", {
        params: { path: { run_id: runId } },
      });
      if (response.status === 409) throw new Error("Run already finished.");
      if (error || !data) throw new Error(`Cancel failed (${response.status})`);
      return data;
    },
    onSuccess: () => toast.success("Cancellation requested"),
    onError: (e: Error) => toast.error("Could not cancel", { description: e.message }),
  });

  if (runQuery.isLoading) {
    return (
      <PageShell breadcrumb={[{ label: "Runs", to: "/runs" }, { label: "…" }]}>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageShell>
    );
  }

  if (!runQuery.data) {
    return (
      <PageShell breadcrumb={[{ label: "Runs", to: "/runs" }, { label: "Not found" }]}>
        <EmptyState
          icon={ShieldOff}
          title="Run not found"
          description={`No run with id ${runId}.`}
          action={
            <Button variant="outline" asChild>
              <Link to="/runs">
                <ChevronLeft className="size-4" />
                Back to runs
              </Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const run = runQuery.data;
  const canCancel = run.status === "pending" || run.status === "running";
  const shortId = (run.id ?? "").split("-")[0] ?? "";

  return (
    <PageShell
      breadcrumb={[
        { label: "Runs", to: "/runs" },
        { label: <span className="font-mono">{shortId}</span> },
      ]}
    >
      <header className="border-border bg-card overflow-hidden rounded-2xl border">
        <div className="from-accent/10 to-card bg-gradient-to-br p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <RunStatusBadge status={run.status} />
                <span className="text-muted-foreground capitalize">{run.action}</span>
                {run.dry_run && <Badge variant="muted">dry-run</Badge>}
                {stream.connected && !isTerminal && (
                  <Badge variant="accent" className="gap-1.5">
                    <StatusDot tone="accent" pulse size="sm" />
                    live
                  </Badge>
                )}
              </div>
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: run.task_id }}
                  className="hover:text-accent transition-colors"
                >
                  {run.task_id}
                </Link>
              </h1>
              <p className="text-muted-foreground font-mono text-xs">{run.id}</p>
            </div>
            {canCancel && (
              <Button
                variant="destructive"
                onClick={() => cancelRun.mutate()}
                disabled={cancelRun.isPending}
              >
                <OctagonX className="size-4" />
                Cancel run
              </Button>
            )}
          </div>
        </div>

        <div className="border-border grid grid-cols-2 gap-4 border-t p-5 text-sm sm:grid-cols-4">
          <Field label="Started" value={formatTimestamp(run.started_at)} />
          <Field label="Finished" value={formatTimestamp(run.finished_at)} />
          <Field label="Duration" value={formatDuration(run.started_at, run.finished_at)} mono />
          <Field
            label="Exit code"
            value={
              run.exit_code === null || run.exit_code === undefined ? "—" : String(run.exit_code)
            }
            mono
          />
        </div>

        {run.summary && Object.keys(run.summary).length > 0 && (
          <div className="border-border flex flex-wrap gap-1.5 border-t p-5">
            {Object.entries(run.summary).map(([k, v]) => (
              <Badge key={k} variant="outline" className="font-mono">
                <span className="text-muted-foreground">{k}:</span>
                <span className="text-foreground ml-1">{String(v)}</span>
              </Badge>
            ))}
          </div>
        )}
      </header>

      <section className="border-border bg-card overflow-hidden rounded-2xl border">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Radio className="text-accent size-4" />
            <h2 className="text-foreground text-sm font-semibold tracking-tight">Event stream</h2>
            <span className="text-muted-foreground text-xs">
              {isTerminal ? "Final log" : stream.connected ? "Streaming live" : "Connecting…"}
            </span>
          </div>
          <motion.span
            key={stream.events.length}
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-muted-foreground font-mono text-xs tabular-nums"
          >
            {stream.events.length} event{stream.events.length === 1 ? "" : "s"}
          </motion.span>
        </header>
        <div className="border-border border-t">
          <RunEventList
            events={stream.events}
            emptyMessage={
              isTerminal ? "No events were recorded for this run." : "Waiting for events…"
            }
          />
        </div>
      </section>
    </PageShell>
  );
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Field({ label, value, mono }: FieldProps) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
        {label}
      </div>
      <div className={`text-foreground ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
