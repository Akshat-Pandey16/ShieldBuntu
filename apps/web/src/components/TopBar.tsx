import { useState } from "react";
import { Search } from "lucide-react";

import { Breadcrumb, type BreadcrumbItem } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import type { User } from "@/lib/auth";

interface TopBarProps {
  user: User;
  breadcrumb?: BreadcrumbItem[];
  onOpenCommand?: () => void;
}

function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toLowerCase().includes("mac");
}

export function TopBar({ user, breadcrumb, onOpenCommand }: TopBarProps) {
  const [isMac] = useState(detectIsMac);

  return (
    <header className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b px-6 backdrop-blur-md">
      <div className="min-w-0 flex-1">
        {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
      </div>
      <div className="flex items-center gap-2">
        {onOpenCommand && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenCommand}
            className="text-muted-foreground hover:text-foreground hidden gap-2 pr-1.5 sm:flex"
          >
            <Search className="size-4" />
            <span>Search…</span>
            <kbd className="bg-muted text-muted-foreground ml-2 rounded px-1.5 py-0.5 font-mono text-[10px]">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </Button>
        )}
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
