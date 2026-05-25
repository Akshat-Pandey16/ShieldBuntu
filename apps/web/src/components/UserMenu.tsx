import { LogOut, MousePointer2, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, type User } from "@/lib/auth";
import { useCursorPref } from "@/lib/cursorPref";

function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ user }: { user: User }) {
  const logout = useLogout();
  const [cursorOn, setCursorOn] = useCursorPref();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-secondary/70 -mr-1 gap-2 rounded-full pl-1 pr-2.5"
        >
          <Avatar className="size-7">
            <AvatarFallback className="from-brand to-brand-2 text-brand-foreground bg-gradient-to-br text-[11px] font-semibold">
              {initials(user.username) || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground hidden text-sm font-medium sm:inline">
            {user.username}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong min-w-56">
        <DropdownMenuLabel className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">
          Signed in
        </DropdownMenuLabel>
        <div className="px-2 pb-2 pt-1">
          <div className="flex items-center gap-2">
            <Avatar className="size-9">
              <AvatarFallback className="from-brand to-brand-2 text-brand-foreground bg-gradient-to-br text-xs font-semibold">
                {initials(user.username) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-foreground truncate text-sm font-semibold">{user.username}</p>
              <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <ShieldCheck className="size-3" /> local sudoer
              </p>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={cursorOn}
          onCheckedChange={(c) => setCursorOn(Boolean(c))}
          onSelect={(e) => e.preventDefault()}
        >
          <MousePointer2 className="size-4" />
          <span className="flex-1">Aurora cursor</span>
          <span className="text-muted-foreground ml-2 font-mono text-[10px]">⌥⇧C</span>
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="size-4" />
          {logout.isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
