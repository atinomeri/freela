"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "system";
  text: string;
  createdAt: number;
};

const STORAGE_KEY = "freela-chatbox-messages";

function nowId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function safeParseMessages(raw: string | null): ChatMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m): m is ChatMessage => {
        if (!m || typeof m !== "object") return false;
        const anyM = m as any;
        return (
          (anyM.role === "user" || anyM.role === "system") &&
          typeof anyM.text === "string" &&
          typeof anyM.createdAt === "number"
        );
      })
      .slice(-50);
  } catch {
    return [];
  }
}

export function Chatbox() {
  const t = useTranslations("chatbox");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    safeParseMessages(typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY))
  );
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const intro = useMemo<ChatMessage>(
    () => ({ id: "intro", role: "system", text: t("intro", { email: site.supportEmail }), createdAt: 0 }),
    [t]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, messages.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const allMessages = messages.length > 0 ? [intro, ...messages] : [intro];

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {open ? (
        <div
          className={cn(
            "w-[320px] overflow-hidden rounded-2xl border border-border bg-background shadow-lg",
            "sm:w-[360px]"
          )}
          role="dialog"
          aria-label={t("title")}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{t("title")}</div>
              <div className="truncate text-xs text-muted-foreground">{t("subtitle")}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="max-h-[360px] overflow-auto px-4 py-3">
            <div className="grid gap-2">
              {allMessages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted text-foreground"
                  )}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">{t("disclaimer")}</div>
          </div>

          <form
            className="flex items-center gap-2 border-t border-border px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text) return;
              setInput("");
              setMessages((prev) => [
                ...prev,
                { id: nowId(), role: "user", text, createdAt: Date.now() },
                { id: nowId(), role: "system", text: t("autoReply", { email: site.supportEmail }), createdAt: Date.now() }
              ]);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              placeholder={t("placeholder")}
              maxLength={500}
              aria-label={t("placeholder")}
            />
            <button
              type="submit"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={!input.trim()}
              aria-label={t("send")}
              title={t("send")}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
          aria-label={t("open")}
          title={t("open")}
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
