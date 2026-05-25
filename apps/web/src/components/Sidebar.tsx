import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LayoutDashboard, ListChecks, Radio, ShieldCheck, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface NavItem {
  to: "/" | "/tasks" | "/runs";
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
}

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { to: "/tasks", label: "Tasks", Icon: ListChecks },
  { to: "/runs", label: "Runs", Icon: Radio },
];

export function Sidebar() {
  return (
    <aside className="border-border bg-card/40 supports-[backdrop-filter]:bg-card/30 fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r backdrop-blur-md">
      <div className="border-border flex h-14 items-center gap-2.5 border-b px-5">
        <div className="bg-accent/15 text-accent flex size-7 items-center justify-center rounded-lg">
          <ShieldCheck className="size-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-foreground text-sm font-semibold tracking-tight">ShieldBuntu</span>
          <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Hardening
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            className={cn(
              "text-muted-foreground hover:bg-secondary hover:text-foreground group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            )}
            activeProps={{
              className: "text-foreground bg-secondary [&_[data-active-indicator]]:opacity-100",
            }}
          >
            <span
              data-active-indicator
              className="bg-accent absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r opacity-0 transition-opacity"
            />
            <item.Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="border-border bg-subtle/40 m-3 rounded-lg border p-3"
      >
        <p className="text-foreground text-xs font-medium">CIS-aligned</p>
        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
          Every task maps to CIS Benchmark controls. Dry-run before applying anything.
        </p>
      </motion.div>
    </aside>
  );
}
