import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Temporary diagnostic endpoint — remove after debugging.
 * Tests DB write + read for EmailTrackingEvent.
 */
export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check if emailHash column exists by attempting a write
  try {
    const testEvent = await prisma.emailTrackingEvent.create({
      data: {
        campaignId: '__debug_test__',
        emailHash: 'debug_hash_test',
        eventType: 'OPEN',
      },
    });
    results.write = { ok: true, id: testEvent.id };

    // Clean up
    await prisma.emailTrackingEvent.delete({ where: { id: testEvent.id } });
    results.cleanup = { ok: true };
  } catch (error) {
    results.write = { ok: false, error: String(error) };
  }

  // 2. Count events for the user's latest campaign
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
    results.latestReport = { error: String(error) };
  }

  // 3. Count total tracking events in the table
  try {
    const total = await prisma.emailTrackingEvent.count();
    results.totalEvents = total;
  } catch (error) {
    results.totalEvents = { error: String(error) };
  }

  // 4. Check migration status - list columns
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'EmailTrackingEvent'
      ORDER BY ordinal_position
    `;
    results.columns = columns;
  } catch (error) {
    results.columns = { error: String(error) };
  }

  return NextResponse.json(results);
}
