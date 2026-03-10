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

    return NextResponse.json({
      opened: openedEmails.length,
      clicked: clickedEmails.length,
    });
  } catch (error) {
    console.error('[Tracking Stats] Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracking stats' },
      { status: 500 }
    );
  }
}
