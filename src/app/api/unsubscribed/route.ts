import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Simple security check
    const expectedSecret = process.env.INTERNAL_API_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unsubscribed = await prisma.unsubscribedEmail.findMany({
      select: { 
        email: true, 
        source: true, 
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      count: unsubscribed.length,
      items: unsubscribed.map((u) => ({
        email: u.email,
        source: u.source,
        timestamp: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[API Unsubscribed] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
