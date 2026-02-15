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
        "relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card",
        "text-muted-foreground shadow-sm transition-all duration-250",
        "hover:-translate-y-0.5 hover:bg-muted/55 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
      title={theme === "light" ? "მუქი თემა" : "ნათელი თემა"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">თემის შეცვლა</span>
    </button>
  );
}
