import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { api, isActive, type HardeningRun, type RunStatus } from "./api";

interface UseRunsQueryArgs {
  taskId?: string;
  status?: RunStatus;
  limit?: number;
  offset?: number;
  refetchActiveMs?: number | false;
}

export function useRunsQuery({
  taskId,
  status,
  limit = 50,
  offset = 0,
  refetchActiveMs = 3000,
}: UseRunsQueryArgs = {}): UseQueryResult<HardeningRun[]> {
  return useQuery({
    queryKey: ["runs", { taskId, status, limit, offset }],
    queryFn: async () => {
      const { data } = await api.GET("/api/runs", {
        params: {
          query: {
            task_id: taskId,
            status,
            limit,
            offset,
          },
        },
      });
      return data ?? [];
    },
    refetchInterval: (query) => {
      if (refetchActiveMs === false) return false;
      const rows = query.state.data;
      if (!rows || rows.length === 0) return false;
      return rows.some((r) => isActive(r.status)) ? refetchActiveMs : false;
    },
  });
}
