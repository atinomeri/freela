"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; errorCode?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.errorCode || "REQUEST_FAILED");
}

export function SupportInboxControls({
  threadId,
  status
}: {
  threadId: string;
  status: "OPEN" | "CLOSED";
}) {
  const t = useTranslations("adminSupport");
  const tErrors = useTranslations("apiErrors");
  const router = useRouter();

  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="grid gap-3">
      {error ? (
        <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">{error}</div>
      ) : null}

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder={t("replyPlaceholder")}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={async () => {
            const text = body.trim();
            if (!text) return;
            setPending(true);
            setError("");
            try {
              await postJson(`/api/admin/support/threads/${encodeURIComponent(threadId)}/messages`, { body: text });
              setBody("");
              router.refresh();
            } catch (e: any) {
              setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? t("sending") : t("send")}
        </Button>

        <Button
          variant="secondary"
          disabled={statusPending}
          onClick={async () => {
            const next = status === "OPEN" ? "CLOSED" : "OPEN";
            setStatusPending(true);
            setError("");
            try {
              await postJson(`/api/admin/support/threads/${encodeURIComponent(threadId)}/status`, { status: next });
              router.refresh();
            } catch (e: any) {
              setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
            } finally {
              setStatusPending(false);
            }
          }}
        >
          {statusPending ? t("updating") : status === "OPEN" ? t("closeThread") : t("reopenThread")}
        </Button>

        <Button variant="secondary" onClick={() => router.refresh()}>
          {t("refresh")}
        </Button>
      </div>
    </div>
  );
}
