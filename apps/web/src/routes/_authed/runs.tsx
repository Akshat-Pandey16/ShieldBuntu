import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Radio } from "lucide-react";
import { z } from "zod";

import { Breadcrumb } from "@/components/Breadcrumb";
import { EmptyState } from "@/components/EmptyState";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RunStatus } from "@/lib/api";
import { formatDuration, formatRelative, formatTimestamp } from "@/lib/format";
import { useRunsQuery } from "@/lib/useRunsQuery";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  taskId: z.string().optional(),
  status: z
    .enum(["pending", "running", "succeeded", "no_change", "failed", "cancelled"])
    .optional(),
});

export const Route = createFileRoute("/_authed/runs")({
  validateSearch: searchSchema,
  component: RunsPage,
});

interface StatusChip {
  id: RunStatus | "all";
  label: string;
}

const statusChips: StatusChip[] = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "succeeded", label: "Applied" },
  { id: "no_change", label: "No change" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
];

function RunsPage() {
  const { taskId, status } = Route.useSearch();
  const navigate = Route.useNavigate();

  const runsQuery = useRunsQuery({ taskId, status, limit: 100 });
  const runs = runsQuery.data ?? [];

  return (
    <>
      <Breadcrumb items={[{ label: "Runs" }]} />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            <span className="text-gradient-brand">Runs</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Every apply, check, and revert. Live runs auto-refresh.
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
              onClick={() => void navigate({ to: "/runs", search: { status } })}
            >
              Clear task filter
            </Button>
          </div>
        )}
      </header>

      <div role="tablist" aria-label="Status filter" className="flex flex-wrap gap-1.5">
        {statusChips.map((chip) => {
          const active = chip.id === "all" ? !status : status === chip.id;
          return (
            <button
              key={chip.id}
              role="tab"
              aria-pressed={active}
              aria-selected={active}
              onClick={() => {
                if (chip.id === "all") {
                  void navigate({ to: "/runs", search: { taskId } });
                } else {
                  void navigate({ to: "/runs", search: { taskId, status: chip.id } });
                }
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                active
                  ? "bg-brand/15 text-brand border-brand/30"
                  : "text-muted-foreground border-border/60 hover:bg-secondary/70 hover:text-foreground border-transparent",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {runsQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : runs.length > 0 ? (
        <div className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-soft">
          <ul className="divide-border/70 divide-y">
            {runs.map((run) => (
              <li key={run.id}>
                <Link
                  to="/runs/$runId"
                  params={{ runId: run.id! }}
                  className="hover:bg-secondary/40 flex items-center justify-between gap-4 px-6 py-3.5 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <RunStatusBadge status={run.status} variant="icon" />
                    <div className="min-w-0">
                      <p className="text-foreground truncate text-sm font-medium">
                        {run.task_id}
                      </p>
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
                        {run.initiated_by && (
                          <span>
                            by <span className="text-foreground">{run.initiated_by}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-5 text-xs">
                    <span className="hidden md:inline" title={formatTimestamp(run.started_at)}>
                      {formatRelative(run.started_at)}
                    </span>
                    <span className="tabular-nums">
                      {formatDuration(run.started_at, run.finished_at)}
                    </span>
                    <RunStatusBadge status={run.status} className="hidden sm:inline-flex" />
                    <ChevronRight className="text-muted-foreground/50 size-4" />
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
              : "Start a hardening task to see runs here."
          }
          action={
            <Button asChild>
              <Link to="/tasks">Browse tasks</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
