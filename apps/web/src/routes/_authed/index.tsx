import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  ListChecks,
  Radio,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { RunStatusBadge } from "@/components/RunStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type HardeningRun } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { formatDuration, formatRelative, formatTimestamp } from "@/lib/format";
import { useRunsQuery } from "@/lib/useRunsQuery";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/")({
  component: DashboardPage,
});

function DashboardPage() {
  const user = useUser();

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await api.GET("/api/tasks", {})).data ?? [],
  });
  const runsQuery = useRunsQuery({ limit: 6, refetchActiveMs: 3000 });
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.GET("/api/health", {})).data ?? null,
    staleTime: 30_000,
  });

  const runs = runsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  const runningCount = runs.filter((r) => r.status === "running").length;
  const succeededCount = runs.filter(
    (r) => r.status === "succeeded" || r.status === "no_change",
  ).length;
  const failedCount = runs.filter((r) => r.status === "failed").length;

  return (
    <>
      <section className="border-border/60 relative overflow-hidden rounded-3xl border">
        <div className="from-brand/18 via-brand/4 to-card absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br" />
        <div className="from-brand/30 absolute -right-20 -top-20 -z-10 h-72 w-72 rounded-full bg-gradient-to-br to-transparent blur-3xl" />
        <div className="bg-dotgrid absolute inset-0 -z-10 opacity-30" aria-hidden />

        <div className="relative space-y-5 p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-brand bg-brand/10 ring-brand/25 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1"
          >
            <Sparkles className="size-3" /> ShieldBuntu v0.2
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl font-semibold tracking-tight md:text-4xl"
          >
            Welcome back, <span className="text-gradient-brand">{user?.username ?? ""}</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground max-w-2xl text-base leading-relaxed"
          >
            ShieldBuntu hardens your Ubuntu host one task at a time. Pick a task to apply, check, or
            revert — every run is logged in real time.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap items-center gap-2 pt-2"
          >
            <Button asChild size="lg">
              <Link to="/tasks">
                Browse hardening tasks
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link to="/runs">View run history</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          Icon={ShieldCheck}
          label="Hardening tasks"
          value={tasksQuery.isLoading ? null : String(tasks.length)}
          hint="discovered roles"
          tone="brand"
          delay={0.05}
        />
        <StatCard
          Icon={Radio}
          label="Active runs"
          value={runningCount > 0 ? String(runningCount) : "—"}
          hint={runningCount > 0 ? "running right now" : "all quiet"}
          tone={runningCount > 0 ? "info" : "muted"}
          pulse={runningCount > 0}
          delay={0.1}
        />
        <StatCard
          Icon={Activity}
          label="Recent results"
          value={
            runsQuery.isLoading
              ? null
              : runs.length === 0
                ? "—"
                : `${succeededCount}/${runs.length}`
          }
          hint={failedCount > 0 ? `${failedCount} failed` : "succeeded/total"}
          tone={failedCount > 0 ? "destructive" : "success"}
          delay={0.15}
        />
      </section>

      <section className="border-border/70 bg-card overflow-hidden rounded-2xl border shadow-soft">
        <header className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <h2 className="text-foreground text-sm font-semibold tracking-tight">Recent runs</h2>
            <p className="text-muted-foreground text-xs">Last {runs.length || 6} runs.</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/runs">
              All runs
              <ChevronRight className="size-3.5" />
            </Link>
          </Button>
        </header>
        <div className="border-border/70 border-t">
          {runsQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : runs.length > 0 ? (
            <ul className="divide-border/70 divide-y">
              {runs.map((run) => (
                <RunRow key={run.id} run={run} />
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground p-12 text-center text-sm">
              <ListChecks className="text-muted-foreground/60 mx-auto mb-3 size-8" />
              <p className="text-foreground">No runs yet.</p>
              <p className="mt-0.5">Start one from the Tasks page.</p>
            </div>
          )}
        </div>
      </section>

      {healthQuery.data && (
        <section className="text-muted-foreground border-border/70 bg-card/60 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="bg-success size-2 rounded-full" />
            <span className="text-foreground font-medium">Backend healthy</span>
            <span>· v{healthQuery.data.version}</span>
            <span>· daemon as</span>
            <code className="text-foreground bg-secondary rounded px-1.5 py-0.5 font-mono">
              {healthQuery.data.daemon_user}
            </code>
          </div>
          <span className="text-muted-foreground/70">
            {healthQuery.data.running_as_root ? "root privileges" : "limited privileges"}
          </span>
        </section>
      )}
    </>
  );
}

function RunRow({ run }: { run: HardeningRun }) {
  return (
    <li>
      <Link
        to="/runs/$runId"
        params={{ runId: run.id! }}
        className="hover:bg-secondary/40 flex items-center justify-between gap-4 px-6 py-3.5 transition-colors"
      >
        <div className="flex min-w-0 items-center gap-3">
          <RunStatusBadge status={run.status} variant="icon" />
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">{run.task_id}</p>
            <p className="text-muted-foreground text-xs capitalize">
              {run.action}
              {run.dry_run && " · dry-run"}
            </p>
          </div>
        </div>
        <div className="text-muted-foreground hidden items-center gap-4 text-xs sm:flex">
          <span title={formatTimestamp(run.started_at)}>{formatRelative(run.started_at)}</span>
          <span className="tabular-nums">
            {formatDuration(run.started_at, run.finished_at)}
          </span>
          <RunStatusBadge status={run.status} className="hidden md:inline-flex" />
        </div>
      </Link>
    </li>
  );
}

interface StatCardProps {
  Icon: LucideIcon;
  label: string;
  value: string | null;
  hint: string;
  tone: "brand" | "info" | "success" | "destructive" | "muted";
  pulse?: boolean;
  delay?: number;
}

const toneRing: Record<StatCardProps["tone"], string> = {
  brand: "ring-brand/30 from-brand/10 to-transparent text-brand",
  info: "ring-info/30 from-info/10 to-transparent text-info",
  success: "ring-success/30 from-success/10 to-transparent text-success",
  destructive: "ring-destructive/30 from-destructive/10 to-transparent text-destructive",
  muted: "ring-border from-muted/40 to-transparent text-muted-foreground",
};

function StatCard({ Icon, label, value, hint, tone, pulse, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22 }}
      className={cn(
        "border-border/70 bg-card relative overflow-hidden rounded-2xl border p-5 ring-1 shadow-soft",
        toneRing[tone],
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 -top-12 h-32 bg-gradient-to-br opacity-70"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.18em]">
            {label}
          </div>
          <div className="text-foreground text-3xl font-semibold tabular-nums tracking-tight">
            {value === null ? <Skeleton className="h-9 w-16" /> : value}
          </div>
          <div className="text-muted-foreground text-xs">{hint}</div>
        </div>
        <div
          className={cn(
            "bg-card/60 flex size-10 items-center justify-center rounded-xl ring-1 ring-inset ring-white/5",
            pulse && "animate-pulse",
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </motion.div>
  );
}
