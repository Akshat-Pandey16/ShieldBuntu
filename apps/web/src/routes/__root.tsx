import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

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
});

function RootLayout() {
  return (
    <div className="text-foreground bg-background min-h-screen">
      <Outlet />
    </div>
  );
}
