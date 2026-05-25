import { Menu, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import type { User } from "@/lib/auth";

interface TopBarProps {
  user: User;
  onOpenCommand: () => void;
  onOpenSidebar: () => void;
}

function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/.test(ua);
}

const isMac = detectIsMac();

export function TopBar({ user, onOpenCommand, onOpenSidebar }: TopBarProps) {
  return (
    <header className="border-border/60 sticky top-0 z-20 border-b backdrop-blur-md supports-[backdrop-filter]:bg-background/55 bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 lg:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          <button
            type="button"
            onClick={onOpenCommand}
            className="bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/60 group flex w-full max-w-sm items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors"
            aria-label="Open command palette"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 text-left">Quick jump…</span>
            <kbd className="bg-background/80 text-muted-foreground border-border/80 hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
