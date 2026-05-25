import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context, location }) => {
    const user = context.queryClient.getQueryData(["auth", "me"]);
    if (!user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  loader: ({ context }) => {
    const user = context.queryClient.getQueryData<{ username: string }>(["auth", "me"]);
    return { user: user! };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useLoaderData();

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
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl space-y-6 p-6">
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
            <CardTitle>What's next</CardTitle>
            <CardDescription>
              Task list, profile picker, and live run viewer land in the next pass (Phase 3b).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              For now, the API is fully usable from{" "}
              <code className="bg-muted rounded px-1">curl</code> or the OpenAPI docs at{" "}
              <code className="bg-muted rounded px-1">/api/docs</code> (dev mode).
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
