import { useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const RESTART_CMD = "sudo make sudo-server";

interface UnprivilegedBannerProps {
  daemonUser: string;
}

export function UnprivilegedBanner({ daemonUser }: UnprivilegedBannerProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(RESTART_CMD);
      setCopied(true);
      toast.success("Command copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="border-warning/40 from-warning/12 to-warning/4 relative flex flex-wrap items-center gap-3 overflow-hidden rounded-2xl border bg-gradient-to-r px-5 py-4 text-sm"
    >
      <div className="bg-warning/20 text-warning flex size-9 shrink-0 items-center justify-center rounded-xl">
        <AlertTriangle className="size-4" />
      </div>
      <div className="flex-1 leading-snug">
        <p className="text-foreground font-medium">
          Daemon is running as{" "}
          <code className="text-warning bg-warning/15 rounded px-1.5 font-mono text-xs">
            {daemonUser}
          </code>
          , not root.
        </p>
        <p className="text-muted-foreground text-xs">
          Apply/revert will fail until you restart with elevated privileges:{" "}
          <code className="text-foreground bg-background/60 rounded px-1.5 font-mono text-xs">
            {RESTART_CMD}
          </code>
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void copy()}
        className="border-warning/40 text-warning hover:bg-warning/10 hover:text-warning"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </motion.div>
  );
}
