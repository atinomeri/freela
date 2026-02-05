"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type Sender = { id: string; name: string };
type Attachment = { id: string; originalName: string; mimeType: string | null; sizeBytes: number };
type Message = {
  id: string;
  body: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  sender: Sender;
  attachments?: Attachment[];
};

function formatBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function MessageThread({
  threadId,
  currentUserId,
  initial
}: {
  threadId: string;
  currentUserId: string;
  initial: Message[];
}) {
  const t = useTranslations("messageThread");
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>(initial);
  const idsRef = useRef<Set<string>>(new Set(initial.map((m) => m.id)));
  const ackBusyRef = useRef(false);
  const ackTimerRef = useRef<number | null>(null);
  const lastMessage = messages[messages.length - 1];
  const lastMessageId = lastMessage?.id ?? "";
  const lastSenderId = lastMessage?.sender.id ?? "";

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    return remaining < 120;
  }, []);

  const ack = useCallback(
    async (opts: { messageIds?: string[]; read?: boolean }) => {
      if (ackBusyRef.current) return;
      ackBusyRef.current = true;
      try {
        await fetch(`/api/threads/${threadId}/ack`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messageIds: opts.messageIds, read: Boolean(opts.read) })
        });
      } catch {
        // ignore
      } finally {
        ackBusyRef.current = false;
      }
    },
    [threadId]
  );

  useEffect(() => {
    // Scroll to bottom on initial load.
    queueMicrotask(() => scrollToBottom("auto"));
  }, [scrollToBottom]);

  // Mark existing messages as read on open.
  useEffect(() => {
    void ack({ read: true });
  }, [ack]);

  useEffect(() => {
    if (!lastSenderId) return;

    // Always scroll for messages sent by the current user.
    if (lastSenderId === currentUserId) {
      queueMicrotask(() => scrollToBottom("smooth"));
      return;
    }

    // For incoming messages, only auto-scroll if the user is already near the bottom.
    if (isNearBottom()) {
      queueMicrotask(() => scrollToBottom("smooth"));
    }
  }, [currentUserId, isNearBottom, lastMessageId, lastSenderId, scrollToBottom]);

  useEffect(() => {
    const es = new EventSource("/api/realtime");

    const onMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { threadId: string; message: Message };
        if (payload.threadId !== threadId) return;
        if (idsRef.current.has(payload.message.id)) return;
        const shouldStick = isNearBottom();
        idsRef.current.add(payload.message.id);
        setMessages((prev) => [...prev, payload.message]);
        if (shouldStick) {
          // Let React paint before scrolling.
          queueMicrotask(() => scrollToBottom("smooth"));
        }

        // Acknowledge delivery/read for incoming messages.
        if (payload.message.sender.id !== currentUserId) {
          const visible = typeof document !== "undefined" && document.visibilityState === "visible";
          void ack({ messageIds: [payload.message.id], read: visible && shouldStick });
        }
      } catch {
        // ignore
      }
    };

    const onStatus = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          threadId: string;
          updates: { id: string; deliveredAt: string | null; readAt: string | null }[];
        };
        if (payload.threadId !== threadId) return;
        if (!Array.isArray(payload.updates) || payload.updates.length === 0) return;
        const map = new Map(payload.updates.map((u) => [u.id, u]));
        setMessages((prev) =>
          prev.map((m) => {
            const u = map.get(m.id);
            if (!u) return m;
            return { ...m, deliveredAt: u.deliveredAt, readAt: u.readAt };
          })
        );
      } catch {
        // ignore
      }
    };

    es.addEventListener("message", onMessage as EventListener);
    es.addEventListener("message_status", onStatus as EventListener);
    es.onerror = () => {
      es.close();
    };

    return () => {
      es.removeEventListener("message", onMessage as EventListener);
      es.removeEventListener("message_status", onStatus as EventListener);
      es.close();
    };
  }, [ack, currentUserId, isNearBottom, scrollToBottom, threadId]);

  return (
    <div
      ref={scrollRef}
      className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1"
      onScroll={() => {
        if (ackTimerRef.current) window.clearTimeout(ackTimerRef.current);
        ackTimerRef.current = window.setTimeout(() => {
          if (isNearBottom() && typeof document !== "undefined" && document.visibilityState === "visible") {
            void ack({ read: true });
          }
        }, 150);
      }}
    >
      {messages.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t("empty")}</div>
      ) : null}

      {messages.map((m) => {
        const mine = m.sender.id === currentUserId;
        const attachments = m.attachments ?? [];
        const statusText = mine
          ? m.readAt
            ? t("status.read")
            : m.deliveredAt
              ? t("status.delivered")
              : t("status.sent")
          : "";
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              <div className="text-xs opacity-80">{m.sender.name}</div>
              {m.body ? <div className="mt-1 whitespace-pre-wrap">{m.body}</div> : null}
              {attachments.length > 0 ? (
                <div className="mt-2 grid gap-1">
                  {attachments.map((a) => (
                    <a
                      key={a.id}
                      href={`/api/files/${a.id}`}
                      className={`rounded-md px-2 py-1 text-xs underline underline-offset-2 ${
                        mine ? "bg-primary-foreground/15 text-primary-foreground" : "bg-background/70 text-foreground"
                      }`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.originalName}
                      {a.sizeBytes ? <span className="ml-2 opacity-70">({formatBytes(a.sizeBytes)})</span> : null}
                    </a>
                  ))}
                </div>
              ) : null}
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-70">
                <span>
                  {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(m.createdAt))}
                </span>
                {statusText ? <span>{statusText}</span> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
