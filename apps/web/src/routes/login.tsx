import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
    <div className="bg-mesh text-foreground relative grid min-h-screen overflow-hidden lg:grid-cols-[1.05fr_1fr]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="from-brand/30 absolute -top-32 -left-32 h-96 w-96 rounded-full bg-gradient-to-br to-transparent blur-3xl" />
        <div className="from-brand-2/25 absolute -bottom-32 left-1/3 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr to-transparent blur-3xl" />
        <div className="from-info/20 absolute right-0 top-1/4 h-80 w-80 rounded-full bg-gradient-to-bl to-transparent blur-3xl" />
        <div className="bg-grid absolute inset-0 opacity-30" />
      </div>

      <div className="relative hidden flex-col justify-between p-10 lg:flex lg:p-14">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center gap-2.5"
        >
          <span className="from-brand to-brand-2 text-brand-foreground shadow-glow flex size-9 items-center justify-center rounded-xl bg-gradient-to-br">
            <ShieldCheck className="size-4" />
          </span>
          <span className="text-foreground text-sm font-semibold tracking-tight">ShieldBuntu</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative space-y-7"
        >
          <span className="bg-brand/12 text-brand ring-brand/25 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1">
            <Sparkles className="size-3" /> CIS-aligned Ubuntu hardening
          </span>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Production-grade <span className="text-gradient-brand">security</span>,
            <br />
            in your browser.
          </h1>
          <p className="text-muted-foreground max-w-md text-base leading-relaxed">
            Apply CIS-aligned hardening to your Ubuntu host with one click. Dry-run anything before
            you apply. Watch every change land in real time.
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-md pt-2">
            <Stat label="Hardening tasks" value="16" />
            <Stat label="Reversible" value="14/16" />
            <Stat label="CIS controls covered" value="60+" />
            <Stat label="Avg. apply time" value="< 30s" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative flex items-center gap-3 text-[11px]"
        >
          <span className="text-muted-foreground">Ubuntu 24.04 LTS</span>
          <span className="bg-border h-1 w-1 rounded-full" />
          <span className="text-muted-foreground">Ansible engine</span>
          <span className="bg-border h-1 w-1 rounded-full" />
          <span className="text-muted-foreground">PAM auth</span>
        </motion.div>
      </div>

      <div className="relative flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong w-full max-w-sm rounded-2xl p-8 shadow-soft"
        >
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="from-brand to-brand-2 text-brand-foreground shadow-glow flex size-9 items-center justify-center rounded-xl bg-gradient-to-br">
              <ShieldCheck className="size-4" />
            </span>
            <span className="text-foreground text-sm font-semibold tracking-tight">
              ShieldBuntu
            </span>
          </div>
          <div className="space-y-1.5">
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
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
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
                placeholder="your-sudoer-username"
              />
            </div>
            <div className="space-y-1.5">
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
                  className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors"
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

          <div className="text-muted-foreground mt-5 flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 text-xs">
            <Lock className="size-3" />
            Only members of the <code className="text-foreground font-mono">sudo</code> /
            <code className="text-foreground font-mono"> wheel</code> /
            <code className="text-foreground font-mono"> admin</code> groups can sign in.
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-xl p-3.5">
      <div className="text-foreground text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
    </div>
  );
}
