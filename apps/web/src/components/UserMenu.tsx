import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout, meQueryKey, setUser, type User } from "@/lib/auth";

function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      setUser(queryClient, null);
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      void navigate({ to: "/login" });
    },
    onError: () => toast.error("Logout failed"),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="-mr-2 gap-2 pl-1 pr-2">
          <Avatar className="size-7">
            <AvatarFallback>{initials(user.username) || "?"}</AvatarFallback>
          </Avatar>
          <span className="text-foreground text-sm font-medium">{user.username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
        <div className="px-2 pb-2 pt-0">
          <p className="text-foreground text-sm font-medium">{user.username}</p>
          <p className="text-muted-foreground text-xs">local sudoer</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="size-4" />
          {logoutMutation.isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
