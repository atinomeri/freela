"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

const LOCALES = ["ka", "en", "ru"] as const;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; errorCode?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.errorCode || "REQUEST_FAILED");
}

export function PageContentEditor({
  keys,
  initialValuesByLocale,
  defaultValuesByLocale
}: {
  keys: string[];
  initialValuesByLocale: Record<"ka" | "en" | "ru", Record<string, string>>;
  defaultValuesByLocale: Record<"ka" | "en" | "ru", Record<string, string>>;
}) {
  const t = useTranslations("adminPageContent");
  const tErrors = useTranslations("apiErrors");
  const router = useRouter();

  const [valuesByLocale, setValuesByLocale] = useState<Record<"ka" | "en" | "ru", Record<string, string>>>(
    initialValuesByLocale
  );
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const visibleKeys = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter((k) => k.toLowerCase().includes(q));
  }, [filter, keys]);

  const updates = useMemo(
    () =>
      visibleKeys.flatMap((key) =>
        LOCALES.map((locale) => ({
          key,
          locale,
          value: valuesByLocale[locale]?.[key] ?? ""
        }))
      ),
    [valuesByLocale, visibleKeys]
  );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {LOCALES.map((locale) => (
            <span key={locale} className="rounded-md border border-primary/25 bg-primary/5 px-2.5 py-1">
              {locale.toUpperCase()}
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.refresh()}>
            {t("refresh")}
          </Button>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError("");
              setOk(false);
              try {
                await postJson("/api/admin/content", {
                  updates
                });
                setOk(true);
              } catch (e: unknown) {
                setError(tErrors(e instanceof Error ? e.message : "REQUEST_FAILED"));
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>

      <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("filterPlaceholder")} />

      {error ? (
        <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">{error}</div>
      ) : null}
      {ok ? <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{t("saved")}</div> : null}

      <div className="grid gap-4">
        {visibleKeys.map((k) => (
          <div key={k} className="grid gap-3 rounded-lg border border-border bg-background/50 p-3">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="grid gap-3 md:grid-cols-3">
              {LOCALES.map((locale) => (
                <label key={`${k}:${locale}`} className="grid gap-1">
                  <div className="text-[11px] font-semibold text-muted-foreground">{locale.toUpperCase()}</div>
                  {defaultValuesByLocale[locale]?.[k] ? (
                    <div className="rounded border border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
                      {defaultValuesByLocale[locale][k]}
                    </div>
                  ) : null}
                  <Textarea
                    value={valuesByLocale[locale]?.[k] ?? ""}
                    onChange={(e) =>
                      setValuesByLocale((prev) => ({
                        ...prev,
                        [locale]: { ...(prev[locale] ?? {}), [k]: e.target.value }
                      }))
                    }
                    placeholder={defaultValuesByLocale[locale]?.[k] || t("emptyPlaceholder")}
                    rows={3}
                  />
                </label>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground">{t("emptyHint")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
