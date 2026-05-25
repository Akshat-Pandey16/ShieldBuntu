import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/AppHeader";
import { meQueryKey, type User } from "@/lib/auth";

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const { data: user } = useQuery<User | null>({ queryKey: meQueryKey });
  if (!user) return null;
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-6xl space-y-6 p-6">{children}</main>
    </>
  );
}
