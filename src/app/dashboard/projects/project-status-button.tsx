"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type Props = {
  projectId: string;
  isOpen: boolean;
  size?: "md" | "lg";
};

export function ProjectStatusButton({ projectId, isOpen, size = "md" }: Props) {
  const t = useTranslations("dashboardProjectStatus");
  const tApiErrors = useTranslations("apiErrors");
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const nextIsOpen = !isOpen;

  const act = () => {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isOpen: nextIsOpen })
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
    <div className="w-full">
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      <Button
        type="button"
        size={size}
        variant={isOpen ? "secondary" : "primary"}
        className="rounded-xl"
        disabled={pending}
        onClick={act}
      >
        {pending ? t("updating") : isOpen ? t("cancel") : t("restore")}
      </Button>
    </div>
  );
}

