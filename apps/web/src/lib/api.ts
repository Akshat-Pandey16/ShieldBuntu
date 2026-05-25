import createClient, { type Middleware } from "openapi-fetch";

import type { components, paths } from "./api.gen";

export const api = createClient<paths>({
  credentials: "include",
  headers: { Accept: "application/json" },
});

export type ApiClient = typeof api;

export type RunStatus = components["schemas"]["RunStatus"];
export type RunAction = components["schemas"]["RunAction"];
export type EventLevel = components["schemas"]["EventLevel"];
export type HardeningRun = components["schemas"]["HardeningRun"];
export type HardeningEvent = components["schemas"]["HardeningEvent"];
export type EventSummary = components["schemas"]["EventSummary"];
export type TaskMetadata = components["schemas"]["TaskMetadata"];
export type TaskInputSpec = components["schemas"]["TaskInputSpec"];
export type Profile = components["schemas"]["Profile"];
export type HealthResponse = components["schemas"]["HealthResponse"];

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(h: UnauthorizedHandler | null): void {
  unauthorizedHandler = h;
}

const authMiddleware: Middleware = {
  onResponse({ response, request }) {
    if (response.status === 401 && !request.url.includes("/api/auth/")) {
      unauthorizedHandler?.();
    }
    return response;
  },
};

api.use(authMiddleware);

export const TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set([
  "succeeded",
  "no_change",
  "failed",
  "cancelled",
]);

export const ACTIVE_STATUSES: ReadonlySet<RunStatus> = new Set(["pending", "running"]);

export function isTerminal(status: string | undefined | null): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.has(status as RunStatus);
}

export function isActive(status: string | undefined | null): boolean {
  if (!status) return false;
  return ACTIVE_STATUSES.has(status as RunStatus);
}
