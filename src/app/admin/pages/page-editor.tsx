"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

type Locale = "ka" | "en" | "ru";

type ContentValues = Record<Locale, { title: string; body: string }>;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; errorCode?: string; id?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.errorCode || "REQUEST_FAILED");
  return json;
}

export function PageEditor({
  mode,
  pageId,
  initialPath,
  initialContents
}: {
  mode: "create" | "edit";
  pageId: string | null;
  initialPath: string;
  initialContents: ContentValues;
}) {
  const t = useTranslations("adminPageEditor");
  const tErrors = useTranslations("apiErrors");
  const router = useRouter();

  const [path, setPath] = useState(initialPath);
  const [activeLocale, setActiveLocale] = useState<Locale>("ka");
  const [contents, setContents] = useState<ContentValues>(initialContents);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const payload = useMemo(() => ({ path, contents }), [path, contents]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-sm">
          {(["ka", "en", "ru"] as const).map((l) => (
            <button
              key={l}
              type="button"
              className={[
                "rounded-md border px-3 py-1.5",
                l === activeLocale ? "border-primary/40 bg-primary/5" : "border-border bg-background/60 hover:bg-muted/40"
              ].join(" ")}
              onClick={() => setActiveLocale(l)}
            >
              {l.toUpperCase()}
            </button>
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
                if (mode === "create") {
                  const res = await postJson("/api/admin/pages/create", payload);
                  const newId = String((res as any)?.id ?? "");
                  setOk(true);
                  if (newId) router.push(`/admin/pages/${encodeURIComponent(newId)}`);
                  else router.push("/admin/pages");
                } else if (pageId) {
                  await postJson(`/api/admin/pages/${encodeURIComponent(pageId)}/update`, payload);
                  setOk(true);
                }
              } catch (e: any) {
                setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
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
      {ok ? <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{t("saved")}</div> : null}

      <label className="grid gap-1">
        <div className="text-xs text-muted-foreground">{t("pathLabel")}</div>
        <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/help" />
        <div className="text-[11px] text-muted-foreground">{t("pathHint")}</div>
      </label>

      <div className="grid gap-4">
        <label className="grid gap-1">
          <div className="text-xs text-muted-foreground">{t("titleLabel")} ({activeLocale.toUpperCase()})</div>
          <Input
            value={contents[activeLocale].title}
            onChange={(e) =>
              setContents((prev) => ({
                ...prev,
                [activeLocale]: { ...prev[activeLocale], title: e.target.value }
              }))
            }
            placeholder={t("titlePlaceholder")}
          />
        </label>

        <label className="grid gap-1">
          <div className="text-xs text-muted-foreground">{t("bodyLabel")} ({activeLocale.toUpperCase()})</div>
          <Textarea
            value={contents[activeLocale].body}
            onChange={(e) =>
              setContents((prev) => ({
                ...prev,
                [activeLocale]: { ...prev[activeLocale], body: e.target.value }
              }))
            }
            placeholder={t("bodyPlaceholder")}
            rows={12}
          />
          <div className="text-[11px] text-muted-foreground">{t("bodyHint")}</div>
        </label>
      </div>
    </div>
  );
}
