"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function CompleteProjectButton({ projectId, disabled }: { projectId: string; disabled?: boolean }) {
  const t = useTranslations("dashboardProjectDetail");
  const tApiErrors = useTranslations("apiErrors");
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const act = () => {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/complete`, { method: "PATCH" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.completeFailed"));
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="w-full">
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      <Button type="button" disabled={disabled || pending} onClick={act}>
        {pending ? t("completing") : t("complete")}
      </Button>
    </div>
  );
}

