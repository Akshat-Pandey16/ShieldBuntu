import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, Hash, ShieldAlert, ShieldOff } from "lucide-react";

import { ActionPanel } from "@/components/ActionPanel";
import { Breadcrumb } from "@/components/Breadcrumb";
import { EmptyState } from "@/components/EmptyState";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDuration, formatRelative, titleCase } from "@/lib/format";
import { useRunsQuery } from "@/lib/useRunsQuery";

export const Route = createFileRoute("/_authed/tasks_/$taskId")({
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

  const runsQuery = useRunsQuery({ taskId, limit: 5 });

  if (taskQuery.isLoading) {
    return (
      <>
        <Breadcrumb items={[{ label: "Tasks", to: "/tasks" }, { label: "…" }]} />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </>
    );
  }

  if (!taskQuery.data) {
    return (
      <>
        <Breadcrumb items={[{ label: "Tasks", to: "/tasks" }, { label: "Not found" }]} />
        <EmptyState
          icon={ShieldOff}
          title="Task not found"
          description={`No role named "${taskId}" was discovered.`}
          action={
            <Button variant="outline" asChild>
              <Link to="/tasks">
                <ChevronLeft className="size-4" /> Back to tasks
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  const task = taskQuery.data;
  const capabilities = task.capabilities ?? [];
  const profiles = task.profiles ?? [];
  const cisRefs = task.cis_refs ?? [];
  const tags = task.tags ?? [];
  const inputs = task.inputs ?? [];

  return (
    <>
      <Breadcrumb items={[{ label: "Tasks", to: "/tasks" }, { label: task.name }]} />

      <section className="border-border/70 bg-card relative overflow-hidden rounded-3xl border p-8 shadow-soft">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,oklch(from_var(--color-brand)_l_c_h/0.16),transparent_60%)]"
          aria-hidden
        />
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.18em]">
          {task.category}
        </p>
        <h1 className="text-foreground mt-1.5 text-3xl font-semibold tracking-tight md:text-4xl">
          {task.name}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-3xl leading-relaxed">{task.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {profiles.map((p) => (
            <Badge key={p} variant="accent" className="rounded-full">
              {profileLabels[p] ?? p}
            </Badge>
          ))}
          {capabilities.map((c) => (
            <Badge key={c} variant="muted" className="rounded-full">
              {titleCase(c)}
            </Badge>
          ))}
          {tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="outline" className="rounded-full font-mono">
              #{t}
            </Badge>
          ))}
        </div>
      </section>

      {inputs.length > 0 && (
        <section className="border-info/30 bg-info/8 flex items-start gap-3 rounded-2xl border p-4 text-sm">
          <ShieldAlert className="text-info mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p className="text-foreground font-medium">This task takes inputs</p>
            <p className="text-muted-foreground text-xs">
              Before running, you'll be prompted for:{" "}
              {inputs.map((i, idx) => (
                <span key={i.name}>
                  <code className="text-foreground bg-secondary rounded px-1.5 font-mono text-[11px]">
                    {i.label}
                  </code>
                  {idx < inputs.length - 1 && ", "}
                </span>
              ))}
            </p>
          </div>
        </section>
      )}

      <ActionPanel
        taskId={taskId}
        supportedActions={capabilities}
        inputs={inputs}
      />

      <section className="border-border/70 bg-card rounded-2xl border p-6">
        <h2 className="text-foreground text-sm font-semibold tracking-tight">Metadata</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <MetaItem label="Role ID" mono>
            {task.id}
          </MetaItem>
          <MetaItem label="Category">{task.category}</MetaItem>
          <MetaItem label="Requires root">{task.requires_root ? "Yes" : "No"}</MetaItem>
          <MetaItem label="Actions">
            {capabilities.map((c) => titleCase(c)).join(", ")}
          </MetaItem>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-[10px] uppercase tracking-[0.18em]">
              CIS references
            </dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {cisRefs.length > 0 ? (
                cisRefs.map((ref) => (
                  <Badge key={ref} variant="outline" className="font-mono">
                    <Hash className="size-2.5" />
                    {ref}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-border/70 bg-card overflow-hidden rounded-2xl border">
        <header className="flex items-center justify-between gap-4 px-6 py-4">
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
        <div className="border-border/70 border-t">
          {runsQuery.isLoading ? (
            <div className="space-y-1.5 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : runsQuery.data && runsQuery.data.length > 0 ? (
            <ul className="divide-border/70 divide-y">
              {runsQuery.data.map((run) => (
                <li key={run.id}>
                  <Link
                    to="/runs/$runId"
                    params={{ runId: run.id! }}
                    className="hover:bg-secondary/40 flex items-center justify-between gap-4 px-6 py-3 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3 text-sm">
                      <RunStatusBadge status={run.status} variant="compact" />
                      <span className="text-muted-foreground capitalize">{run.action}</span>
                      {run.dry_run && <Badge variant="muted">dry-run</Badge>}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                      <span className="hidden sm:inline">
                        {formatRelative(run.started_at)}
                      </span>
                      <span className="tabular-nums">
                        {formatDuration(run.started_at, run.finished_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground p-10 text-center text-sm">
              No runs yet for this task.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function MetaItem({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10px] uppercase tracking-[0.18em]">{label}</dt>
      <dd
        className={
          mono
            ? "text-foreground mt-1 font-mono text-[13px]"
            : "text-foreground mt-1 text-[13px]"
        }
      >
        {children}
      </dd>
    </div>
  );
}
