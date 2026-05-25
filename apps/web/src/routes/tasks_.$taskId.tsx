import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, ShieldOff } from "lucide-react";

import { ActionPanel } from "@/components/ActionPanel";
import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { formatDuration, formatTimestamp, titleCase } from "@/lib/format";

export const Route = createFileRoute("/tasks_/$taskId")({
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient, location.href),
  component: TaskDetailPage,
});

const profileLabels: Record<string, string> = {
  "cis-l1": "CIS L1",
  "cis-l2": "CIS L2",
  workstation: "Workstation",
  server: "Server",
};

function TaskDetailPage() {
  const { taskId } = Route.useParams();

  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const { data, response } = await api.GET("/api/tasks/{task_id}", {
        params: { path: { task_id: taskId } },
      });
      if (response.status === 404) return null;
      return data ?? null;
    },
  });

  const runsQuery = useQuery({
    queryKey: ["runs", { task_id: taskId, limit: 5 }],
    queryFn: async () =>
      (await api.GET("/api/runs", { params: { query: { task_id: taskId, limit: 5 } } })).data ?? [],
    refetchInterval: 4000,
  });

  if (taskQuery.isLoading) {
    return (
      <PageShell breadcrumb={[{ label: "Tasks", to: "/tasks" }, { label: "…" }]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </PageShell>
    );
  }

  if (!taskQuery.data) {
    return (
      <PageShell breadcrumb={[{ label: "Tasks", to: "/tasks" }, { label: "Not found" }]}>
        <EmptyState
          icon={ShieldOff}
          title="Task not found"
          description={`No role named "${taskId}" was discovered.`}
          action={
            <Button variant="outline" asChild>
              <Link to="/tasks">
                <ChevronLeft className="size-4" />
                Back to tasks
              </Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const task = taskQuery.data;
  const capabilities = task.capabilities ?? [];
  const profiles = task.profiles ?? [];
  const cisRefs = task.cis_refs ?? [];
  const tags = task.tags ?? [];

  return (
    <PageShell breadcrumb={[{ label: "Tasks", to: "/tasks" }, { label: task.name }]}>
      <header className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
          {task.category}
        </p>
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">{task.name}</h1>
        <p className="text-muted-foreground max-w-3xl leading-relaxed">{task.description}</p>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {profiles.map((p) => (
            <Badge key={p} variant="outline">
              {profileLabels[p] ?? p}
            </Badge>
          ))}
          {capabilities.map((c) => (
            <Badge key={c} variant="muted">
              {titleCase(c)}
            </Badge>
          ))}
          {tags.map((t) => (
            <Badge key={t} variant="outline" className="font-mono">
              {t}
            </Badge>
          ))}
        </div>
      </header>

      <ActionPanel taskId={taskId} supportedActions={capabilities} />

      <section className="border-border bg-card rounded-xl border p-6">
        <h2 className="text-foreground text-base font-semibold tracking-tight">Metadata</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Role ID</dt>
            <dd className="text-foreground mt-1 font-mono">{task.id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Category</dt>
            <dd className="text-foreground mt-1">{task.category}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">Requires root</dt>
            <dd className="text-foreground mt-1">{task.requires_root ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs uppercase tracking-wide">CIS refs</dt>
            <dd className="text-foreground mt-1 font-mono text-xs leading-relaxed">
              {cisRefs.length > 0 ? cisRefs.join(", ") : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-border bg-card overflow-hidden rounded-xl border">
        <header className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <h2 className="text-foreground text-sm font-semibold tracking-tight">Recent runs</h2>
            <p className="text-muted-foreground text-xs">For this task only.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/runs" search={{ taskId }}>
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </header>
        <div className="border-border border-t">
          {runsQuery.isLoading ? (
            <div className="space-y-1 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : runsQuery.data && runsQuery.data.length > 0 ? (
            <ul className="divide-border divide-y">
              {runsQuery.data.map((run) => (
                <li key={run.id}>
                  <Link
                    to="/runs/$runId"
                    params={{ runId: run.id! }}
                    className="hover:bg-secondary/60 flex items-center justify-between gap-4 px-5 py-2.5 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <RunStatusBadge status={run.status} variant="compact" />
                      <span className="text-muted-foreground capitalize">{run.action}</span>
                      {run.dry_run && <Badge variant="muted">dry-run</Badge>}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                      <span className="hidden sm:inline">{formatTimestamp(run.started_at)}</span>
                      <span className="tabular-nums">
                        {formatDuration(run.started_at, run.finished_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground p-8 text-center text-sm">
              No runs yet for this task.
            </p>
          )}
        </div>
      </section>
    </PageShell>
  );
}
