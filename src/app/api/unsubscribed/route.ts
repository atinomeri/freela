import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Check Authorization header (desktop app), query param (legacy), or admin session (web panel). */
async function isAuthorized(request: Request): Promise<boolean> {
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  // 1. Authorization header (preferred — keeps secret out of URL/logs)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ') && expectedSecret) {
    const token = authHeader.slice(7);
    if (token === expectedSecret) return true;
  }

  // 2. Legacy: query param (deprecated — will be removed in future version)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (expectedSecret && secret === expectedSecret) return true;

  // 3. Admin web session
  const session = await getServerSession(authOptions);
  if (session?.user?.role === 'ADMIN') return true;

  return false;
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unsubscribed = await prisma.unsubscribedEmail.findMany({
      select: {
        id: true,
        email: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      count: unsubscribed.length,
      items: unsubscribed.map((u) => ({
        id: u.id,
        email: u.email,
        source: u.source,
        timestamp: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[API Unsubscribed] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, email } = body as { id?: string; email?: string };

    if (id) {
      await prisma.unsubscribedEmail.delete({ where: { id } });
      return NextResponse.json({ success: true, deleted: id });
    }

    if (email) {
      await prisma.unsubscribedEmail.delete({ where: { email } });
      return NextResponse.json({ success: true, deleted: email });
    }

    return NextResponse.json({ error: 'Provide id or email' }, { status: 400 });
  } catch (error) {
    console.error('[API Unsubscribed DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
