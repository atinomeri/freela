import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  type UnsubscribeTokenPayload,
  verifyUnsubscribeToken,
} from '@/lib/unsubscribe-token';

export const dynamic = 'force-dynamic';

function InvalidLinkCard() {
  return (
    <div style={{ backgroundColor: 'hsl(0 84% 95%)', border: '1px solid hsl(0 84% 82%)', color: 'hsl(0 84% 40%)', padding: '1.5rem', borderRadius: '0.75rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'hsl(0 84% 40%)' }}>Error / შეცდომა</h2>
      <p style={{ color: 'hsl(0 84% 40%)' }}>
        Invalid or expired unsubscribe link. / ბმული არასწორია ან ვადაგასულია.
      </p>
    </div>
  );
}

async function UnsubscribeAction({
  payload,
}: {
  payload: UnsubscribeTokenPayload | null;
}) {
  if (!payload) {
    return <InvalidLinkCard />;
  }

  const { email, desktopUserId } = payload;
  let success = false;
  let invalidLink = false;
  let errorMsg = '';

  try {
    if (desktopUserId) {
      const desktopUser = await prisma.desktopUser.findUnique({
        where: { id: desktopUserId },
        select: { id: true },
      });
      if (!desktopUser) {
        invalidLink = true;
      }
    }

    if (!invalidLink) {
      const existingUnsub = await prisma.unsubscribedEmail.findFirst({
        where: {
          email,
          desktopUserId: desktopUserId ?? null,
        },
      });

      if (existingUnsub) {
        await prisma.unsubscribedEmail.update({
          where: { id: existingUnsub.id },
          data: { source: 'link' },
        });
      } else {
        await prisma.unsubscribedEmail.create({
          data: { email, source: 'link', desktopUserId: desktopUserId ?? null },
        });
      }

      // Also update web user if exists (for platform notifications)
      await prisma.user.updateMany({
        where: { email },
        data: { projectEmailSubscribed: false },
      });

      success = true;
    }
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);
    errorMsg = 'Something went wrong. Please try again later. / რაღაც შეფერხდა. გთხოვთ სცადოთ მოგვიანებით.';
  }

  if (invalidLink) {
    return <InvalidLinkCard />;
  }

  if (success) {
    return (
      <div style={{ backgroundColor: 'hsl(142 76% 94%)', border: '1px solid hsl(142 76% 78%)', color: 'hsl(142 76% 28%)', padding: '1.5rem', borderRadius: '0.75rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'hsl(142 76% 28%)' }}>
          Successfully Unsubscribed / გამოწერა გაუქმებულია
        </h2>
        <p style={{ fontSize: '1.125rem', color: 'hsl(142 76% 28%)' }}>
          You have been successfully unsubscribed from <strong>{email}</strong>.
          <br />
          თქვენი გამოწერა წარმატებით გაუქმდა მისამართისთვის: <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'hsl(0 84% 95%)', border: '1px solid hsl(0 84% 82%)', color: 'hsl(0 84% 40%)', padding: '1.5rem', borderRadius: '0.75rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'hsl(0 84% 40%)' }}>Error / შეცდომა</h2>
      <p style={{ color: 'hsl(0 84% 40%)' }}>{errorMsg || 'Unknown error occurred.'}</p>
    </div>
  );
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const rawToken = params.email || '';
  const decoded = verifyUnsubscribeToken(rawToken);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '28rem', width: '100%', backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '2rem', textAlign: 'center', border: '1px solid #f3f4f6' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
          <svg
            style={{ width: '4rem', height: '4rem', color: '#2563eb' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Freela.ge</h1>

        <Suspense fallback={<div style={{ color: '#6b7280' }}>Processing... / მუშავდება...</div>}>
          <UnsubscribeAction payload={decoded} />
        </Suspense>

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #f3f4f6' }}>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            If this was a mistake, you can re-subscribe in your profile settings.
            <br />
            თუ ეს შეცდომით მოხდა, შეგიძლიათ კვლავ გამოიწეროთ თქვენი პროფილის პარამეტრებიდან.
          </p>
          <Link
            href="/"
            style={{ display: 'inline-block', marginTop: '1.5rem', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
          >
            Go to Homepage / მთავარზე გადასვლა
          </Link>
        </div>
      </div>
    </div>
  );
}
