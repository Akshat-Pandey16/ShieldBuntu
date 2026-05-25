import * as React from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "from-muted/40 via-muted/60 to-muted/40 shimmer relative overflow-hidden rounded-lg bg-gradient-to-r",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
