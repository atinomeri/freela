"use client";

import { createContext, useContext, useEffect, useCallback, useMemo, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// SSR-safe mounted check
function subscribe(callback: () => void) {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function themeSubscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  window.addEventListener("freela-theme", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("freela-theme", callback);
  };
}

function getThemeSnapshot(storageKey: string, defaultTheme: Theme) {
  if (typeof window === "undefined") return defaultTheme;

  const stored = localStorage.getItem(storageKey) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return defaultTheme;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "freela-theme",
}: ThemeProviderProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme = useSyncExternalStore(
    themeSubscribe,
    () => getThemeSnapshot(storageKey, defaultTheme),
    () => defaultTheme
  );

  // Apply theme class to document
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (typeof window === "undefined") return;

    localStorage.setItem(storageKey, newTheme);
    window.dispatchEvent(new Event("freela-theme"));
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme,
  }), [theme, setTheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
