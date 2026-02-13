"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type ProjectRow = {
  id: string;
  title: string;
  city: string;
  isOpen: boolean;
  completedAt: string | Date | null;
  createdAt: string | Date;
  employer: { id: string; name: string; email: string };
};

function fmtDate(value: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

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

export function ProjectsTable({ initialProjects }: { initialProjects: ProjectRow[] }) {
  const t = useTranslations("adminProjectsTable");
  const tErrors = useTranslations("apiErrors");
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectRow[]>(initialProjects);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(q) || p.city.toLowerCase().includes(q));
  }, [filter, projects]);

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("filterPlaceholder")}
          className="max-w-sm"
        />
        <Button variant="secondary" onClick={() => router.refresh()}>
          {t("refresh")}
        </Button>
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">{t("cols.project")}</th>
              <th className="px-3 py-2">{t("cols.employer")}</th>
              <th className="px-3 py-2">{t("cols.status")}</th>
              <th className="px-3 py-2">{t("cols.created")}</th>
              <th className="px-3 py-2">{t("cols.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const pending = pendingId === p.id;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.city}</div>
                    <div className="text-[10px] text-muted-foreground">{p.id}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{p.employer.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.employer.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{p.isOpen ? t("open") : t("closed")}</div>
                    {p.completedAt ? (
                      <div className="text-[10px] text-muted-foreground">
                        {t("completedAt")}: {fmtDate(p.completedAt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(p.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pending}
                        onClick={async () => {
                          setPendingId(p.id);
                          setError("");
                          try {
                            const next = !p.isOpen;
                            await postJson(`/api/admin/projects/${encodeURIComponent(p.id)}/open`, { isOpen: next });
                            setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, isOpen: next } : x)));
                          } catch (e: unknown) {
                            setError(tErrors(e instanceof Error ? e.message : "REQUEST_FAILED"));
                          } finally {
                            setPendingId(null);
                          }
                        }}
                      >
                        {p.isOpen ? t("close") : t("reopen")}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pending || Boolean(p.completedAt)}
                        onClick={async () => {
                          setPendingId(p.id);
                          setError("");
                          try {
                            await postJson(`/api/admin/projects/${encodeURIComponent(p.id)}/complete`, {});
                            setProjects((prev) =>
                              prev.map((x) =>
                                x.id === p.id ? { ...x, completedAt: new Date().toISOString(), isOpen: false } : x
                              )
                            );
                          } catch (e: unknown) {
                            setError(tErrors(e instanceof Error ? e.message : "REQUEST_FAILED"));
                          } finally {
                            setPendingId(null);
                          }
                        }}
                      >
                        {t("markCompleted")}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={async () => {
                          const confirmation = window.prompt(t("deletePrompt", { title: p.title }))?.trim() ?? "";
                          if (confirmation !== p.title.trim()) return;

                          setPendingId(p.id);
                          setError("");
                          try {
                            await postJson(`/api/admin/projects/${encodeURIComponent(p.id)}/delete`, {});
                            setProjects((prev) => prev.filter((x) => x.id !== p.id));
                          } catch (e: unknown) {
                            setError(tErrors(e instanceof Error ? e.message : "REQUEST_FAILED"));
                          } finally {
                            setPendingId(null);
                          }
                        }}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-muted-foreground" colSpan={5}>
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
