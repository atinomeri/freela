"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  approvedAt: string | Date | null;
  createdAt: string | Date;
  reviewer: { id: string; name: string; email: string };
  freelancer: { id: string; name: string; email: string };
  project: { id: string; title: string };
};

function fmtDate(value: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function shortText(value: string, max = 140) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
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

export function ReviewsTable({ initialReviews }: { initialReviews: ReviewRow[] }) {
  const t = useTranslations("adminReviewsTable");
  const tErrors = useTranslations("apiErrors");
  const router = useRouter();

  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter(
      (r) =>
        r.comment?.toLowerCase().includes(q) ||
        r.reviewer.name.toLowerCase().includes(q) ||
        r.freelancer.name.toLowerCase().includes(q) ||
        r.project.title.toLowerCase().includes(q)
    );
  }, [filter, reviews]);

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
        <table className="min-w-[1080px] w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">{t("cols.review")}</th>
              <th className="px-3 py-2">{t("cols.reviewer")}</th>
              <th className="px-3 py-2">{t("cols.freelancer")}</th>
              <th className="px-3 py-2">{t("cols.project")}</th>
              <th className="px-3 py-2">{t("cols.status")}</th>
              <th className="px-3 py-2">{t("cols.created")}</th>
              <th className="px-3 py-2">{t("cols.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const pending = pendingId === r.id;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{"★".repeat(Math.max(1, Math.min(5, r.rating)))}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{shortText(r.comment ?? t("noComment"))}</div>
                    <div className="text-[10px] text-muted-foreground">{r.id}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{r.reviewer.name}</div>
                    <div className="text-[10px] text-muted-foreground">{r.reviewer.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Link className="text-xs underline hover:text-foreground" href={`/freelancers/${r.freelancer.id}`}>
                      {r.freelancer.name}
                    </Link>
                    <div className="text-[10px] text-muted-foreground">{r.freelancer.email}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{r.project.title}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{r.isApproved ? t("approved") : t("pending")}</div>
                    {r.approvedAt ? <div className="text-[10px] text-muted-foreground">{fmtDate(r.approvedAt)}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(r.createdAt)}</td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      onClick={async () => {
                        setPendingId(r.id);
                        setError("");
                        try {
                          const next = !r.isApproved;
                          await postJson(`/api/admin/reviews/${encodeURIComponent(r.id)}/approve`, { isApproved: next });
                          setReviews((prev) =>
                            prev.map((x) =>
                              x.id === r.id ? { ...x, isApproved: next, approvedAt: next ? new Date().toISOString() : null } : x
                            )
                          );
                        } catch (e: unknown) {
                          setError(tErrors(e instanceof Error ? e.message : "REQUEST_FAILED"));
                        } finally {
                          setPendingId(null);
                        }
                      }}
                    >
                      {r.isApproved ? t("hide") : t("approve")}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-muted-foreground" colSpan={7}>
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
