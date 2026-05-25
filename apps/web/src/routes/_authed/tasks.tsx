import { useDeferredValue, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Search, X } from "lucide-react";

import { Breadcrumb } from "@/components/Breadcrumb";
import { EmptyState } from "@/components/EmptyState";
import { TaskCard } from "@/components/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/tasks")({
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
  const deferredQuery = useDeferredValue(query);
  const [profile, setProfile] = useState<ProfileFilter>("all");

  const filtered = useMemo(() => {
    const all = tasksQuery.data ?? [];
    const q = deferredQuery.trim().toLowerCase();
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
  }, [tasksQuery.data, deferredQuery, profile]);

  return (
    <>
      <Breadcrumb items={[{ label: "Tasks" }]} />

      <header className="space-y-2">
        <h1 className="text-foreground text-3xl font-semibold tracking-tight">
          Hardening <span className="text-gradient-brand">tasks</span>
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          {(tasksQuery.data?.length ?? 0) || ""} idempotent Ansible roles. Filter by CIS profile,
          search by name, category, or tag.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded p-1"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div role="tablist" aria-label="Profile filter" className="flex flex-wrap gap-1.5">
          {profileFilters.map((p) => {
            const active = profile === p.id;
            return (
              <button
                key={p.id}
                role="tab"
                aria-pressed={active}
                aria-selected={active}
                onClick={() => setProfile(p.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  active
                    ? "bg-brand/15 text-brand border-brand/30"
                    : "text-muted-foreground border-border/60 hover:bg-secondary/70 hover:text-foreground border-transparent",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
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
          action={
            (query || profile !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setProfile("all");
                }}
              >
                Reset filters
              </Button>
            )
          }
        />
      )}
    </>
  );
}
