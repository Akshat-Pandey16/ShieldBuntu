import { Link } from "@tanstack/react-router";
import { AlertOctagon, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface RootErrorBoundaryProps {
  error: Error;
  reset: () => void;
}

export function RootErrorBoundary({ error, reset }: RootErrorBoundaryProps) {
  return (
    <div className="bg-mesh relative flex min-h-screen items-center justify-center p-6">
      <div className="glass-strong relative max-w-md space-y-5 rounded-2xl p-8 text-center shadow-soft">
        <div className="bg-destructive/15 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
          <AlertOctagon className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-foreground text-lg font-semibold tracking-tight">
            Something went sideways
          </h1>
          <p className="text-muted-foreground text-sm">
            The UI hit an unexpected error. Try again, or jump back to the dashboard.
          </p>
          <p className="text-muted-foreground/80 mt-3 break-words rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-left font-mono text-xs">
            {error.message || String(error)}
          </p>
        </div>
        <div className="flex justify-center gap-2 pt-1">
          <Button onClick={reset} variant="outline">
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
