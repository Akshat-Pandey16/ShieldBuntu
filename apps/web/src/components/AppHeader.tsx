import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { logout, meQueryKey, setUser, type User } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  user: User;
}

const navLinks: { to: "/" | "/tasks" | "/runs"; label: string }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/tasks", label: "Tasks" },
  { to: "/runs", label: "Runs" },
];

export function AppHeader({ user }: AppHeaderProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      setUser(queryClient, null);
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      void navigate({ to: "/login" });
    },
    onError: () => {
      toast.error("Logout failed");
    },
  });

  return (
    <header className="border-border bg-card sticky top-0 z-10 flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="text-accent size-5" />
          ShieldBuntu
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: link.to === "/" }}
              className={cn(
                "text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 transition-colors",
              )}
              activeProps={{ className: "text-foreground bg-secondary" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm">{user.username}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
