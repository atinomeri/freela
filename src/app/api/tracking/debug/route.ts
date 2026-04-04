import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Temporary diagnostic endpoint — remove after debugging.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Test write + read
  try {
    const testEvent = await prisma.emailTrackingEvent.create({
      data: {
        campaignId: '__debug_test__',
        emailHash: 'debug_hash_test',
        eventType: 'OPEN',
      },
    });
    results.write = { ok: true, id: testEvent.id };
    await prisma.emailTrackingEvent.delete({ where: { id: testEvent.id } });
    results.cleanup = { ok: true };
  } catch (error) {
    results.write = { ok: false, error: String(error).slice(0, 500) };
  }

  // 2. Latest campaign report
  try {
    const latestReport = await prisma.campaignReport.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { campaignId: true, sent: true, createdAt: true },
    });
    results.latestReport = latestReport;

    if (latestReport) {
      const opens = await prisma.emailTrackingEvent.count({
        where: { campaignId: latestReport.campaignId, eventType: 'OPEN' },
      });
      const clicks = await prisma.emailTrackingEvent.count({
        where: { campaignId: latestReport.campaignId, eventType: 'CLICK' },
      });
      results.events = { opens, clicks };
    }
  } catch (error) {
    results.latestReport = { error: String(error).slice(0, 500) };
  }

  // 3. Total events
  try {
    results.totalEvents = await prisma.emailTrackingEvent.count();
  } catch (error) {
    results.totalEvents = { error: String(error).slice(0, 500) };
  }

  return NextResponse.json(results);
}
