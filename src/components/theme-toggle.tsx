"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/70",
        "text-muted-foreground shadow-sm backdrop-blur-sm transition-colors",
        "hover:bg-background hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
      title={theme === "light" ? "მუქი თემა" : "ნათელი თემა"}
    >
      {theme === "dark" ? (
        <Sun className="h-[18px] w-[18px]" />
      ) : (
        <Moon className="h-[18px] w-[18px]" />
      )}
      <span className="sr-only">თემის შეცვლა</span>
    </button>
  );
}
