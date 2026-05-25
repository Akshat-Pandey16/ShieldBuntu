import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  FlaskConical,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api, type RunAction, type TaskInputSpec } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ActionMeta {
  Icon: LucideIcon;
  label: string;
  description: string;
  variant: "default" | "outline" | "destructive";
  confirm?: { title: string; body: string; cta: string };
  accent: string;
}

const meta: Record<RunAction, ActionMeta> = {
  apply: {
    Icon: Play,
    label: "Apply",
    description: "Bring the system to the desired hardened state.",
    variant: "default",
    accent: "from-brand to-brand-2",
  },
  check: {
    Icon: Search,
    label: "Check",
    description: "Report what's drifted, without changing anything.",
    variant: "outline",
    accent: "from-sky-500 to-cyan-500",
  },
  revert: {
    Icon: RotateCcw,
    label: "Revert",
    description: "Roll back changes this role applied. Some are non-reversible.",
    variant: "destructive",
    accent: "from-rose-500 to-pink-500",
    confirm: {
      title: "Revert this hardening?",
      body: "This will roll back what the role applied. Some changes (autoremoved packages, sysctl values until reboot) can't be perfectly undone.",
      cta: "Yes, revert",
    },
  },
};

const actions: RunAction[] = ["apply", "check", "revert"];

interface ActionPanelProps {
  taskId: string;
  supportedActions: readonly string[];
  inputs?: readonly TaskInputSpec[];
}

export function ActionPanel({ taskId, supportedActions, inputs = [] }: ActionPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dryRun, setDryRun] = useState(false);
  const [confirmAction, setConfirmAction] = useState<RunAction | null>(null);
  const [inputDialog, setInputDialog] = useState<{ action: RunAction } | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(inputs.map((s) => [s.name, ""])),
  );

  const requiredInputsMissing = useMemo(() => {
    for (const spec of inputs) {
      if (spec.required && !values[spec.name]?.trim()) return true;
    }
    return false;
  }, [inputs, values]);

  const startRun = useMutation({
    mutationFn: async (variables: { action: RunAction; inputs: Record<string, string> }) => {
      const { data, error, response } = await api.POST("/api/runs", {
        body: {
          task_id: taskId,
          action: variables.action,
          dry_run: dryRun,
          host_id: "local",
          inputs: variables.inputs,
        },
      });
      const detail = (error as { detail?: string } | undefined)?.detail;
      if (response.status === 401) throw new Error("Your session expired. Sign in again.");
      if (response.status === 400) throw new Error(detail ?? "Request invalid.");
      if (response.status === 404) throw new Error("Task not found.");
      if (response.status === 409) {
        const err = new Error(detail ?? "A run for this task is already in progress.");
        (err as Error & { conflict?: boolean }).conflict = true;
        throw err;
      }
      if (error || !data || !data.id) {
        throw new Error(`Server responded with ${response.status}`);
      }
      return data;
    },
    onSuccess: async (run) => {
      const verb =
        run.action === "check" ? "Check" : run.action === "revert" ? "Revert" : "Apply";
      toast.success(`${verb} started`, {
        description: run.dry_run ? "Running in dry-run mode" : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["runs"] });
      void navigate({ to: "/runs/$runId", params: { runId: run.id! } });
    },
    onError: (e: Error) => {
      const isConflict = (e as Error & { conflict?: boolean }).conflict;
      if (isConflict) {
        toast.warning("Already running", {
          description: e.message,
          action: {
            label: "View runs",
            onClick: () => void navigate({ to: "/runs", search: { taskId } }),
          },
        });
        return;
      }
      toast.error("Could not start the run", { description: e.message });
    },
  });

  const submit = (action: RunAction) => {
    startRun.mutate({ action, inputs: values });
  };

  const triggerAction = (action: RunAction) => {
    if (inputs.length > 0 && action !== "check") {
      setInputDialog({ action });
      return;
    }
    if (meta[action].confirm) {
      setConfirmAction(action);
      return;
    }
    submit(action);
  };

  const confirmMeta = confirmAction ? meta[confirmAction] : null;

  return (
    <>
      <div className="border-border/70 bg-card relative overflow-hidden rounded-2xl border p-6 shadow-soft">
        <div
          className="pointer-events-none absolute inset-x-0 -top-20 h-40 bg-[radial-gradient(ellipse_at_top,oklch(from_var(--color-brand)_l_c_h/0.18),transparent_70%)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em]">
              <Settings2 className="size-3" /> Actions
            </div>
            <h2 className="text-foreground text-lg font-semibold tracking-tight">
              Bring this task to target state
            </h2>
            <p className="text-muted-foreground max-w-lg text-sm">
              Dry-run reports what would change without modifying anything. Reverts roll back
              previously-applied changes where possible.
            </p>
          </div>
          <label className="bg-muted/40 hover:bg-muted border-border/60 flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors">
            <FlaskConical
              className={cn("size-4", dryRun ? "text-brand" : "text-muted-foreground")}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-foreground text-sm font-medium">Dry-run</span>
              <span className="text-muted-foreground text-[11px]">no changes</span>
            </div>
            <Switch checked={dryRun} onCheckedChange={setDryRun} aria-label="Dry-run mode" />
          </label>
        </div>

        <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {actions.map((action) => {
            const cfg = meta[action];
            const supported = supportedActions.includes(action);
            const pending =
              startRun.isPending && startRun.variables?.action === action;
            const Icon = pending ? Loader2 : cfg.Icon;
            return (
              <Tooltip key={action}>
                <TooltipTrigger asChild>
                  <span className="block">
                    <button
                      type="button"
                      onClick={() => triggerAction(action)}
                      disabled={!supported || startRun.isPending}
                      className={cn(
                        "border-border/70 bg-secondary/40 hover:bg-secondary group relative flex h-[68px] w-full items-center gap-2.5 overflow-hidden rounded-xl border px-4 text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
                        action === "apply" && "hover:ring-brand/40 hover:ring-1",
                        action === "check" && "hover:ring-info/40 hover:ring-1",
                        action === "revert" && "hover:ring-destructive/40 hover:ring-1",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r opacity-0 transition-opacity duration-200 group-hover:opacity-100",
                          cfg.accent,
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                          cfg.accent,
                        )}
                      >
                        <Icon className={cn("size-4", pending && "animate-spin")} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="text-foreground truncate">{cfg.label}</span>
                        <span className="text-muted-foreground truncate text-[11px] font-normal">
                          {cfg.description.split(".")[0]}
                        </span>
                      </span>
                      {dryRun && action !== "check" && (
                        <span
                          className="bg-brand/20 text-brand absolute right-2 top-2 rounded px-1.5 py-0.5 font-mono text-[10px] leading-none"
                          aria-hidden
                        >
                          dry
                        </span>
                      )}
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {supported ? cfg.description : `This task doesn't support ${action}.`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <Dialog
        open={inputDialog !== null}
        onOpenChange={(o) => !o && setInputDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task inputs</DialogTitle>
            <DialogDescription>
              This role needs values before it runs. Secret fields are sent over your local
              connection and never logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {inputs.map((spec) => {
              const isSecret = spec.secret;
              const shown = revealed[spec.name];
              return (
                <div key={spec.name} className="space-y-1.5">
                  <Label htmlFor={`input-${spec.name}`}>
                    {spec.label}
                    {spec.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`input-${spec.name}`}
                      type={isSecret && !shown ? "password" : "text"}
                      value={values[spec.name] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [spec.name]: e.target.value }))
                      }
                      required={spec.required}
                      autoComplete={isSecret ? "new-password" : "off"}
                      className={cn(isSecret && "pr-10")}
                    />
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() =>
                          setRevealed((prev) => ({ ...prev, [spec.name]: !prev[spec.name] }))
                        }
                        className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded p-1"
                        aria-label={shown ? "Hide value" : "Show value"}
                      >
                        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    )}
                  </div>
                  {spec.description && (
                    <p className="text-muted-foreground text-xs">{spec.description}</p>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInputDialog(null)}>
              Cancel
            </Button>
            <Button
              disabled={requiredInputsMissing || startRun.isPending}
              onClick={() => {
                const action = inputDialog!.action;
                setInputDialog(null);
                if (meta[action].confirm) setConfirmAction(action);
                else submit(action);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction !== null} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="bg-destructive/15 text-destructive mb-2 flex size-10 items-center justify-center rounded-full">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>{confirmMeta?.confirm?.title}</DialogTitle>
            <DialogDescription>{confirmMeta?.confirm?.body}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirmAction) return;
                const action = confirmAction;
                setConfirmAction(null);
                submit(action);
              }}
            >
              {confirmMeta?.confirm?.cta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
