"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type Props = {
  projectId: string;
  freelancerId: string;
  freelancerName: string;
};

export function ReviewForm({ projectId, freelancerId, freelancerName }: Props) {
  const t = useTranslations("reviewForm");
  const tApiErrors = useTranslations("apiErrors");
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  const isValid = useMemo(() => {
    const r = Number.parseInt(rating, 10);
    return Number.isFinite(r) && r >= 1 && r <= 5 && comment.trim().length <= 1000;
  }, [rating, comment]);

  const submit = () => {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, freelancerId, rating: Number.parseInt(rating, 10), comment })
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.submitFailed"));
        return;
      }
      setSuccess(t("success", { name: freelancerName }));
      router.refresh();
    });
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
      <div className="text-xs font-medium text-muted-foreground">{t("title")}</div>
      <div className="mt-3 grid gap-3">
        {error ? <div className="text-xs text-destructive">{error}</div> : null}
        {success ? <div className="text-xs text-primary">{success}</div> : null}

        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">{t("rating")}</span>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">{t("comment")}</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-20 w-full rounded-lg border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("commentPlaceholder")}
          />
          <div className="text-xs text-muted-foreground">{t("commentHint")}</div>
        </label>

        <Button type="button" variant="secondary" disabled={!isValid || pending} onClick={submit}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  );
}

