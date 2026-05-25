import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase } from "@/lib/format";

export interface TaskCardData {
  id: string;
  name: string;
  description: string;
  category?: string;
  profiles?: readonly string[];
  capabilities?: readonly string[];
}

interface TaskCardProps {
  task: TaskCardData;
}

const profileLabels: Record<string, string> = {
  "cis-l1": "CIS L1",
  "cis-l2": "CIS L2",
  workstation: "Workstation",
  server: "Server",
};

export function TaskCard({ task }: TaskCardProps) {
  const profiles = task.profiles ?? [];
  const capabilities = task.capabilities ?? [];
  return (
    <Link
      to="/tasks/$taskId"
      params={{ taskId: task.id }}
      className="group focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <Card className="hover:border-accent/50 h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{task.name}</CardTitle>
              <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
                {task.category ?? "general"}
              </CardDescription>
            </div>
            <ChevronRight className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-muted-foreground line-clamp-3 text-sm">{task.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {profiles.map((p) => (
              <Badge key={p} variant="outline">
                {profileLabels[p] ?? p}
              </Badge>
            ))}
            {capabilities.map((c) => (
              <Badge key={c} variant="muted">
                {titleCase(c)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
