import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Radio } from "lucide-react";
import { z } from "zod";

import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { formatDuration, formatTimestamp } from "@/lib/format";

const searchSchema = z.object({
  taskId: z.string().optional(),
});

export const Route = createFileRoute("/runs")({
  validateSearch: searchSchema,
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient, location.href),
  component: RunsPage,
});

function RunsPage() {
  const { taskId } = Route.useSearch();
  const navigate = Route.useNavigate();

  const runsQuery = useQuery({
    queryKey: ["runs", { task_id: taskId, limit: 100 }],
    queryFn: async () =>
      (
        await api.GET("/api/runs", {
          params: { query: { task_id: taskId, limit: 100 } },
        })
      ).data ?? [],
    refetchInterval: 4000,
  });

  return (
    <PageShell breadcrumb={[{ label: "Runs" }]}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">Runs</h1>
          <p className="text-muted-foreground text-sm">
            Every apply, check, and revert. Auto-refreshes every 4s.
          </p>
        </div>
        {taskId && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="accent" className="font-mono">
              {taskId}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ to: "/runs", search: {} })}
            >
              Clear filter
            </Button>
          </div>
        )}
      </header>

      {runsQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : runsQuery.data && runsQuery.data.length > 0 ? (
        <div className="border-border bg-card overflow-hidden rounded-xl border">
          <ul className="divide-border divide-y">
            {runsQuery.data.map((run) => (
              <li key={run.id}>
                <Link
                  to="/runs/$runId"
                  params={{ runId: run.id! }}
                  className="hover:bg-secondary/60 flex items-center justify-between gap-4 px-5 py-3.5 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <RunStatusBadge status={run.status} variant="icon" />
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-medium">{run.task_id}</p>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                        <span className="capitalize">{run.action}</span>
                        {run.dry_run && (
                          <Badge variant="muted" className="font-mono">
                            dry-run
                          </Badge>
                        )}
                        {typeof run.exit_code === "number" && (
                          <span className="font-mono">exit {run.exit_code}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-5 text-xs">
                    <span className="hidden md:inline">{formatTimestamp(run.started_at)}</span>
                    <span className="tabular-nums">
                      {formatDuration(run.started_at, run.finished_at)}
                    </span>
                    <RunStatusBadge status={run.status} className="hidden sm:inline-flex" />
                    <ChevronRight className="size-4" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={Radio}
          title="No runs yet"
          description={
            taskId
              ? "No runs for this task. Start one from the task page."
              : "No runs anywhere. Start one from the Tasks page."
          }
          action={
            <Button asChild>
              <Link to="/tasks">Browse tasks</Link>
            </Button>
          }
        />
      )}
    </PageShell>
  );
}
