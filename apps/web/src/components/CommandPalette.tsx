import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
  Monitor,
  Moon,
  Radio,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react";

import { api } from "@/lib/api";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

export function CommandPalette({ open, onOpenChange, onLogout }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await api.GET("/api/tasks", {})).data ?? [],
    staleTime: 30_000,
    enabled: open,
  });

  const closePalette = () => {
    setQuery("");
    onOpenChange(false);
  };

  const go = (fn: () => void) => {
    closePalette();
    setTimeout(fn, 30);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePalette();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePalette();
      }}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md" aria-hidden />
      <Command
        label="Command palette"
        className="glass-strong relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 ring-brand/20"
        shouldFilter
      >
        <div className="border-border/60 flex items-center gap-2 border-b px-4 py-3.5">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Jump to a task, run, or action…"
            className="placeholder:text-muted-foreground text-foreground flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
          <kbd className="bg-background/80 text-muted-foreground border-border/80 rounded border px-1.5 py-0.5 font-mono text-[10px]">
            ESC
          </kbd>
        </div>
        <Command.List className="scrollbar-thin max-h-[420px] overflow-y-auto p-2">
          <Command.Empty className="text-muted-foreground p-8 text-center text-sm">
            Nothing matches "{query}"
          </Command.Empty>

          <Command.Group heading="Navigate" className="cmdk-group">
            <PaletteItem
              icon={<LayoutDashboard className="size-4" />}
              label="Dashboard"
              onSelect={() => go(() => void navigate({ to: "/" }))}
            />
            <PaletteItem
              icon={<ListChecks className="size-4" />}
              label="Hardening tasks"
              onSelect={() => go(() => void navigate({ to: "/tasks" }))}
            />
            <PaletteItem
              icon={<Radio className="size-4" />}
              label="Runs"
              onSelect={() => go(() => void navigate({ to: "/runs" }))}
            />
          </Command.Group>

          {tasksQuery.data && tasksQuery.data.length > 0 && (
            <Command.Group heading="Tasks" className="cmdk-group">
              {tasksQuery.data.map((task) => (
                <PaletteItem
                  key={task.id}
                  icon={<ShieldCheck className="text-brand size-4" />}
                  label={task.name}
                  hint={task.category}
                  keywords={[task.id, ...(task.tags ?? [])]}
                  onSelect={() =>
                    go(() => void navigate({ to: "/tasks/$taskId", params: { taskId: task.id } }))
                  }
                />
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Preferences" className="cmdk-group">
            <PaletteItem
              icon={<Sun className="size-4" />}
              label="Light theme"
              onSelect={() => go(() => setTheme("light"))}
            />
            <PaletteItem
              icon={<Moon className="size-4" />}
              label="Dark theme"
              onSelect={() => go(() => setTheme("dark"))}
            />
            <PaletteItem
              icon={<Monitor className="size-4" />}
              label="System theme"
              onSelect={() => go(() => setTheme("system"))}
            />
          </Command.Group>

          <Command.Group heading="Session" className="cmdk-group">
            <PaletteItem
              icon={<LogOut className="size-4" />}
              label="Sign out"
              danger
              onSelect={() => go(onLogout)}
            />
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

interface PaletteItemProps {
  icon: ReactNode;
  label: string;
  hint?: string;
  keywords?: string[];
  danger?: boolean;
  onSelect: () => void;
}

function PaletteItem({ icon, label, hint, keywords, danger, onSelect }: PaletteItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      value={`${label} ${hint ?? ""} ${(keywords ?? []).join(" ")}`}
      className="text-foreground aria-selected:bg-brand/15 aria-selected:text-foreground data-[danger=true]:text-destructive flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
      data-danger={danger}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
    </Command.Item>
  );
}
