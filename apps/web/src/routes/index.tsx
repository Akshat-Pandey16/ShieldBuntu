import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  ListChecks,
  Radio,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { formatDuration, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient, location.href),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await api.GET("/api/tasks", {})).data ?? [],
  });
  const runsQuery = useQuery({
    queryKey: ["runs", { limit: 5 }],
    queryFn: async () =>
      (await api.GET("/api/runs", { params: { query: { limit: 5 } } })).data ?? [],
    refetchInterval: 5000,
  });
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.GET("/api/health", {})).data ?? null,
  });

  const runningCount = (runsQuery.data ?? []).filter((r) => r.status === "running").length;

  return (
    <PageShell>
      <section className="relative overflow-hidden rounded-2xl">
        <div className="from-accent/15 via-card/40 to-card border-border absolute inset-0 -z-10 rounded-2xl border bg-gradient-to-br" />
        <div className="bg-dotgrid absolute inset-0 -z-10 opacity-30" aria-hidden />
        <div className="space-y-3 p-8 lg:p-10">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted-foreground text-xs font-medium uppercase tracking-widest"
          >
            Welcome back
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl font-semibold tracking-tight lg:text-4xl"
          >
            Hello, <span className="text-gradient">{user.username}</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-2xl leading-relaxed"
          >
            ShieldBuntu hardens your Ubuntu system one task at a time. Pick a task to apply, check,
            or revert. Every run is logged in real time.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap items-center gap-2 pt-2"
          >
            <Button asChild>
              <Link to="/tasks">
                Browse tasks
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/runs">View run history</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          Icon={ShieldCheck}
          label="Hardening tasks"
          value={tasksQuery.isLoading ? "" : String(tasksQuery.data?.length ?? 0)}
          hint="discovered roles"
          accent="text-accent"
          delay={0.1}
        />
        <StatCard
          Icon={Radio}
          label="Active runs"
          value={runningCount > 0 ? String(runningCount) : "—"}
          hint={runningCount > 0 ? "running now" : "idle"}
          accent="text-info"
          pulse={runningCount > 0}
          delay={0.15}
        />
        <StatCard
          Icon={Activity}
          label="Backend"
          value={healthQuery.data?.status ?? (healthQuery.isLoading ? "" : "down")}
          hint={healthQuery.data ? `v${healthQuery.data.version}` : "no response"}
          accent={healthQuery.data ? "text-success" : "text-destructive"}
          delay={0.2}
        />
      </section>

      <section className="border-border bg-card overflow-hidden rounded-xl border">
        <header className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <h2 className="text-foreground text-sm font-semibold tracking-tight">Recent runs</h2>
            <p className="text-muted-foreground text-xs">Last 5 runs across all tasks.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/runs">
              All runs
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </header>
        <div className="border-border border-t">
          {runsQuery.isLoading ? (
            <div className="space-y-1 p-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : runsQuery.data && runsQuery.data.length > 0 ? (
            <ul className="divide-border divide-y">
              {runsQuery.data.map((run) => (
                <li key={run.id}>
                  <Link
                    to="/runs/$runId"
                    params={{ runId: run.id! }}
                    className="hover:bg-secondary/60 flex items-center justify-between gap-4 px-5 py-3 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <RunStatusBadge status={run.status} variant="icon" />
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm font-medium">
                          {run.task_id}
                        </p>
                        <p className="text-muted-foreground text-xs capitalize">
                          {run.action}
                          {run.dry_run && " · dry-run"}
                        </p>
                      </div>
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
            <div className="text-muted-foreground p-10 text-center text-sm">
              <ListChecks className="text-muted-foreground/60 mx-auto mb-2 size-8" />
              <p>No runs yet. Start one from the Tasks page.</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

interface StatCardProps {
  Icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  accent?: string;
  pulse?: boolean;
  delay?: number;
}

function StatCard({ Icon, label, value, hint, accent, pulse, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="border-border bg-card relative overflow-hidden rounded-xl border p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
            {label}
          </div>
          <div className="text-foreground text-3xl font-semibold tabular-nums tracking-tight">
            {value || <Skeleton className="h-9 w-16" />}
          </div>
          <div className="text-muted-foreground text-xs">{hint}</div>
        </div>
        <div
          className={cn(
            "bg-muted/60 flex size-9 items-center justify-center rounded-lg",
            accent,
            pulse && "animate-pulse",
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </motion.div>
  );
}
