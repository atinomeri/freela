"use client";

import dynamic from "next/dynamic";

type Item = { href: string; label: string };

const MobileNav = dynamic(() => import("@/components/mobile-nav").then((m) => m.MobileNav), {
  ssr: false
});

export function LazyMobileNav({ items }: { items: readonly Item[] }) {
  return <MobileNav items={items} />;
}
