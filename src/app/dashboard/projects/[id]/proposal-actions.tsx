"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

type Props = {
  proposalId: string;
  disabled: boolean;
};

export function ProposalActions({ proposalId, disabled }: Props) {
  const t = useTranslations("dashboardProposalActions");
  const tApiErrors = useTranslations("apiErrors");
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const act = (status: "ACCEPTED" | "REJECTED") => {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.updateFailed"));
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-3">
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="rounded-xl" disabled={disabled || pending} onClick={() => act("ACCEPTED")}>
          {t("accept")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-xl"
          variant="secondary"
          disabled={disabled || pending}
          onClick={() => act("REJECTED")}
        >
          {t("reject")}
        </Button>
      </div>
    </div>
  );
}
