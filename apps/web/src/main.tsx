import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";

import { ThemeProvider } from "@/components/ThemeProvider";
import { setUnauthorizedHandler } from "@/lib/api";
import { meQueryKey } from "@/lib/auth";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: { queryClient },
  defaultPendingMs: 150,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

setUnauthorizedHandler(() => {
  queryClient.setQueryData(meQueryKey, null);
  void queryClient.invalidateQueries({ queryKey: meQueryKey });
  if (!window.location.pathname.startsWith("/login")) {
    void router.navigate({
      to: "/login",
      search: { redirect: window.location.pathname + window.location.search },
    });
  }
});

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      richColors
      position="bottom-right"
      closeButton
      toastOptions={{
        className: "border-border/70 shadow-soft rounded-xl",
      }}
    />
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ThemedToaster />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
