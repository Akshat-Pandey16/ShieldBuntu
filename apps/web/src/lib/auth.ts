import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { api } from "./api";

export interface User {
  username: string;
}

export const meQueryKey = ["auth", "me"] as const;

export async function fetchMe(): Promise<User | null> {
  const { data, response } = await api.GET("/api/auth/me", {});
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Auth check failed (${response.status})`);
  }
  if (!data) return null;
  return data;
}

export async function login(username: string, password: string): Promise<User> {
  const { data, error, response } = await api.POST("/api/auth/login", {
    body: { username, password },
  });
  if (response.status === 401) {
    throw new Error("Invalid credentials");
  }
  if (response.status === 429) {
    const detail = (error as { detail?: string } | undefined)?.detail;
    throw new Error(detail ?? "Too many attempts, try again later");
  }
  if (error || !data) {
    throw new Error(`Login failed (${response.status})`);
  }
  return data;
}

export async function logout(): Promise<void> {
  await api.POST("/api/auth/logout", {});
}

export async function loadUser(queryClient: QueryClient): Promise<User | null> {
  return queryClient.ensureQueryData({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    staleTime: 60_000,
  });
}

export function setUser(queryClient: QueryClient, user: User | null): void {
  queryClient.setQueryData(meQueryKey, user);
}

export function useUser(): User | null {
  const { data } = useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    staleTime: 60_000,
  });
  return data ?? null;
}

export function useLogout(): { mutate: () => void; isPending: boolean } {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const m = useMutation({
    mutationFn: logout,
    onSettled: async () => {
      setUser(queryClient, null);
      queryClient.removeQueries({ queryKey: meQueryKey });
      await navigate({ to: "/login" });
    },
  });
  return { mutate: () => m.mutate(), isPending: m.isPending };
}
