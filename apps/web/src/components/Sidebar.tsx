import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ListChecks, Radio, ShieldCheck, X, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: "/" | "/tasks" | "/runs";
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
}

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { to: "/tasks", label: "Hardening tasks", Icon: ListChecks },
  { to: "/runs", label: "Runs", Icon: Radio },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileOpenChange(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen, onMobileOpenChange]);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-label="Close menu"
          onClick={() => onMobileOpenChange(false)}
        />
      )}
      <aside
        className={cn(
          "glass-strong fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="border-border/60 flex h-16 items-center justify-between border-b px-5">
          <Link
            to="/"
            className="group flex items-center gap-2.5"
            onClick={() => onMobileOpenChange(false)}
          >
            <span className="from-brand to-brand-2 text-brand-foreground shadow-glow relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br">
              <ShieldCheck className="size-4" />
              <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-foreground text-[15px] font-semibold tracking-tight">
                ShieldBuntu
              </span>
              <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.18em]">
                Ubuntu hardening
              </span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Close menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              onClick={() => onMobileOpenChange(false)}
              className={cn(
                "text-muted-foreground hover:bg-secondary/70 hover:text-foreground group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              )}
              activeProps={{
                className:
                  "bg-brand/12 text-foreground ring-brand/30 [&_[data-active-indicator]]:opacity-100 ring-1",
              }}
            >
              <span
                data-active-indicator
                className="bg-brand absolute left-0 top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity"
              />
              <item.Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-border/60 border-t p-3">
          <div className="from-brand/15 via-brand-2/10 relative overflow-hidden rounded-xl bg-gradient-to-br to-transparent p-4">
            <div className="bg-dotgrid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
            <p className="text-foreground relative text-[13px] font-semibold">CIS-aligned</p>
            <p className="text-muted-foreground relative mt-1 text-[11px] leading-relaxed">
              Every role maps to CIS Benchmark controls. Dry-run before you apply anything.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
