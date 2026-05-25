import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Search } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { TaskCard } from "@/components/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient, location.href),
  component: TasksPage,
});

const profileFilters = [
  { id: "all", label: "All" },
  { id: "cis-l1", label: "CIS L1" },
  { id: "cis-l2", label: "CIS L2" },
  { id: "workstation", label: "Workstation" },
  { id: "server", label: "Server" },
] as const;

type ProfileFilter = (typeof profileFilters)[number]["id"];

function TasksPage() {
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await api.GET("/api/tasks", {})).data ?? [],
  });

  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<ProfileFilter>("all");

  const filtered = useMemo(() => {
    const all = tasksQuery.data ?? [];
    const q = query.trim().toLowerCase();
    return all.filter((t) => {
      if (profile !== "all" && !(t.profiles ?? []).includes(profile)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [tasksQuery.data, query, profile]);

  return (
    <PageShell breadcrumb={[{ label: "Tasks" }]}>
      <header className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Hardening tasks</h1>
        <p className="text-muted-foreground text-sm">
          16 idempotent Ansible roles. Filter by CIS profile, search by name, or category.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profileFilters.map((p) => (
            <button
              key={p.id}
              onClick={() => setProfile(p.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                profile === p.id
                  ? "bg-accent/15 text-accent ring-accent/30 ring-1"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <>
          <p className="text-muted-foreground text-xs">
            Showing <Badge variant="muted">{filtered.length}</Badge> of{" "}
            <Badge variant="muted">{tasksQuery.data?.length ?? 0}</Badge> tasks
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((task, i) => (
              <TaskCard key={task.id} task={task} index={i} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={ListChecks}
          title="No tasks match"
          description={
            query || profile !== "all"
              ? "Try a different search or profile filter."
              : "No hardening tasks discovered. Check apps/server/ansible/roles/."
          }
        />
      )}
    </PageShell>
  );
}
