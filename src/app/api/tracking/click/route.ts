import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

const getBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://freela.ge';
};

function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip.trim()).digest('hex');
}

export async function GET(request: NextRequest) {
  const BASE_URL = getBaseUrl();

  try {
    const { searchParams } = new URL(request.url);
    const encodedUrl = searchParams.get('url');
    const encodedEmail = searchParams.get('email');
    const campaignId = searchParams.get('cid') || null;

    if (!encodedUrl || !encodedEmail) {
      return NextResponse.redirect(BASE_URL, 302);
    }

    let targetUrl: string;
    let emailHash: string;

    try {
      targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
      const email = Buffer.from(encodedEmail, 'base64').toString('utf-8');
      emailHash = hashEmail(email);
    } catch {
      return NextResponse.redirect(BASE_URL, 302);
    }

    // Determine final redirect URL
    let finalUrl: string;

    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      try {
        new URL(targetUrl);
        finalUrl = targetUrl;
      } catch {
        return NextResponse.redirect(BASE_URL, 302);
      }
    } else if (targetUrl.startsWith('/')) {
      finalUrl = `${BASE_URL}${targetUrl}`;
    } else {
      return NextResponse.redirect(BASE_URL, 302);
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;

    const ipHash = ipAddress ? hashIp(ipAddress) : undefined;

    // Store only hashed data — no plaintext PII in the database
    try {
      await prisma.emailTrackingEvent.create({
        data: {
          campaignId,
          emailHash,
          eventType: 'CLICK',
          url: finalUrl,
          ipAddress: ipHash,
        },
      });
    } catch (error) {
      console.error('[Click Tracking] Database error:', error);
    }

    return NextResponse.redirect(finalUrl, 302);
  } catch (error) {
    console.error('[Click Tracking] Unexpected error:', error);
    return NextResponse.redirect(BASE_URL, 302);
  }
}
