import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  FlaskConical,
  Loader2,
  Play,
  RotateCcw,
  Search,
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
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type Action = "apply" | "check" | "revert";

interface ActionMeta {
  Icon: LucideIcon;
  label: string;
  description: string;
  variant: "default" | "outline" | "destructive";
  confirm?: { title: string; body: string; cta: string };
}

const meta: Record<Action, ActionMeta> = {
  apply: {
    Icon: Play,
    label: "Apply",
    description: "Make the system match the desired state.",
    variant: "default",
  },
  check: {
    Icon: Search,
    label: "Check",
    description: "Report current state without making any changes.",
    variant: "outline",
  },
  revert: {
    Icon: RotateCcw,
    label: "Revert",
    description: "Roll back what apply did. Some changes can't be undone.",
    variant: "destructive",
    confirm: {
      title: "Revert hardening?",
      body: "This will roll back what this task applied. Make sure you understand the impact — some changes can't be undone.",
      cta: "Yes, revert",
    },
  },
};

interface ActionPanelProps {
  taskId: string;
  supportedActions: readonly string[];
}

export function ActionPanel({ taskId, supportedActions }: ActionPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dryRun, setDryRun] = useState(false);
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);

  const startRun = useMutation({
    mutationFn: async (action: Action) => {
      const { data, error, response } = await api.POST("/api/runs", {
        body: { task_id: taskId, action, dry_run: dryRun, host_id: "local" },
      });
      if (response.status === 401) {
        throw new Error("Your session expired. Please sign in again.");
      }
      if (response.status === 400) {
        const detail = (error as { detail?: string } | undefined)?.detail;
        throw new Error(detail ?? "Task does not support this action.");
      }
      if (response.status === 404) {
        throw new Error("Task not found.");
      }
      if (error || !data || !data.id) {
        throw new Error(`Server responded with ${response.status}`);
      }
      return data;
    },
    onSuccess: async (run) => {
      const verb = run.action === "check" ? "Check" : run.action === "revert" ? "Revert" : "Apply";
      toast.success(`${verb} started`, {
        description: run.dry_run ? "Running in dry-run mode" : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["runs"] });
      void navigate({ to: "/runs/$runId", params: { runId: run.id! } });
    },
    onError: (e: Error) => {
      toast.error("Could not start the run", { description: e.message });
    },
  });

  const triggerAction = (action: Action) => {
    if (meta[action].confirm) {
      setConfirmAction(action);
    } else {
      startRun.mutate(action);
    }
  };

  const confirmMeta = confirmAction ? meta[confirmAction] : null;

  return (
    <>
      <div className="bg-card border-border rounded-xl border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-foreground text-base font-semibold tracking-tight">Actions</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose how to bring this task to its target state. Dry-run reports what would change
              without modifying anything.
            </p>
          </div>
          <label className="bg-muted/50 hover:bg-muted flex shrink-0 cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors">
            <FlaskConical
              className={cn("size-4", dryRun ? "text-accent" : "text-muted-foreground")}
            />
            <div className="flex flex-col leading-tight">
              <span className="text-foreground text-sm font-medium">Dry-run</span>
              <span className="text-muted-foreground text-[11px]">No changes</span>
            </div>
            <Switch checked={dryRun} onCheckedChange={setDryRun} aria-label="Dry-run mode" />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(["apply", "check", "revert"] as Action[]).map((action) => {
            const cfg = meta[action];
            const supported = supportedActions.includes(action);
            const pending = startRun.isPending && startRun.variables === action;
            const Icon = pending ? Loader2 : cfg.Icon;
            return (
              <Tooltip key={action}>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant={cfg.variant}
                      onClick={() => triggerAction(action)}
                      disabled={!supported || startRun.isPending}
                      className={cn(
                        "w-full justify-start gap-2",
                        action === "revert" && "hover:bg-destructive/10 hover:text-destructive",
                      )}
                    >
                      <Icon className={cn("size-4", pending && "animate-spin")} />
                      <span className="flex-1 text-left">{cfg.label}</span>
                      {dryRun && action !== "check" && (
                        <span className="bg-accent/15 text-accent rounded px-1.5 py-0.5 text-[10px] font-mono">
                          dry
                        </span>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {supported ? cfg.description : `This task does not support ${action}.`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <Dialog open={confirmAction !== null} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="bg-destructive/15 text-destructive mb-2 flex size-9 items-center justify-center rounded-full">
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
                if (confirmAction) {
                  startRun.mutate(confirmAction);
                  setConfirmAction(null);
                }
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
