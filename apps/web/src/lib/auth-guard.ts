import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import { meQueryKey, type User } from "./auth";

export function requireAuth(queryClient: QueryClient, redirectFrom?: string): { user: User } {
  const user = queryClient.getQueryData<User | null>(meQueryKey);
  if (!user) {
    throw redirect({
      to: "/login",
      search: redirectFrom ? { redirect: redirectFrom } : {},
    });
  }
  return { user };
}
