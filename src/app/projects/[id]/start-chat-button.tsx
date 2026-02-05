"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function StartChatButton({ projectId }: { projectId: string }) {
  const t = useTranslations("projectStartChat");
  const tApiErrors = useTranslations("apiErrors");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/threads/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; threadId?: string; error?: string; errorCode?: string } | null;
      if (!res.ok || !json?.ok || !json.threadId) {
        setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.createFailed"));
        return;
      }
      router.push(`/dashboard/messages/${json.threadId}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-4">
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      <Button type="button" onClick={start} disabled={pending}>
        {pending ? t("opening") : t("button")}
      </Button>
    </div>
  );
}
