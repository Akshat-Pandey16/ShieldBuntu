import createClient from "openapi-fetch";

import type { paths } from "./api.gen";

export const api = createClient<paths>({
  credentials: "include",
});

export type ApiClient = typeof api;
