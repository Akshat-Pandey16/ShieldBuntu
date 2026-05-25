import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { z } from "zod";

import { PageShell } from "@/components/PageShell";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
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
    queryFn: async () => {
      const { data } = await api.GET("/api/runs", {
        params: { query: { task_id: taskId, limit: 100 } },
      });
      return data ?? [];
    },
    refetchInterval: 4000,
  });

  return (
    <PageShell>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
          <p className="text-muted-foreground text-sm">
            Every apply, check, and revert is logged here with a live event stream.
          </p>
        </div>
        {taskId && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">filter: {taskId}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ to: "/runs", search: {} })}
            >
              Clear
            </Button>
          </div>
        )}
      </header>

      <Card>
        <CardContent className="p-0">
          {runsQuery.isLoading ? (
            <p className="text-muted-foreground p-12 text-center text-sm">Loading runs…</p>
          ) : runsQuery.data && runsQuery.data.length > 0 ? (
            <ul className="divide-border divide-y">
              {runsQuery.data.map((run) => (
                <li key={run.id}>
                  <Link
                    to="/runs/$runId"
                    params={{ runId: run.id! }}
                    className="hover:bg-secondary flex items-center justify-between gap-4 px-5 py-3 text-sm transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <RunStatusBadge status={run.status} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{run.task_id}</p>
                        <p className="text-muted-foreground text-xs">
                          <span className="capitalize">{run.action}</span>
                          {run.dry_run && " · dry-run"}
                          {run.exit_code !== null && run.exit_code !== undefined && (
                            <> · exit {run.exit_code}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                      <span className="hidden sm:inline">{formatTimestamp(run.started_at)}</span>
                      <span className="tabular-nums">
                        {formatDuration(run.started_at, run.finished_at)}
                      </span>
                      <ChevronRight className="size-4" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-12 text-center">
              <CardTitle className="text-base">No runs yet</CardTitle>
              <CardDescription className="mt-1">
                Start one from a{" "}
                <Link to="/tasks" className="text-accent hover:underline">
                  task
                </Link>
                .
              </CardDescription>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
