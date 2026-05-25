import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

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

const categoryHues: Record<string, string> = {
  network: "from-cyan-500/15 to-cyan-500/0",
  ssh: "from-violet-500/15 to-violet-500/0",
  kernel: "from-amber-500/15 to-amber-500/0",
  lsm: "from-rose-500/15 to-rose-500/0",
  audit: "from-blue-500/15 to-blue-500/0",
  updates: "from-emerald-500/15 to-emerald-500/0",
  "malware-scanner": "from-orange-500/15 to-orange-500/0",
  "intrusion-prevention": "from-fuchsia-500/15 to-fuchsia-500/0",
  bootloader: "from-pink-500/15 to-pink-500/0",
  filesystem: "from-indigo-500/15 to-indigo-500/0",
  session: "from-teal-500/15 to-teal-500/0",
  auth: "from-sky-500/15 to-sky-500/0",
  packages: "from-yellow-500/15 to-yellow-500/0",
  peripherals: "from-lime-500/15 to-lime-500/0",
};

export function TaskCard({ task, index = 0 }: TaskCardProps) {
  const profiles = task.profiles ?? [];
  const cisCount = (task.cis_refs ?? []).length;
  const hue = categoryHues[task.category ?? ""] ?? "from-accent/15 to-accent/0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.4), duration: 0.25, ease: "easeOut" }}
    >
      <Link
        to="/tasks/$taskId"
        params={{ taskId: task.id }}
        className="group focus-visible:ring-ring relative block overflow-hidden rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <div
          className={cn(
            "border-border bg-card hover:border-border-strong hover:shadow-xl h-full rounded-xl border p-5 transition-all duration-200 group-hover:-translate-y-0.5",
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b opacity-60",
              hue,
            )}
            aria-hidden
          />
          <div className="relative space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-widest">
                  {task.category ?? "general"}
                </p>
                <h3 className="text-foreground text-base font-semibold leading-tight tracking-tight">
                  {task.name}
                </h3>
              </div>
              <ArrowUpRight className="text-muted-foreground group-hover:text-accent size-4 shrink-0 transition-colors" />
            </div>

            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {task.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {profiles.map((p) => (
                <Badge key={p} variant="outline">
                  {profileLabels[p] ?? p}
                </Badge>
              ))}
              {cisCount > 0 && (
                <Badge variant="muted" className="font-mono">
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
