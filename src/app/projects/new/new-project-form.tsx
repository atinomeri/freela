"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FREELANCER_CATEGORIES, isFreelancerCategory } from "@/lib/categories";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type FormState = {
  category: string;
  title: string;
  description: string;
  budgetGEL: string;
};

export function NewProjectForm() {
  const t = useTranslations("newProjectForm");
  const tApiErrors = useTranslations("apiErrors");
  const tCategories = useTranslations("categories");
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ category: "", title: "", description: "", budgetGEL: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const budgetDigits = useMemo(() => form.budgetGEL.trim().replace(/[^\d]/g, ""), [form.budgetGEL]);

  const validateError = useMemo(() => {
    if (!isFreelancerCategory(form.category)) return t("errors.categoryRequired");
    if (form.title.trim().length < 5) return t("errors.titleMin");
    if (form.description.trim().length < 20) return t("errors.descriptionMin");
    if (form.budgetGEL.trim() !== "" && budgetDigits !== form.budgetGEL.trim()) return t("errors.budgetNumeric");
    return "";
  }, [budgetDigits, form.budgetGEL, form.category, form.description, form.title, t]);

  const canSubmit = validateError === "";

  return (
    <Card className="mt-6 rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
      {error ? (
        <div className="mb-4 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm">{error}</div>
      ) : null}

      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (validateError) {
            setError(validateError);
            return;
          }
          setError("");
          setPending(true);
          try {
            const res = await fetch("/api/projects", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                category: form.category,
                title: form.title,
                description: form.description,
                budgetGEL: form.budgetGEL
              })
            });
            const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string } | null;
            if (!res.ok || !json?.ok) {
              setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.createFailed"));
              return;
            }
            router.push("/dashboard/projects");
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("category")}</span>
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            className="h-10 rounded-xl border border-border/80 bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            required
          >
            <option value="">{t("categoryPlaceholder")}</option>
            {FREELANCER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {tCategories(c.value)}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">{t("requiredHint")}</span>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("title")}</span>
          <Input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder={t("titlePlaceholder")}
            required
          />
          <span className="text-xs text-muted-foreground">{t("titleHint")}</span>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("description")}</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="min-h-36 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/30"
            placeholder={t("descriptionPlaceholder")}
            required
          />
          <span className="text-xs text-muted-foreground">{t("descriptionHint")}</span>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("budget")}</span>
          <Input
            value={form.budgetGEL}
            onChange={(e) => setForm((p) => ({ ...p, budgetGEL: e.target.value }))}
            placeholder={t("budgetPlaceholder")}
            inputMode="numeric"
          />
          <span className="text-xs text-muted-foreground">{t("optionalHint")}</span>
        </label>

        <Button type="submit" size="sm" className="mt-2 rounded-xl" disabled={pending || !canSubmit}>
          {pending ? t("sending") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}
