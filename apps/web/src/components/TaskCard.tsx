import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Bug,
  Cpu,
  Eye,
  HardDrive,
  KeyRound,
  Lock,
  Network,
  PackageMinus,
  PackageSearch,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Terminal,
  Usb,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TaskCardData {
  id: string;
  name: string;
  description: string;
  category?: string;
  profiles?: readonly string[];
  capabilities?: readonly string[];
  cis_refs?: readonly string[];
  tags?: readonly string[];
}

interface TaskCardProps {
  task: TaskCardData;
  index?: number;
}

const profileLabels: Record<string, string> = {
  "cis-l1": "CIS L1",
  "cis-l2": "CIS L2",
  workstation: "Workstation",
  server: "Server",
};

interface CategoryTheme {
  Icon: LucideIcon;
  gradient: string;
  ring: string;
  glow: string;
  iconBg: string;
}

const categoryThemes: Record<string, CategoryTheme> = {
  network: {
    Icon: Network,
    gradient: "from-cyan-500/25 via-cyan-500/5 to-transparent",
    ring: "group-hover:ring-cyan-500/40",
    glow: "bg-cyan-500/10",
    iconBg: "bg-cyan-500/15 text-cyan-300",
  },
  ssh: {
    Icon: Terminal,
    gradient: "from-violet-500/25 via-violet-500/5 to-transparent",
    ring: "group-hover:ring-violet-500/40",
    glow: "bg-violet-500/10",
    iconBg: "bg-violet-500/15 text-violet-300",
  },
  kernel: {
    Icon: Cpu,
    gradient: "from-amber-500/25 via-amber-500/5 to-transparent",
    ring: "group-hover:ring-amber-500/40",
    glow: "bg-amber-500/10",
    iconBg: "bg-amber-500/15 text-amber-300",
  },
  lsm: {
    Icon: ShieldAlert,
    gradient: "from-rose-500/25 via-rose-500/5 to-transparent",
    ring: "group-hover:ring-rose-500/40",
    glow: "bg-rose-500/10",
    iconBg: "bg-rose-500/15 text-rose-300",
  },
  audit: {
    Icon: Eye,
    gradient: "from-blue-500/25 via-blue-500/5 to-transparent",
    ring: "group-hover:ring-blue-500/40",
    glow: "bg-blue-500/10",
    iconBg: "bg-blue-500/15 text-blue-300",
  },
  updates: {
    Icon: Sprout,
    gradient: "from-emerald-500/25 via-emerald-500/5 to-transparent",
    ring: "group-hover:ring-emerald-500/40",
    glow: "bg-emerald-500/10",
    iconBg: "bg-emerald-500/15 text-emerald-300",
  },
  "malware-scanner": {
    Icon: ScanLine,
    gradient: "from-orange-500/25 via-orange-500/5 to-transparent",
    ring: "group-hover:ring-orange-500/40",
    glow: "bg-orange-500/10",
    iconBg: "bg-orange-500/15 text-orange-300",
  },
  "intrusion-prevention": {
    Icon: Bug,
    gradient: "from-fuchsia-500/25 via-fuchsia-500/5 to-transparent",
    ring: "group-hover:ring-fuchsia-500/40",
    glow: "bg-fuchsia-500/10",
    iconBg: "bg-fuchsia-500/15 text-fuchsia-300",
  },
  bootloader: {
    Icon: KeyRound,
    gradient: "from-pink-500/25 via-pink-500/5 to-transparent",
    ring: "group-hover:ring-pink-500/40",
    glow: "bg-pink-500/10",
    iconBg: "bg-pink-500/15 text-pink-300",
  },
  filesystem: {
    Icon: HardDrive,
    gradient: "from-indigo-500/25 via-indigo-500/5 to-transparent",
    ring: "group-hover:ring-indigo-500/40",
    glow: "bg-indigo-500/10",
    iconBg: "bg-indigo-500/15 text-indigo-300",
  },
  session: {
    Icon: Lock,
    gradient: "from-teal-500/25 via-teal-500/5 to-transparent",
    ring: "group-hover:ring-teal-500/40",
    glow: "bg-teal-500/10",
    iconBg: "bg-teal-500/15 text-teal-300",
  },
  auth: {
    Icon: KeyRound,
    gradient: "from-sky-500/25 via-sky-500/5 to-transparent",
    ring: "group-hover:ring-sky-500/40",
    glow: "bg-sky-500/10",
    iconBg: "bg-sky-500/15 text-sky-300",
  },
  packages: {
    Icon: PackageSearch,
    gradient: "from-yellow-500/25 via-yellow-500/5 to-transparent",
    ring: "group-hover:ring-yellow-500/40",
    glow: "bg-yellow-500/10",
    iconBg: "bg-yellow-500/15 text-yellow-300",
  },
  peripherals: {
    Icon: Usb,
    gradient: "from-lime-500/25 via-lime-500/5 to-transparent",
    ring: "group-hover:ring-lime-500/40",
    glow: "bg-lime-500/10",
    iconBg: "bg-lime-500/15 text-lime-300",
  },
};

const defaultTheme: CategoryTheme = {
  Icon: ShieldCheck,
  gradient: "from-brand/20 via-brand/5 to-transparent",
  ring: "group-hover:ring-brand/40",
  glow: "bg-brand/10",
  iconBg: "bg-brand/15 text-brand",
};

const categoryFallbacks: Record<string, CategoryTheme> = {
  general: {
    Icon: PackageMinus,
    gradient: "from-slate-500/20 via-slate-500/5 to-transparent",
    ring: "group-hover:ring-slate-400/40",
    glow: "bg-slate-500/10",
    iconBg: "bg-slate-500/15 text-slate-300",
  },
};

function themeFor(category: string | undefined): CategoryTheme {
  if (!category) return defaultTheme;
  return categoryThemes[category] ?? categoryFallbacks[category] ?? defaultTheme;
}

export function TaskCard({ task, index = 0 }: TaskCardProps) {
  const profiles = task.profiles ?? [];
  const cisCount = (task.cis_refs ?? []).length;
  const theme = themeFor(task.category);
  const CategoryIcon = theme.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.35), duration: 0.22, ease: "easeOut" }}
    >
      <Link
        to="/tasks/$taskId"
        params={{ taskId: task.id }}
        className="group focus-visible:ring-ring relative block h-full overflow-hidden rounded-2xl"
      >
        <div
          className={cn(
            "border-border/70 bg-card relative h-full overflow-hidden rounded-2xl border p-5 ring-1 ring-transparent transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-soft",
            theme.ring,
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 transition-opacity duration-500 group-hover:opacity-100",
              theme.gradient,
            )}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute -right-12 -top-12 size-44 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-90",
              theme.glow,
            )}
            aria-hidden
          />

          <div className="relative space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-white/5",
                    theme.iconBg,
                  )}
                >
                  <CategoryIcon className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-[0.18em]">
                    {task.category ?? "general"}
                  </p>
                  <h3 className="text-foreground text-base font-semibold leading-tight tracking-tight">
                    {task.name}
                  </h3>
                </div>
              </div>
              <ArrowUpRight className="text-muted-foreground group-hover:text-foreground size-4 shrink-0 translate-y-0.5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>

            <p className="text-muted-foreground/90 line-clamp-2 text-sm leading-relaxed">
              {task.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {profiles.map((p) => (
                <Badge key={p} variant="outline" className="rounded-full">
                  {profileLabels[p] ?? p}
                </Badge>
              ))}
              {cisCount > 0 && (
                <Badge variant="muted" className="rounded-full font-mono">
                  {cisCount} CIS
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
