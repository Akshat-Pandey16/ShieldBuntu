import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

import { CustomCursor } from "@/components/CustomCursor";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { loadUser } from "@/lib/auth";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context }) => {
    const user = await loadUser(context.queryClient);
    return { user };
  },
  component: RootLayout,
  errorComponent: RootErrorBoundary,
});

function RootLayout() {
  return (
    <div className="bg-background text-foreground relative min-h-screen">
      <Outlet />
      <CustomCursor />
    </div>
  );
}
