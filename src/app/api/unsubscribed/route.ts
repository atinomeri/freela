import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/desktop-jwt';

export const dynamic = 'force-dynamic';

interface AuthResult {
  authorized: boolean;
  desktopUserId?: string; // If authenticated via desktop JWT
  isAdmin?: boolean;
}

/** Check Authorization header (desktop JWT or legacy secret), or admin session. */
async function checkAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.INTERNAL_API_SECRET;

  // 1. Try desktop JWT first (preferred for user-specific filtering)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Check if it's a desktop JWT
    try {
      const payload = verifyAccessToken(token);
      if (payload.sub) {
        // Verify user exists
        const user = await prisma.desktopUser.findUnique({
          where: { id: payload.sub },
          select: { id: true },
        });
        if (user) {
          return { authorized: true, desktopUserId: user.id };
        }
      }
    } catch {
      // Not a valid JWT — might be legacy secret
    }

    // Check if it's the legacy API secret
    if (expectedSecret && token === expectedSecret) {
      return { authorized: true, isAdmin: true };
    }
  }

  // 2. Legacy: query param (deprecated — will be removed in future version)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (expectedSecret && secret === expectedSecret) {
    return { authorized: true, isAdmin: true };
  }

  // 3. Admin web session
  const session = await getServerSession(authOptions);
  if (session?.user?.role === 'ADMIN') {
    return { authorized: true, isAdmin: true };
  }

  return { authorized: false };
}

export async function GET(request: Request) {
  try {
    const auth = await checkAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build where clause — filter by desktopUserId if not admin
    const where = auth.desktopUserId ? { desktopUserId: auth.desktopUserId } : {};

    const unsubscribed = await prisma.unsubscribedEmail.findMany({
      where,
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
    const auth = await checkAuth(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, email } = body as { id?: string; email?: string };

    // Build where clause for ownership check
    const ownershipFilter = auth.desktopUserId ? { desktopUserId: auth.desktopUserId } : {};

    if (id) {
      // Verify ownership before delete
      const record = await prisma.unsubscribedEmail.findFirst({
        where: { id, ...ownershipFilter },
      });
      if (!record) {
        return NextResponse.json({ error: 'Not found or not owned' }, { status: 404 });
      }
      await prisma.unsubscribedEmail.delete({ where: { id } });
      return NextResponse.json({ success: true, deleted: id });
    }

    if (email) {
      // Delete only records owned by this user
      const result = await prisma.unsubscribedEmail.deleteMany({
        where: { email, ...ownershipFilter },
      });
      if (result.count === 0) {
        return NextResponse.json({ error: 'Not found or not owned' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deleted: email });
    }

    return NextResponse.json({ error: 'Provide id or email' }, { status: 400 });
  } catch (error) {
    console.error('[API Unsubscribed DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
