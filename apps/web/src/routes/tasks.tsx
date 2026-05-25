import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageShell } from "@/components/PageShell";
import { TaskCard } from "@/components/TaskCard";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/tasks")({
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient, location.href),
  component: TasksPage,
});

function TasksPage() {
  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await api.GET("/api/tasks", {});
      return data ?? [];
    },
  });

  return (
    <PageShell>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Hardening tasks</h1>
        <p className="text-muted-foreground text-sm">
          Each task is an idempotent Ansible role. Apply, check status, or revert.
        </p>
      </header>

      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : tasksQuery.data && tasksQuery.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasksQuery.data.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground p-12 text-center text-sm">
          No hardening tasks discovered. Check apps/server/ansible/roles/.
        </p>
      )}
    </PageShell>
  );
}
