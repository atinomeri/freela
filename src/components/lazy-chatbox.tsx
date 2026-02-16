"use client";

import dynamic from "next/dynamic";

const Chatbox = dynamic(() => import("@/components/chatbox").then((m) => m.Chatbox), {
  ssr: false
});

export function LazyChatbox() {
  return <Chatbox />;
}
