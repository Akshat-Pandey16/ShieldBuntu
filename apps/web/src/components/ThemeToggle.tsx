import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const items = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const ActiveIcon = resolvedTheme === "light" ? Sun : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Theme"
          className="hover:bg-secondary/70 rounded-full"
        >
          <ActiveIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-strong w-40">
        {items.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            data-active={theme === value}
            className="data-[active=true]:bg-brand/15 data-[active=true]:text-brand cursor-pointer"
          >
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
