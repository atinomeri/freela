import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaign_id');

    const where: Record<string, unknown> = {};
    if (campaignId) {
      where.campaignId = campaignId;
    }

    const openedEmails = await prisma.emailTrackingEvent.findMany({
      where: { ...where, eventType: 'OPEN' },
      distinct: ['email'],
      select: { email: true },
    });

    const clickedEmails = await prisma.emailTrackingEvent.findMany({
      where: { ...where, eventType: 'CLICK' },
      distinct: ['email'],
      select: { email: true },
    });
    
    const opened = openedEmails.length;
    const clicked = clickedEmails.length;
    
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
        total_sent = report.sent; // using "sent" as total_sent based on the instructions
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
