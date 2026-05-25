import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card/40 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="from-brand/15 to-brand-2/10 text-brand rounded-2xl bg-gradient-to-br p-4 ring-1 ring-brand/25">
          <Icon className="size-6" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-foreground text-base font-semibold tracking-tight">{title}</p>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
