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

async function getOwnedAggregate(
  desktopUserId: string,
  desktopUserEmail: string | null,
): Promise<{ sent: number; failed: number }> {
  try {
    const aggregate = await prisma.campaignReport.aggregate({
      where: { desktopUserId },
      _sum: { sent: true, failed: true },
    });
    return {
      sent: aggregate._sum.sent ?? 0,
      failed: aggregate._sum.failed ?? 0,
    };
  } catch (error) {
    if (!isMissingCampaignDesktopUserColumn(error) || !desktopUserEmail) {
      throw error;
    }

    const legacyAggregate = await prisma.campaignReport.aggregate({
      where: { hwid: desktopUserEmail },
      _sum: { sent: true, failed: true },
    });
    return {
      sent: legacyAggregate._sum.sent ?? 0,
      failed: legacyAggregate._sum.failed ?? 0,
    };
  }
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
      const report = await getScopedReport(campaignId);
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

    const where: Record<string, unknown> = {};
    let ownedCampaignIds: string[] = [];

    if (campaignId) {
      where.campaignId = campaignId;
    } else if (isDesktopUser && desktopUserId) {
      ownedCampaignIds = await getOwnedCampaignIds(desktopUserId, desktopUserEmail);
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
      where.campaignId = { in: ownedCampaignIds };
    }

    // Deduplicate: count distinct emailHash values
    const openedDistinct = await prisma.emailTrackingEvent.findMany({
      where: { ...where, eventType: 'OPEN' },
      distinct: ['emailHash'],
      select: { emailHash: true },
    });

    const clickedDistinct = await prisma.emailTrackingEvent.findMany({
      where: { ...where, eventType: 'CLICK' },
      distinct: ['emailHash'],
      select: { emailHash: true },
    });

    const opened = openedDistinct.length;
    const clicked = clickedDistinct.length;

    let total_sent = 0;
    let bounced = 0;
    let unsubscribed = 0;
    let open_rate = 0;
    let click_rate = 0;

    if (campaignId && scopedReport) {
      total_sent = scopedReport.sent;
      bounced = scopedReport.failed;
    } else if (!campaignId && isDesktopUser && desktopUserId) {
      const aggregate = await getOwnedAggregate(desktopUserId, desktopUserEmail);
      total_sent = aggregate.sent;
      bounced = aggregate.failed;
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
            createdAt: { gte: scopedReport.startedAt },
            ...(desktopUserId ? { desktopUserId } : {}),
          },
        });
      } else {
        unsubscribed = await prisma.unsubscribedEmail.count({
          where: desktopUserId ? { desktopUserId } : {},
        });
      }
    } else if (isDesktopUser && desktopUserId) {
      unsubscribed = await prisma.unsubscribedEmail.count({
        where: { desktopUserId },
      });
    } else {
      unsubscribed = await prisma.unsubscribedEmail.count();
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
