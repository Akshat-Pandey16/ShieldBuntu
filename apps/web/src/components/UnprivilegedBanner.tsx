import { AlertTriangle, Copy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const RESTART_CMD = "sudo make dev-server";

interface UnprivilegedBannerProps {
  daemonUser: string;
}

export function UnprivilegedBanner({ daemonUser }: UnprivilegedBannerProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(RESTART_CMD);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-warning/40 bg-warning/10 text-warning-foreground/90 mb-2 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm"
    >
      <div className="bg-warning/15 text-warning flex size-7 shrink-0 items-center justify-center rounded-full">
        <AlertTriangle className="size-3.5" />
      </div>
      <div className="flex-1 leading-snug">
        <p className="text-foreground font-medium">
          Backend is running as{" "}
          <code className="text-warning bg-warning/10 rounded px-1 font-mono text-xs">
            {daemonUser}
          </code>
          , not root.
        </p>
        <p className="text-muted-foreground text-xs">
          Apply and revert actions will fail with "sudo: a password is required". Restart with{" "}
          <code className="bg-background/40 text-foreground rounded px-1 font-mono text-xs">
            {RESTART_CMD}
          </code>
          .
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void copy()}
        className="border-warning/40 text-warning hover:bg-warning/10"
      >
        <Copy className="size-3.5" />
        {copied ? "Copied" : "Copy command"}
      </Button>
    </motion.div>
  );
}
