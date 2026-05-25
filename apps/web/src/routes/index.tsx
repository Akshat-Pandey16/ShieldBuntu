import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  component: HomePage,
});

interface HealthResponse {
  status: string;
  version: string;
}

function HomePage() {
  const { data, isLoading, error } = useQuery<HealthResponse>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<HealthResponse>;
    },
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">ShieldBuntu</h1>
        <p className="text-muted-foreground mt-2">Ubuntu hardening, made operational.</p>
      </header>

      <section className="bg-card rounded-lg border p-6">
        <h2 className="text-lg font-medium">Backend status</h2>
        {isLoading && <p className="text-muted-foreground mt-2 text-sm">Checking…</p>}
        {error && (
          <p className="text-destructive mt-2 text-sm">
            Cannot reach backend. Is the FastAPI server running on :8000?
          </p>
        )}
        {data && (
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{data.status}</dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd>{data.version}</dd>
          </dl>
        )}
      </section>
    </main>
  );
}
