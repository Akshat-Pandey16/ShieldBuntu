import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ChevronLeft, Hash, OctagonX, Radio, ShieldOff, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/Breadcrumb";
import { EmptyState } from "@/components/EmptyState";
import { RunEventList } from "@/components/RunEventList";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { RunSummary } from "@/components/RunSummary";
import { StatusDot } from "@/components/StatusDot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, isActive, isTerminal } from "@/lib/api";
import { formatDuration, formatTimestamp, shortId } from "@/lib/format";
import { useRunStream } from "@/lib/useRunStream";

export const Route = createFileRoute("/_authed/runs_/$runId")({
  component: RunDetailPage,
});

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
      if (isTerminal(status)) return false;
      return 2000;
    },
  });

  const terminal = runQuery.data ? isTerminal(runQuery.data.status) : false;
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
      if (error || !data) throw new Error(`Cancel failed (${response.status})`);
      return data;
    },
    onSuccess: (data) => {
      if (data.cancel_requested) {
        toast.success("Cancellation requested");
      } else {
        toast.info("Run already finished");
      }
    },
    onError: (e: Error) => toast.error("Could not cancel", { description: e.message }),
  });

  if (runQuery.isLoading) {
    return (
      <>
        <Breadcrumb items={[{ label: "Runs", to: "/runs" }, { label: "…" }]} />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </>
    );
  }

  if (!runQuery.data) {
    return (
      <>
        <Breadcrumb items={[{ label: "Runs", to: "/runs" }, { label: "Not found" }]} />
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
      </>
    );
  }

  const run = runQuery.data;
  const canCancel = isActive(run.status);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Runs", to: "/runs" },
          { label: <span className="font-mono">{shortId(run.id)}</span> },
        ]}
      />

      <section className="border-border/70 bg-card relative overflow-hidden rounded-3xl border shadow-soft">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,oklch(from_var(--color-brand)_l_c_h/0.16),transparent_55%)]"
          aria-hidden
        />
        <div className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <RunStatusBadge status={run.status} />
                <span className="text-muted-foreground capitalize">{run.action}</span>
                {run.dry_run && <Badge variant="muted">dry-run</Badge>}
                {stream.connected && !terminal && (
                  <Badge variant="accent" className="gap-1.5">
                    <StatusDot tone="brand" pulse size="sm" />
                    live
                  </Badge>
                )}
                {!stream.connected && !terminal && stream.retryCount > 0 && (
                  <Badge variant="warning" className="gap-1.5">
                    <WifiOff className="size-3" /> reconnecting…
                  </Badge>
                )}
              </div>
              <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
                <Link
                  to="/tasks/$taskId"
                  params={{ taskId: run.task_id }}
                  className="hover:text-brand transition-colors"
                >
                  {run.task_id}
                </Link>
              </h1>
              <p className="text-muted-foreground flex flex-wrap items-center gap-2 font-mono text-xs">
                <Hash className="size-3" />
                {run.id}
              </p>
            </div>
            {canCancel && (
              <Button
                variant="destructive"
                onClick={() => cancelRun.mutate()}
                disabled={cancelRun.isPending}
              >
                <OctagonX className="size-4" />
                {cancelRun.isPending ? "Cancelling…" : "Cancel run"}
              </Button>
            )}
          </div>
        </div>

        <div className="border-border/70 grid grid-cols-2 gap-4 border-t p-6 text-sm sm:grid-cols-4 lg:px-8">
          <Field label="Started" value={formatTimestamp(run.started_at)} />
          <Field label="Finished" value={formatTimestamp(run.finished_at)} />
          <Field label="Duration" value={formatDuration(run.started_at, run.finished_at)} mono />
          <Field
            label="Exit code"
            value={run.exit_code === null || run.exit_code === undefined ? "—" : String(run.exit_code)}
            mono
          />
        </div>

        {run.initiated_by && (
          <div className="border-border/70 border-t px-6 py-3 lg:px-8">
            <p className="text-muted-foreground text-xs">
              Initiated by <span className="text-foreground font-medium">{run.initiated_by}</span>
            </p>
          </div>
        )}

        {terminal && (
          <div className="border-border/70 border-t p-5 lg:px-8">
            <div className="text-muted-foreground mb-3 text-[10px] font-medium uppercase tracking-[0.18em]">
              Run summary
            </div>
            <RunSummary summary={run.summary} />
          </div>
        )}
      </section>

      <section className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-soft">
        <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Radio className="text-brand size-4" />
            <h2 className="text-foreground text-sm font-semibold tracking-tight">Event stream</h2>
            <span className="text-muted-foreground text-xs">
              {terminal
                ? "Final log"
                : stream.connected
                  ? "Streaming live"
                  : stream.retryCount > 0
                    ? `Retrying (attempt ${stream.retryCount})`
                    : "Connecting…"}
            </span>
          </div>
          <motion.span
            key={stream.events.length}
            initial={{ scale: 0.92, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18 }}
            className="text-muted-foreground font-mono text-xs tabular-nums"
          >
            {stream.events.length} event{stream.events.length === 1 ? "" : "s"}
          </motion.span>
        </header>
        <div className="border-border/70 border-t">
          <RunEventList
            events={stream.events}
            emptyMessage={terminal ? "No events were recorded for this run." : "Waiting for events…"}
          />
        </div>
      </section>
    </>
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
      <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.18em]">
        {label}
      </div>
      <div
        className={
          mono
            ? "text-foreground font-mono text-[13px]"
            : "text-foreground text-[13px]"
        }
      >
        {value}
      </div>
    </div>
  );
}
