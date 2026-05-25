import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, setUser } from "@/lib/auth";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: ({ context, search }) => {
    const user = context.queryClient.getQueryData(["auth", "me"]);
    if (user) {
      throw redirect({ to: search.redirect ?? "/" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: () => login(username, password),
    onSuccess: (user) => {
      setUser(queryClient, user);
      toast.success(`Welcome back, ${user.username}`);
      void navigate({ to: search.redirect ?? "/" });
    },
    onError: (error: Error) => {
      toast.error("Sign in failed", { description: error.message });
    },
  });

  return (
    <div className="bg-background text-foreground relative grid min-h-screen lg:grid-cols-2">
      <div className="from-accent/20 via-background to-background relative hidden overflow-hidden bg-gradient-to-br lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center gap-2.5"
        >
          <div className="bg-accent/15 text-accent flex size-8 items-center justify-center rounded-lg backdrop-blur">
            <ShieldCheck className="size-4" />
          </div>
          <span className="text-foreground text-sm font-semibold tracking-tight">ShieldBuntu</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative space-y-6"
        >
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">
              Ubuntu hardening
            </p>
            <h1 className="text-foreground text-4xl font-semibold leading-tight tracking-tight">
              Production-grade
              <br />
              security, in your browser.
            </h1>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              Apply CIS-aligned hardening to your machine with one click. Dry-run before you apply.
              Watch every change in real time.
            </p>
          </div>
          <div className="border-border bg-card/40 max-w-md rounded-xl border p-5 backdrop-blur">
            <p className="text-foreground text-sm font-medium">16 hardening tasks</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Firewall, SSH, kernel, AppArmor, auditd, fail2ban, USB, GRUB, Tor blocking, and more —
              all idempotent, all revertable.
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground relative text-xs"
        >
          Built for Ubuntu 24.04 LTS · Ansible engine · PAM auth
        </motion.p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="space-y-2 lg:hidden">
            <div className="bg-accent/15 text-accent flex size-9 items-center justify-center rounded-lg">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-muted-foreground text-sm">
              Use your local sudoer credentials. Auth is PAM-backed.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loginMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loginMutation.isPending}
                placeholder="akshat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-2 w-full justify-center"
              size="lg"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
          <p className="text-muted-foreground text-center text-xs">
            Only members of the <span className="text-foreground font-mono">sudo</span> group can
            sign in.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
