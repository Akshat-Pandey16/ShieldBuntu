import type { QueryClient } from "@tanstack/react-query";

import { api } from "./api";

export interface User {
  username: string;
}

export const meQueryKey = ["auth", "me"] as const;

export async function fetchMe(): Promise<User | null> {
  const { data, response } = await api.GET("/api/auth/me", {});
  if (response.status === 401) return null;
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
