import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageShell } from "@/components/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth-guard";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context, location }) => {
    void redirect;
    return requireAuth(context.queryClient, location.href);
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await api.GET("/api/tasks", {});
      return data ?? [];
    },
  });

  const runsQuery = useQuery({
    queryKey: ["runs", { limit: 5 }],
    queryFn: async () => {
      const { data } = await api.GET("/api/runs", { params: { query: { limit: 5 } } });
      return data ?? [];
    },
  });

  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const { data } = await api.GET("/api/health", {});
      return data ?? null;
    },
  });

  return (
    <PageShell>
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.username}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ShieldBuntu hardens your Ubuntu system. Pick a task or review past runs.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Hardening tasks available</CardDescription>
            <CardTitle className="text-3xl">
              {tasksQuery.isLoading ? "…" : (tasksQuery.data?.length ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Recent runs</CardDescription>
            <CardTitle className="text-3xl">
              {runsQuery.isLoading ? "…" : (runsQuery.data?.length ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Backend</CardDescription>
            <CardTitle className="text-3xl">
              {healthQuery.data?.status ?? (healthQuery.isLoading ? "…" : "down")}
            </CardTitle>
            {healthQuery.data && (
              <p className="text-muted-foreground text-xs">v{healthQuery.data.version}</p>
            )}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
          <CardDescription>Browse tasks or review what's already been applied.</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Open <span className="text-foreground font-medium">Tasks</span> to apply, check, or
            revert hardening. Each run is logged in{" "}
            <span className="text-foreground font-medium">Runs</span> with a live event stream you
            can watch in real time.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
