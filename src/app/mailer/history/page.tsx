"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/spinner";
import { ConfirmModal } from "@/components/ui/modal";
import { MailerLoginPage } from "../login-page";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  History,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { formatGeorgianDateTime } from "@/lib/date";

interface CampaignHistoryItem {
  id: string;
  name: string;
  subject: string;
  status: string;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface ApiErrorShape {
  error?: string | { message?: string };
  message?: string;
}

const STATUS_BADGE: Record<
  string,
  { variant: "default" | "success" | "warning" | "destructive" | "secondary"; labelKey: string }
> = {
  DRAFT: { variant: "secondary", labelKey: "campaigns.status.draft" },
  QUEUED: { variant: "default", labelKey: "campaigns.status.queued" },
  SENDING: { variant: "warning", labelKey: "campaigns.status.sending" },
  PAUSED: { variant: "secondary", labelKey: "campaigns.status.paused" },
  COMPLETED: { variant: "success", labelKey: "campaigns.status.completed" },
  FAILED: { variant: "destructive", labelKey: "campaigns.status.failed" },
};

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = /filename="?([^"]+)"?/i.exec(header);
  return plainMatch?.[1] ?? null;
}

export default function MailerHistoryPage() {
  const { user, apiFetch } = useMailerAuth();
  const t = useTranslations("mailer");

  const [items, setItems] = useState<CampaignHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadHistory = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/api/desktop/campaigns?page=${nextPage}&limit=20`);
        if (!res.ok) {
          throw new Error(t("errors.historyLoadFailed"));
        }
        const body = (await res.json()) as {
          data: CampaignHistoryItem[];
          meta?: Pagination;
          pagination?: Pagination;
        };
        setItems(body.data ?? []);
        const meta = body.meta ?? body.pagination;
        if (meta) {
          setPagination({
            page: Number(meta.page ?? nextPage),
            pageSize: Number(meta.pageSize ?? 20),
            total: Number(meta.total ?? 0),
            hasMore: Boolean(meta.hasMore),
          });
        } else {
          setPagination(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.historyLoadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, t],
  );

  useEffect(() => {
    if (!user) return;
    void loadHistory(page);
  }, [user, page, loadHistory]);

  if (!user) return <MailerLoginPage />;

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      const res = await apiFetch("/api/desktop/campaigns/history/export?format=csv&limit=10000");
      if (!res.ok) {
        throw new Error(t("errors.historyExportFailed"));
      }

      const blob = await res.blob();
      const filename =
        parseContentDispositionFilename(res.headers.get("content-disposition")) ??
        "campaign_history.csv";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.historyExportFailed"));
    } finally {
      setExporting(false);
    }
  }

  function getApiError(body: ApiErrorShape | null, fallback: string): string {
    const apiError = body?.error;
    if (typeof apiError === "string") return apiError;
    if (typeof apiError?.message === "string") return apiError.message;
    if (typeof body?.message === "string") return body.message;
    return fallback;
  }

  async function handleDeleteHistory() {
    if (!deleteId) return;
    setDeleting(true);
    setError("");

    try {
      const res = await apiFetch(`/api/desktop/campaigns/${deleteId}/history`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => null)) as ApiErrorShape | null;
        throw new Error(getApiError(body, t("errors.historyDeleteFailed")));
      }
      setDeleteId(null);
      await loadHistory(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.historyDeleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("history.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("history.description")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
          <Download className="h-4 w-4" />
          {t("actions.exportCsv")}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <PageSpinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<History className="h-12 w-12" />}
          title={t("history.emptyTitle")}
          description={t("history.emptyDescription")}
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((campaign) => {
              const badge = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.DRAFT;
              const active = campaign.status === "SENDING" || campaign.status === "QUEUED";
              return (
                <Card key={campaign.id} className="p-4" hover={false}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/mailer/campaigns/${campaign.id}`} className="truncate font-medium hover:underline">
                          {campaign.name}
                        </Link>
                        <Badge variant={badge.variant} size="sm" dot>
                          {t(badge.labelKey)}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{campaign.subject}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("history.statsLine", {
                          sent: campaign.sentCount,
                          failed: campaign.failedCount,
                          total: campaign.totalCount,
                        })}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("history.createdAt")}: {formatGeorgianDateTime(campaign.createdAt)}
                        {campaign.completedAt
                          ? ` · ${t("history.completedAt")}: ${formatGeorgianDateTime(campaign.completedAt)}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      {campaign.failedCount > 0 && (
                        <ButtonLink href={`/mailer/campaigns/${campaign.id}`} variant="outline" size="sm">
                          <RotateCcw className="h-4 w-4" />
                          {t("actions.retryFailed")}
                        </ButtonLink>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={active}
                        onClick={() => setDeleteId(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {pagination && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("campaigns.pageInfo", { page, pages: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteHistory}
        title={t("history.deleteTitle")}
        description={t("history.deleteDescription")}
        confirmText={t("actions.delete")}
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
