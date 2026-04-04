import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireDesktopAuth } from '@/lib/desktop-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // ── Ownership check: desktop users can only see their own campaigns ──
    if (isDesktopUser && campaignId) {
      const report = await prisma.campaignReport.findUnique({
        where: { campaignId },
        select: { desktopUserId: true },
      });
      // If report exists and belongs to another user, deny access
      if (report && report.desktopUserId && report.desktopUserId !== desktopAuth.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const where: Record<string, unknown> = {};
    if (campaignId) {
      where.campaignId = campaignId;
    }

    // Count unique opens and clicks by emailHash (or fallback to email for old data)
    const openedCount = await prisma.emailTrackingEvent.count({
      where: { ...where, eventType: 'OPEN' },
    });

    const clickedCount = await prisma.emailTrackingEvent.count({
      where: { ...where, eventType: 'CLICK' },
    });

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

    if (campaignId) {
      const report = await prisma.campaignReport.findUnique({
        where: { campaignId }
      });

      if (report) {
        total_sent = report.sent;
        bounced = report.failed;

        if (total_sent > 0) {
          open_rate = parseFloat((opened / total_sent * 100).toFixed(2));
          click_rate = parseFloat((clicked / total_sent * 100).toFixed(2));
        }
      }
    }

    // Count unsubscribes that happened during/after this campaign
    if (campaignId) {
      const report = await prisma.campaignReport.findUnique({
        where: { campaignId },
        select: { startedAt: true },
      });
      if (report) {
        unsubscribed = await prisma.unsubscribedEmail.count({
          where: { createdAt: { gte: report.startedAt } },
        });
      } else {
        unsubscribed = await prisma.unsubscribedEmail.count();
      }
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
