import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { meQueryKey, type User } from "@/lib/auth";

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context, location }) => {
    const user = context.queryClient.getQueryData<User | null>(meQueryKey);
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
