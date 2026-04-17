import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDesktopAuth } from '@/lib/desktop-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type ScopedReport = {
  sent: number;
  failed: number;
  startedAt: Date;
  desktopUserId: string | null;
  hwid: string;
};

type UniqueEventCounts = {
  opened: number;
  clicked: number;
};

function isMissingCampaignDesktopUserColumn(error: unknown): boolean {
  const candidate = error as {
    code?: string;
    message?: string;
    meta?: { column?: unknown };
  };
  if (candidate?.code !== 'P2022') return false;
  const details = `${candidate.message ?? ''} ${String(candidate.meta?.column ?? '')}`.toLowerCase();
  return details.includes('desktopuserid');
}

async function getScopedReport(campaignId: string): Promise<ScopedReport | null> {
  try {
    return await prisma.campaignReport.findUnique({
      where: { campaignId },
      select: { desktopUserId: true, hwid: true, sent: true, failed: true, startedAt: true },
    });
  } catch (error) {
    if (!isMissingCampaignDesktopUserColumn(error)) {
      throw error;
    }

    console.warn('[Tracking Stats] Legacy schema detected: CampaignReport.desktopUserId is missing.');
    const legacy = await prisma.campaignReport.findUnique({
      where: { campaignId },
      select: { hwid: true, sent: true, failed: true, startedAt: true },
    });
    return legacy ? { ...legacy, desktopUserId: null } : null;
  }
}

async function getOwnedCampaignIds(
  desktopUserId: string,
  desktopUserEmail: string | null,
): Promise<string[]> {
  try {
    const ownedReports = await prisma.campaignReport.findMany({
      where: { desktopUserId },
      select: { campaignId: true },
    });
    return ownedReports.map((report) => report.campaignId);
  } catch (error) {
    if (!isMissingCampaignDesktopUserColumn(error) || !desktopUserEmail) {
      throw error;
    }

    const legacyReports = await prisma.campaignReport.findMany({
      where: { hwid: desktopUserEmail },
      select: { campaignId: true },
    });
    return legacyReports.map((report) => report.campaignId);
  }
}

async function getOwnedCampaignIdsFromCampaignTable(
  desktopUserId: string,
): Promise<string[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { desktopUserId },
    select: { id: true },
  });
  return campaigns.map((campaign) => campaign.id);
}

async function getUniqueEventCountsForCampaign(campaignId: string): Promise<UniqueEventCounts> {
  const [opens, clicks] = await Promise.all([
    prisma.emailTrackingEvent.findMany({
      where: {
        campaignId,
        eventType: "OPEN",
        emailHash: { not: null },
      },
      select: { emailHash: true },
    }),
    prisma.emailTrackingEvent.findMany({
      where: {
        campaignId,
        eventType: "CLICK",
        emailHash: { not: null },
      },
      select: { emailHash: true },
    }),
  ]);

  return {
    opened: new Set(opens.map((item) => item.emailHash).filter(Boolean)).size,
    clicked: new Set(clicks.map((item) => item.emailHash).filter(Boolean)).size,
  };
}

export async function GET(request: Request) {
  try {
    // ── Auth: require desktop JWT OR admin web session ──
    const desktopAuth = await requireDesktopAuth(request).catch(() => null);
    const session = await getServerSession(authOptions);

    const isDesktopUser = desktopAuth && 'user' in desktopAuth && desktopAuth.user;
    const isAdmin = session?.user?.role === 'ADMIN';

    if (!isDesktopUser && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');
    const desktopUserId = isDesktopUser ? desktopAuth.user.id : null;
    const desktopUserEmail = isDesktopUser ? desktopAuth.user.email.toLowerCase() : null;

    // ── Ownership check: desktop users can only see their own campaigns ──
    let scopedReport: ScopedReport | null = null;
    if (isDesktopUser && campaignId) {
      let report = await getScopedReport(campaignId);
      if (!report) {
        const campaignFallback = await prisma.campaign.findUnique({
          where: { id: campaignId },
          select: {
            desktopUserId: true,
            sentCount: true,
            failedCount: true,
            startedAt: true,
            createdAt: true,
          },
        });

        if (campaignFallback) {
          report = {
            desktopUserId: campaignFallback.desktopUserId,
            hwid: desktopUserEmail ?? "",
            sent: campaignFallback.sentCount,
            failed: campaignFallback.failedCount,
            startedAt: campaignFallback.startedAt ?? campaignFallback.createdAt,
          };
        }
      }

      if (report) {
        const ownedByDesktopUser =
          report.desktopUserId === desktopUserId ||
          (!report.desktopUserId && desktopUserEmail && report.hwid.toLowerCase() === desktopUserEmail);

        if (!ownedByDesktopUser) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        scopedReport = report;
      }

      if (!report) {
        return NextResponse.json({ error: 'Campaign report not found' }, { status: 404 });
      }
    }

    let ownedCampaignIds: string[] = [];
    if (!campaignId && isDesktopUser && desktopUserId) {
      ownedCampaignIds = await getOwnedCampaignIds(desktopUserId, desktopUserEmail);
      if (ownedCampaignIds.length === 0) {
        ownedCampaignIds = await getOwnedCampaignIdsFromCampaignTable(desktopUserId);
      }

      if (ownedCampaignIds.length === 0) {
        return NextResponse.json({
          campaign_id: '',
          total_sent: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          open_rate: 0,
          click_rate: 0,
        });
      }
    }

    let total_sent = 0;
    let opened = 0;
    let clicked = 0;
    let bounced = 0;
    let unsubscribed = 0;
    let open_rate = 0;
    let click_rate = 0;

    if (campaignId && scopedReport) {
      const campaignStats = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          sentCount: true,
          openCount: true,
          clickCount: true,
          bounceCount: true,
        },
      });
      total_sent = campaignStats?.sentCount ?? scopedReport.sent;
      opened = campaignStats?.openCount ?? 0;
      clicked = campaignStats?.clickCount ?? 0;
      bounced = campaignStats?.bounceCount ?? scopedReport.failed;

      if (!campaignStats || (opened === 0 && clicked === 0)) {
        const uniqueEvents = await getUniqueEventCountsForCampaign(campaignId);
        opened = Math.max(opened, uniqueEvents.opened);
        clicked = Math.max(clicked, uniqueEvents.clicked);
      }
    } else if (!campaignId && isDesktopUser && desktopUserId) {
      const campaignAggregate = await prisma.campaign.aggregate({
        where: { desktopUserId },
        _sum: {
          sentCount: true,
          openCount: true,
          clickCount: true,
          bounceCount: true,
        },
      });
      total_sent = campaignAggregate._sum.sentCount ?? 0;
      opened = campaignAggregate._sum.openCount ?? 0;
      clicked = campaignAggregate._sum.clickCount ?? 0;
      bounced = campaignAggregate._sum.bounceCount ?? 0;
    }

    if (total_sent > 0) {
      open_rate = parseFloat((opened / total_sent * 100).toFixed(2));
      click_rate = parseFloat((clicked / total_sent * 100).toFixed(2));
    }

    // Count unsubscribes that happened during/after this campaign
    if (campaignId) {
      if (scopedReport) {
        unsubscribed = await prisma.unsubscribedEmail.count({
          where: {
            source: { not: "bounce" },
            createdAt: { gte: scopedReport.startedAt },
            ...(desktopUserId ? { desktopUserId } : {}),
          },
        });
      } else {
        unsubscribed = await prisma.unsubscribedEmail.count({
          where: desktopUserId
            ? { desktopUserId, source: { not: "bounce" } }
            : { source: { not: "bounce" } },
        });
      }
    } else if (isDesktopUser && desktopUserId) {
      unsubscribed = await prisma.unsubscribedEmail.count({
        where: { desktopUserId, source: { not: "bounce" } },
      });
    } else {
      unsubscribed = await prisma.unsubscribedEmail.count({
        where: { source: { not: "bounce" } },
      });
    }

    return NextResponse.json({
      campaign_id: campaignId || "",
      total_sent,
      opened,
      clicked,
      bounced,
      unsubscribed,
      open_rate,
      click_rate
    });
  } catch (error) {
    console.error('[Tracking Stats] Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracking stats' },
      { status: 500 }
    );
  }
}
