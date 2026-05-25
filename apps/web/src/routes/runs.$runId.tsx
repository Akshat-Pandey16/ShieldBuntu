import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, OctagonX } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { RunEventList } from "@/components/RunEventList";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { formatDuration, formatTimestamp } from "@/lib/format";
import { useRunStream } from "@/lib/useRunStream";

export const Route = createFileRoute("/runs/$runId")({
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
      if (error || !data) {
        throw new Error(`Cancel failed (${response.status})`);
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Cancellation requested");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  if (runQuery.isLoading) {
    return (
      <PageShell>
        <p className="text-muted-foreground p-12 text-center text-sm">Loading run…</p>
      </PageShell>
    );
  }

  if (!runQuery.data) {
    return (
      <PageShell>
        <Card>
          <CardHeader>
            <CardTitle>Run not found</CardTitle>
            <CardDescription>No run with id {runId}.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/runs">
                <ChevronLeft className="size-4" />
                Back to runs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const run = runQuery.data;
  const canCancel = run.status === "pending" || run.status === "running";

  return (
    <PageShell>
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2">
          <Link to="/runs">
            <ChevronLeft className="size-4" />
            Runs
          </Link>
        </Button>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RunStatusBadge status={run.status} />
              <span className="capitalize">{run.action}</span>
              {run.dry_run && <Badge variant="muted">dry-run</Badge>}
              {stream.connected && (
                <Badge variant="accent" className="animate-pulse">
                  live
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              <Link
                to="/tasks/$taskId"
                params={{ taskId: run.task_id }}
                className="hover:text-accent transition-colors"
              >
                {run.task_id}
              </Link>
            </h1>
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
        </header>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 text-sm sm:grid-cols-4">
          <Field label="Started" value={formatTimestamp(run.started_at)} />
          <Field label="Finished" value={formatTimestamp(run.finished_at)} />
          <Field label="Duration" value={formatDuration(run.started_at, run.finished_at)} />
          <Field
            label="Exit code"
            value={
              run.exit_code === null || run.exit_code === undefined ? "—" : String(run.exit_code)
            }
          />
        </CardContent>
        {run.summary && Object.keys(run.summary).length > 0 && (
          <>
            <Separator />
            <CardContent className="flex flex-wrap gap-2 p-4 text-xs">
              {Object.entries(run.summary).map(([k, v]) => (
                <Badge key={k} variant="outline">
                  {k}: <span className="ml-1 font-mono">{String(v)}</span>
                </Badge>
              ))}
            </CardContent>
          </>
        )}
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Event stream</CardTitle>
            <CardDescription>
              {isTerminal
                ? "Final event log."
                : stream.connected
                  ? "Live — updates as Ansible emits events."
                  : "Connecting…"}
            </CardDescription>
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {stream.events.length} event{stream.events.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <RunEventList
            events={stream.events}
            emptyMessage={
              isTerminal ? "No events were recorded for this run." : "Waiting for events…"
            }
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
