"use client";
/* eslint-disable react-hooks/set-state-in-effect */
// Page transitions require setState in effects for animation sequencing

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayChildren(children);
      return;
    }

    // Trigger exit animation
    setIsVisible(false);
    
    // Wait for exit animation to complete, then update children and fade in
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsVisible(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname, children]);

  return (
    <div className={isVisible ? "page-enter" : "page-exit"}>
      {displayChildren}
    </div>
  );
}

