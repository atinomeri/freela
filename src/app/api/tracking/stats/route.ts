import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Считаем количество уникальных email-адресов с eventType 'OPEN'
    const openedEmails = await prisma.emailTrackingEvent.findMany({
      where: { eventType: 'OPEN' },
      distinct: ['email'],
      select: { email: true },
    });

    // Считаем количество уникальных email-адресов с eventType 'CLICK'
    const clickedEmails = await prisma.emailTrackingEvent.findMany({
      where: { eventType: 'CLICK' },
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
