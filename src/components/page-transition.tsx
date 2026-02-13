"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    setAnimate(true);

    const timer = window.setTimeout(() => {
      setAnimate(false);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div className={animate ? "motion-safe:animate-page-in" : undefined}>
      {children}
    </div>
  );
}

