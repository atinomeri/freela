"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps the main site header/footer chrome.
 * Hidden on /mailer routes which have their own layout shell.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/mailer")) return null;
  return <>{children}</>;
}
