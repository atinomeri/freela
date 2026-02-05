"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function StartChatButton({
  projectId,
  freelancerId
}: {
  projectId: string;
  freelancerId: string;
}) {
  const t = useTranslations("dashboardStartChat");
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
        body: JSON.stringify({ projectId, freelancerId })
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
    <div className="mt-3">
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      <Button type="button" size="md" variant="secondary" disabled={pending} onClick={start}>
        {pending ? t("opening") : t("button")}
      </Button>
    </div>
  );
}
