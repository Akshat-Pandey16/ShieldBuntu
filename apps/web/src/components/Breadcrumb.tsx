import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: ReactNode;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.to && !last ? (
              <Link
                to={item.to}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-foreground font-medium" : "text-muted-foreground"}>
                {item.label}
              </span>
            )}
            {!last && <ChevronRight className="text-muted-foreground/50 size-3 shrink-0" />}
          </span>
        );
      })}
    </nav>
  );
}
