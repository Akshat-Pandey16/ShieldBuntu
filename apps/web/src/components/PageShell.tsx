import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";

import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { logout, meQueryKey, setUser, type User } from "@/lib/auth";
import type { BreadcrumbItem } from "@/components/Breadcrumb";
import { TooltipProvider } from "@/components/ui/tooltip";

interface PageShellProps {
  children: ReactNode;
  breadcrumb?: BreadcrumbItem[];
}

export function PageShell({ children, breadcrumb }: PageShellProps) {
  const { data: user } = useQuery<User | null>({ queryKey: meQueryKey });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen]);

  const handleLogout = useCallback(async () => {
    await logout();
    setUser(queryClient, null);
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
    void navigate({ to: "/login" });
  }, [queryClient, navigate]);

  if (!user) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-background min-h-screen">
        <Sidebar />
        <div className="pl-60">
          <TopBar user={user} breadcrumb={breadcrumb} onOpenCommand={() => setPaletteOpen(true)} />
          <motion.main
            key={breadcrumb?.map((b) => b.to ?? "leaf").join("/")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mx-auto max-w-6xl space-y-6 p-6 lg:p-10"
          >
            {children}
          </motion.main>
        </div>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onLogout={() => void handleLogout()}
        />
      </div>
    </TooltipProvider>
  );
}
