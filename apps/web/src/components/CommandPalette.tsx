import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  ListChecks,
  LogOut,
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePalette();
      }}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />
      <Command
        label="Command palette"
        className="bg-popover border-border relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-xl border shadow-2xl"
        shouldFilter
      >
        <div className="border-border flex items-center gap-2 border-b px-4 py-3">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Jump to a task, run, or action…"
            className="placeholder:text-muted-foreground text-foreground flex-1 bg-transparent text-sm outline-none"
            autoFocus
          />
          <kbd className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]">
            ESC
          </kbd>
        </div>
        <Command.List className="scrollbar-thin max-h-[420px] overflow-y-auto p-2">
          <Command.Empty className="text-muted-foreground p-8 text-center text-sm">
            No results for "{query}"
          </Command.Empty>

          <Command.Group heading="Navigate" className="cmdk-group">
            <PaletteItem
              icon={<LayoutDashboard className="size-4" />}
              label="Dashboard"
              shortcut="G D"
              onSelect={() => go(() => void navigate({ to: "/" }))}
            />
            <PaletteItem
              icon={<ListChecks className="size-4" />}
              label="Tasks"
              shortcut="G T"
              onSelect={() => go(() => void navigate({ to: "/tasks" }))}
            />
            <PaletteItem
              icon={<Radio className="size-4" />}
              label="Runs"
              shortcut="G R"
              onSelect={() => go(() => void navigate({ to: "/runs" }))}
            />
          </Command.Group>

          {tasksQuery.data && tasksQuery.data.length > 0 && (
            <Command.Group heading="Tasks" className="cmdk-group">
              {tasksQuery.data.map((task) => (
                <PaletteItem
                  key={task.id}
                  icon={<ShieldCheck className="text-accent size-4" />}
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
              label="Switch to light theme"
              onSelect={() => go(() => setTheme("light"))}
            />
            <PaletteItem
              icon={<Moon className="size-4" />}
              label="Switch to dark theme"
              onSelect={() => go(() => setTheme("dark"))}
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
  icon: React.ReactNode;
  label: string;
  hint?: string;
  shortcut?: string;
  keywords?: string[];
  danger?: boolean;
  onSelect: () => void;
}

function PaletteItem({
  icon,
  label,
  hint,
  shortcut,
  keywords,
  danger,
  onSelect,
}: PaletteItemProps) {
  return (
    <Command.Item
      onSelect={onSelect}
      value={`${label} ${hint ?? ""} ${(keywords ?? []).join(" ")}`}
      className="data-[selected=true]:bg-secondary text-foreground flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors aria-selected:bg-secondary data-[danger=true]:text-destructive"
      data-danger={danger}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      {shortcut && (
        <kbd className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
