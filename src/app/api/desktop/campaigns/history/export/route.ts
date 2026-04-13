import { prisma } from "@/lib/prisma";
import { requireDesktopAuth } from "@/lib/desktop-auth";
import { errors, success } from "@/lib/api-response";

const CSV_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function csvSafe(value: string): string {
  if (!value) return "";
  return CSV_INJECTION_PREFIXES.some((prefix) => value.startsWith(prefix))
    ? `'${value}`
    : value;
}

function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function durationSeconds(startedAt: Date | null, completedAt: Date | null): number {
  if (!startedAt || !completedAt) return 0;
  return Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
}

export async function GET(req: Request) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;

    const url = new URL(req.url);
    const format = (url.searchParams.get("format") || "csv").toLowerCase();
    const limitRaw = Number(url.searchParams.get("limit") || 10000);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(10000, Math.trunc(limitRaw)))
      : 10000;

    const campaigns = await prisma.campaign.findMany({
      where: { desktopUserId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        subject: true,
        totalCount: true,
        sentCount: true,
        failedCount: true,
        startedAt: true,
        completedAt: true,
      },
    });

    const campaignIds = campaigns.map((item) => item.id);
    const eventRows =
      campaignIds.length > 0
        ? await prisma.emailTrackingEvent.findMany({
            where: {
              campaignId: { in: campaignIds },
              eventType: { in: ["OPEN", "CLICK"] },
            },
            select: {
              campaignId: true,
              eventType: true,
              emailHash: true,
            },
          })
        : [];

    const openedMap = new Map<string, Set<string>>();
    const clickedMap = new Map<string, Set<string>>();
    for (const row of eventRows) {
      if (!row.campaignId || !row.emailHash) continue;
      if (row.eventType === "OPEN") {
        const set = openedMap.get(row.campaignId) ?? new Set<string>();
        set.add(row.emailHash);
        openedMap.set(row.campaignId, set);
      } else if (row.eventType === "CLICK") {
        const set = clickedMap.get(row.campaignId) ?? new Set<string>();
        set.add(row.emailHash);
        clickedMap.set(row.campaignId, set);
      }
    }

    const unsubscribedRows = await prisma.unsubscribedEmail.findMany({
      where: {
        desktopUserId: auth.user.id,
        source: { not: "bounce" },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const rows = campaigns.map((campaign) => {
      const opened = openedMap.get(campaign.id)?.size ?? 0;
      const clicked = clickedMap.get(campaign.id)?.size ?? 0;
      const bounced = campaign.failedCount;
      const unsubscribed =
        campaign.startedAt == null
          ? 0
          : unsubscribedRows.filter((row) => {
              const created = row.createdAt.getTime();
              const start = campaign.startedAt!.getTime();
              const end = (campaign.completedAt ?? new Date()).getTime();
              return created >= start && created <= end;
            }).length;
      const openRate =
        campaign.sentCount > 0
          ? Number(((opened / campaign.sentCount) * 100).toFixed(2))
          : 0;
      const clickRate =
        campaign.sentCount > 0
          ? Number(((clicked / campaign.sentCount) * 100).toFixed(2))
          : 0;

      return {
        campaign_id: campaign.id,
        date: campaign.createdAt.toISOString(),
        subject: campaign.subject,
        recipients: campaign.totalCount,
        sent: campaign.sentCount,
        failed: campaign.failedCount,
        opened,
        clicked,
        bounced,
        unsubscribed,
        open_rate: openRate,
        click_rate: clickRate,
        duration_sec: durationSeconds(campaign.startedAt, campaign.completedAt),
      };
    });

    if (format === "json") {
      return success(rows);
    }

    const header = [
      "campaign_id",
      "date",
      "subject",
      "recipients",
      "sent",
      "failed",
      "opened",
      "clicked",
      "bounced",
      "unsubscribed",
      "open_rate",
      "click_rate",
      "duration_sec",
    ];

    const csv = [
      header.join(","),
      ...rows.map((row) =>
        [
          csvEscape(row.campaign_id),
          csvEscape(row.date),
          csvEscape(csvSafe(row.subject)),
          row.recipients,
          row.sent,
          row.failed,
          row.opened,
          row.clicked,
          row.bounced,
          row.unsubscribed,
          row.open_rate,
          row.click_rate,
          row.duration_sec,
        ].join(","),
      ),
    ].join("\n");

    const filename = `campaign_history_${auth.user.id}_${new Date().toISOString().slice(0, 10)}.csv`;
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[Campaign History Export] Error:", err);
    return errors.serverError();
  }
}
