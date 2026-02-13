"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; errorCode?: string; error?: string } | null;
  if (!res.ok || !json?.ok) {
    const errorCode = json?.errorCode || "REQUEST_FAILED";
    throw new Error(errorCode);
  }
}

export function ContactContentEditor({
  locale,
  keys,
  initialValues
}: {
  locale: "ka" | "en" | "ru";
  keys: string[];
  initialValues: Record<string, string>;
}) {
  const t = useTranslations("adminContentContact");
  const tErrors = useTranslations("apiErrors");
  const router = useRouter();

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const items = useMemo(() => keys.map((k) => ({ key: k, value: values[k] ?? "" })), [keys, values]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          {(["ka", "en", "ru"] as const).map((l) => (
            <a
              key={l}
              className={[
                "rounded-md border px-3 py-1.5",
                l === locale ? "border-primary/40 bg-primary/5" : "border-border bg-background/60 hover:bg-muted/40"
              ].join(" ")}
              href={`/admin/content/contact?locale=${l}`}
            >
              {l.toUpperCase()}
            </a>
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
                  locale,
                  items: items.map((it) => ({ key: it.key, value: it.value }))
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

      {error ? (
        <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{t("saved")}</div>
      ) : null}

      <div className="grid gap-4">
        {keys.map((k) => (
          <label key={k} className="grid gap-1">
            <div className="text-xs text-muted-foreground">{k}</div>
            <Textarea
              value={values[k] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [k]: e.target.value }))}
              placeholder={t("emptyPlaceholder")}
              rows={2}
            />
            <div className="text-[11px] text-muted-foreground">{t("emptyHint")}</div>
          </label>
        ))}
      </div>
    </div>
  );
}

