"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderRole: "VISITOR" | "USER" | "ADMIN";
  mine: boolean;
};

const STORAGE_THREAD_KEY = "freela-chatbox-thread-id";
const STORAGE_TOKEN_KEY = "freela-chatbox-visitor-token";
const LEGACY_STORAGE_MESSAGES_KEY = "freela-chatbox-messages";

function generateVisitorToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${crypto.randomUUID()}_${Date.now().toString(36)}`;
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export function Chatbox() {
  const t = useTranslations("chatbox");
  const tErrors = useTranslations("apiErrors");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(STORAGE_THREAD_KEY) ?? ""
  );
  const [visitorToken, setVisitorToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const stored = window.localStorage.getItem(STORAGE_TOKEN_KEY);
    return stored || generateVisitorToken();
  });
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const intro = useMemo(
    () => ({ id: "intro", role: "system" as const, text: t("intro", { email: site.supportEmail }) }),
    [t]
  );

  useEffect(() => {
    try {
      if (!visitorToken) return;
      window.localStorage.setItem(STORAGE_TOKEN_KEY, visitorToken);
    } catch {
      // ignore
    }
  }, [visitorToken]);

  useEffect(() => {
    try {
      if (threadId) {
        window.localStorage.setItem(STORAGE_THREAD_KEY, threadId);
      } else {
        window.localStorage.removeItem(STORAGE_THREAD_KEY);
      }
    } catch {
      // ignore
    }
  }, [threadId]);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_MESSAGES_KEY);
    } catch {
      // ignore
    }
  }, []);

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

  const loadMessages = useCallback(async () => {
    if (!visitorToken && !threadId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (threadId) params.set("threadId", threadId);
      if (visitorToken) params.set("token", visitorToken);
      const res = await fetch(`/api/support/chat?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; errorCode?: string; threadId?: string | null; messages?: ChatMessage[] }
        | null;
      if (!res.ok || !json?.ok) throw new Error(json?.errorCode || "REQUEST_FAILED");
      const nextThreadId = String(json?.threadId ?? "");
      setThreadId(nextThreadId);
      setMessages(Array.isArray(json?.messages) ? json.messages : []);
      setError("");
    } catch (e: unknown) {
      setError(tErrors(e instanceof Error ? e.message : "REQUEST_FAILED"));
    } finally {
      setLoading(false);
    }
  }, [threadId, tErrors, visitorToken]);

  useEffect(() => {
    if (!open) return;
    void loadMessages();
  }, [loadMessages, open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => {
      void loadMessages();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadMessages, open]);

  const renderMessages = useMemo(
    () => [
      intro,
      ...messages.map((m) => ({
        id: m.id,
        role: "chat" as const,
        text: m.body,
        mine: m.mine
      }))
    ],
    [intro, messages]
  );

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
            {error ? (
              <div className="mb-2 rounded-lg border border-border bg-background/60 px-2 py-1 text-xs text-foreground">{error}</div>
            ) : null}
            {loading ? <div className="mb-2 text-xs text-muted-foreground">{t("loading")}</div> : null}
            <div className="grid gap-2">
              {renderMessages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "system"
                      ? "mr-auto bg-muted text-foreground"
                      : m.mine
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto bg-muted text-foreground"
                  )}
                >
                  {m.text}
                </div>
              ))}
            </div>
            {t("disclaimer").trim() ? (
              <div className="mt-3 text-xs text-muted-foreground">{t("disclaimer")}</div>
            ) : null}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              const text = input.trim();
              if (!text) return;
              setPending(true);
              setError("");
              void (async () => {
                try {
                  const res = await fetch("/api/support/chat", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      threadId: threadId || undefined,
                      token: visitorToken || undefined,
                      body: text
                    })
                  });
                  const json = (await res.json().catch(() => null)) as
                    | { ok?: boolean; errorCode?: string; threadId?: string; messages?: ChatMessage[] }
                    | null;
                  if (!res.ok || !json?.ok) throw new Error(json?.errorCode || "REQUEST_FAILED");
                  setThreadId(String(json?.threadId ?? ""));
                  setMessages(Array.isArray(json?.messages) ? json.messages : []);
                  setInput("");
                } catch (e: unknown) {
                  setError(tErrors(e instanceof Error ? e.message : "REQUEST_FAILED"));
                } finally {
                  setPending(false);
                }
              })();
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
              disabled={!input.trim() || pending}
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
