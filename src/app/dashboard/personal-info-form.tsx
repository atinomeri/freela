"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";

type Props = {
  initial: {
    name: string;
    email: string;
    phone: string;
  };
};

export function PersonalInfoForm({ initial }: Props) {
  const t = useTranslations("personalInfoForm");
  const tApiErrors = useTranslations("apiErrors");
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  const validate = () => {
    if (name.trim().length < 2) return t("errors.nameMin");
    return "";
  };

  return (
    <Card className="rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
      <div className="mb-4 text-sm font-semibold">{t("title")}</div>
      {error ? <div className="mb-4 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm">{error}</div> : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{success}</div>
      ) : null}

      <form
        className="grid gap-4"
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
            const res = await fetch("/api/profile/personal", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name, phone })
            });
            const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string } | null;
            if (!res.ok || !json?.ok) {
              setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.saveFailed"));
              setSuccess("");
              return;
            }
            setSuccess(t("saved"));
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="grid gap-1 text-sm">
          {t("name")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-xl border border-border/80 bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("namePlaceholder")}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          {t("email")}
          <input
            value={initial.email}
            disabled
            className="h-10 rounded-xl border border-border/80 bg-muted/50 px-3 text-sm text-muted-foreground outline-none"
          />
          <span className="text-xs text-muted-foreground">{t("emailHint")}</span>
        </label>

        <label className="grid gap-1 text-sm">
          {t("phone")}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 rounded-xl border border-border/80 bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("phonePlaceholder")}
          />
        </label>

        <Button type="submit" size="sm" className="mt-2 rounded-xl" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>
    </Card>
  );
}
