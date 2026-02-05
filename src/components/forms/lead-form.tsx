"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type LeadState = { ok: boolean; message: string } | null;

type Props = {
  title: string;
  description?: string;
  submitLabel: string;
  action: (prevState: LeadState, formData: FormData) => Promise<LeadState>;
  className?: string;
};

export function LeadForm({ title, description, submitLabel, action, className }: Props) {
  const t = useTranslations("leadForm");
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className={cn(className)}>
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}

      {state ? (
        <div
          className={cn(
            "mt-4 rounded-lg border px-3 py-2 text-sm",
            state.ok ? "border-primary/30 bg-primary/5" : "border-border bg-background/60"
          )}
        >
          {state.message}
        </div>
      ) : null}

      <form className="mt-5 grid gap-3" action={formAction}>
        <label className="grid gap-1 text-sm">
          {t("name")}
          <input
            name="name"
            className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("namePlaceholder")}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("email")}
          <input
            name="email"
            type="email"
            className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="name@company.com"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          {t("message")}
          <textarea
            name="message"
            className="min-h-28 rounded-lg border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("messagePlaceholder")}
            required
          />
        </label>
        <Button type="submit" className="mt-1" disabled={pending}>
          {pending ? t("sending") : submitLabel}
        </Button>
      </form>
    </div>
  );
}
