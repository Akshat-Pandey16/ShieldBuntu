import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";

import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { UnprivilegedBanner } from "@/components/UnprivilegedBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { useLogout, type User } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AppShellProps {
  user: User;
  children: ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logoutMutation = useLogout();

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: async () => (await api.GET("/api/health", {})).data ?? null,
    staleTime: 30_000,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="bg-background relative min-h-screen">
        <div
          className="bg-mesh pointer-events-none fixed inset-0 -z-10 opacity-60"
          aria-hidden
        />

        <Sidebar mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />

        <div className="lg:pl-64">
          <TopBar
            user={user}
            onOpenCommand={() => setPaletteOpen(true)}
            onOpenSidebar={() => setSidebarOpen(true)}
          />

          <motion.main
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn("mx-auto w-full max-w-6xl space-y-6 px-5 py-6 lg:px-10 lg:py-10")}
          >
            {health && !health.running_as_root && (
              <UnprivilegedBanner daemonUser={health.daemon_user} />
            )}
            {children}
          </motion.main>
        </div>

        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onLogout={handleLogout}
        />
      </div>
    </TooltipProvider>
  );
}
