"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function ApplyForm({ projectId }: { projectId: string }) {
  const t = useTranslations("projectApplyForm");
  const tApiErrors = useTranslations("apiErrors");
  const [message, setMessage] = useState("");
  const [priceGEL, setPriceGEL] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  const validate = () => {
    if (message.trim().length < 20) return t("errors.messageMin");
    if (priceGEL.trim() !== "" && !/^\d+$/.test(priceGEL.trim())) return t("errors.priceNumeric");
    return "";
  };

  return (
    <Card className="p-6">
      {error ? <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">{error}</div> : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{success}</div>
      ) : null}
      <form
        className="grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const err = validate();
          if (err) {
            setError(err);
            setSuccess("");
            return;
          }
          setError("");
          setPending(true);
          try {
            const res = await fetch(`/api/projects/${projectId}/apply`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ message, priceGEL })
            });
            const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string } | null;
            if (!res.ok || !json?.ok) {
              setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.sendFailed"));
              setSuccess("");
              return;
            }
            setSuccess(t("success"));
            setMessage("");
            setPriceGEL("");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="grid gap-1 text-sm">
          {t("message")}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-28 rounded-lg border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("messagePlaceholder")}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("price")}
          <input
            value={priceGEL}
            onChange={(e) => setPriceGEL(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("pricePlaceholder")}
            inputMode="numeric"
          />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? t("sending") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}
