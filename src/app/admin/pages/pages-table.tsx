"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type PageRow = {
  id: string | null;
  path: string;
  kind: "builtin" | "custom";
  isEnabled: boolean;
  updatedAt: string | null;
  titlePreview: string | null;
};

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; errorCode?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.errorCode || "REQUEST_FAILED");
  return json as any;
}

function fmtDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function PagesTable({ initialPages }: { initialPages: PageRow[] }) {
  const t = useTranslations("adminPages");
  const tErrors = useTranslations("apiErrors");
  const router = useRouter();

  const [pages, setPages] = useState<PageRow[]>(initialPages);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [error, setError] = useState("");

  const sorted = useMemo(() => {
    const builtins = pages.filter((p) => p.kind === "builtin").sort((a, b) => a.path.localeCompare(b.path));
    const custom = pages
      .filter((p) => p.kind === "custom")
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "") || a.path.localeCompare(b.path));
    return [...builtins, ...custom];
  }, [pages]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.refresh()}>
            {t("refresh")}
          </Button>
          <Button onClick={() => router.push("/admin/pages/new")}>{t("newPage")}</Button>
        </div>
        {error ? <div className="text-sm text-foreground">{error}</div> : null}
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">{t("cols.path")}</th>
              <th className="px-3 py-2">{t("cols.type")}</th>
              <th className="px-3 py-2">{t("cols.enabled")}</th>
              <th className="px-3 py-2">{t("cols.updated")}</th>
              <th className="px-3 py-2">{t("cols.title")}</th>
              <th className="px-3 py-2">{t("cols.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const pending = pendingPath === p.path;
              const editLink =
                p.kind === "custom" && p.id
                  ? `/admin/pages/${encodeURIComponent(p.id)}`
                  : `/admin/pages/edit?path=${encodeURIComponent(p.path)}`;
              return (
                <tr key={`${p.kind}:${p.path}`} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">{p.path}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{p.kind === "builtin" ? t("builtin") : t("custom")}</td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant={p.isEnabled ? "secondary" : "destructive"}
                      disabled={pending}
                      onClick={async () => {
                        setPendingPath(p.path);
                        setError("");
                        try {
                          const nextEnabled = !p.isEnabled;
                          await postJson("/api/admin/pages/toggle", { path: p.path, isEnabled: nextEnabled });
                          setPages((prev) => prev.map((x) => (x.path === p.path ? { ...x, isEnabled: nextEnabled } : x)));
                        } catch (e: any) {
                          setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
                        } finally {
                          setPendingPath(null);
                        }
                      }}
                    >
                      {p.isEnabled ? t("disable") : t("enable")}
                    </Button>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(p.updatedAt)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <div className="line-clamp-1 max-w-[360px]">{p.titlePreview || ""}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {editLink ? (
                        <Button size="sm" variant="secondary" onClick={() => router.push(editLink)}>
                          {t("edit")}
                        </Button>
                      ) : null}

                      {p.kind === "custom" && p.id ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={async () => {
                            const id = p.id;
                            if (!id) return;
                            const confirm = window.prompt(t("deletePrompt", { path: p.path })) ?? "";
                            if (confirm.trim() !== p.path) return;
                            setPendingPath(p.path);
                            setError("");
                            try {
                              await postJson(`/api/admin/pages/${encodeURIComponent(id)}/delete`, {});
                              setPages((prev) => prev.filter((x) => x.path !== p.path));
                            } catch (e: any) {
                              setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
                            } finally {
                              setPendingPath(null);
                            }
                          }}
                        >
                          {t("delete")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                  {t("empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
