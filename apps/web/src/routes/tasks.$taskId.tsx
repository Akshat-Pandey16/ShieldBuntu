import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Pencil, Play, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/PageShell";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { formatDuration, formatTimestamp, titleCase } from "@/lib/format";

export const Route = createFileRoute("/tasks/$taskId")({
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient, location.href),
  component: TaskDetailPage,
});

type RunAction = "apply" | "check" | "revert";

const actionConfig: Record<
  RunAction,
  { Icon: typeof Play; label: string; variant: "default" | "outline" | "destructive" }
> = {
  apply: { Icon: Play, label: "Apply", variant: "default" },
  check: { Icon: Search, label: "Check", variant: "outline" },
  revert: { Icon: RotateCcw, label: "Revert", variant: "destructive" },
};

function TaskDetailPage() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dryRun, setDryRun] = useState(false);

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
    queryFn: async () => {
      const { data } = await api.GET("/api/runs", {
        params: { query: { task_id: taskId, limit: 5 } },
      });
      return data ?? [];
    },
  });

  const startRun = useMutation({
    mutationFn: async (action: RunAction) => {
      const { data, error, response } = await api.POST("/api/runs", {
        body: { task_id: taskId, action, dry_run: dryRun, host_id: "local" },
      });
      if (error || !data) {
        throw new Error(`Failed to start run (${response.status})`);
      }
      return data;
    },
    onSuccess: async (run) => {
      toast.success(`${titleCase(run.action)} started${run.dry_run ? " (dry-run)" : ""}`);
      await queryClient.invalidateQueries({ queryKey: ["runs"] });
      void navigate({ to: "/runs/$runId", params: { runId: run.id! } });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  if (taskQuery.isLoading) {
    return (
      <PageShell>
        <p className="text-muted-foreground p-12 text-center text-sm">Loading task…</p>
      </PageShell>
    );
  }

  if (!taskQuery.data) {
    return (
      <PageShell>
        <Card>
          <CardHeader>
            <CardTitle>Task not found</CardTitle>
            <CardDescription>No role named "{taskId}" was discovered.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link to="/tasks">
                <ChevronLeft className="size-4" />
                Back to tasks
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const task = taskQuery.data;
  const capabilities = task.capabilities ?? [];
  const profiles = task.profiles ?? [];
  const cisRefs = task.cis_refs ?? [];
  const tags = task.tags ?? [];
  const supports = (a: RunAction) => capabilities.includes(a);

  return (
    <PageShell>
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2">
          <Link to="/tasks">
            <ChevronLeft className="size-4" />
            Tasks
          </Link>
        </Button>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{task.name}</h1>
            <p className="text-muted-foreground text-sm">{task.description}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profiles.map((p) => (
              <Badge key={p} variant="outline">
                {p}
              </Badge>
            ))}
          </div>
        </header>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
          <CardDescription>
            Apply makes changes. Check reports current state without modifying anything. Revert
            rolls back what apply did.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="border-input bg-background size-4 rounded border accent-accent"
            />
            <span>
              Dry-run mode
              <span className="text-muted-foreground ml-1">(use Ansible --check, no changes)</span>
            </span>
          </label>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {(["apply", "check", "revert"] as RunAction[]).map((action) => {
              const cfg = actionConfig[action];
              const Icon = cfg.Icon;
              const disabled = !supports(action) || startRun.isPending;
              return (
                <Button
                  key={action}
                  variant={cfg.variant}
                  onClick={() => startRun.mutate(action)}
                  disabled={disabled}
                  title={!supports(action) ? `This task does not support ${action}` : undefined}
                >
                  <Icon className="size-4" />
                  {cfg.label}
                  {dryRun && action !== "check" && (
                    <Badge variant="muted" className="ml-1">
                      dry-run
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">ID</dt>
              <dd className="font-mono">{task.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">Category</dt>
              <dd>{task.category}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">CIS refs</dt>
              <dd className="font-mono text-xs">{cisRefs.length > 0 ? cisRefs.join(", ") : "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                Capabilities
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {capabilities.map((c) => (
                  <Badge key={c} variant="muted">
                    <Pencil className="size-3" />
                    {titleCase(c)}
                  </Badge>
                ))}
              </dd>
            </div>
            {tags.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs uppercase tracking-wide">Tags</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent runs</CardTitle>
            <CardDescription>Last 5 runs for this task.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/runs" search={{ taskId }}>
              View all
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {runsQuery.isLoading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Loading…</p>
          ) : runsQuery.data && runsQuery.data.length > 0 ? (
            <ul className="divide-border divide-y">
              {runsQuery.data.map((run) => (
                <li key={run.id}>
                  <Link
                    to="/runs/$runId"
                    params={{ runId: run.id! }}
                    className="hover:bg-secondary flex items-center justify-between px-3 py-2 text-sm transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <RunStatusBadge status={run.status} />
                      <span className="text-muted-foreground capitalize">{run.action}</span>
                      {run.dry_run && <Badge variant="muted">dry-run</Badge>}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-3 text-xs">
                      <span>{formatTimestamp(run.started_at)}</span>
                      <span className="tabular-nums">
                        {formatDuration(run.started_at, run.finished_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No runs yet for this task.
            </p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
