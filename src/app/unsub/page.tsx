import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function UnsubscribeAction({ email }: { email: string }) {
  if (!email) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-2">Error / შეცდომა</h2>
        <p>Invalid email address. / არასწორი ელ-ფოსტა.</p>
      </div>
    );
  }

  let success = false;
  let errorMsg = '';

  try {
    // 1. Add to general unsub list
    await prisma.unsubscribedEmail.upsert({
      where: { email },
      update: { source: 'link' },
      create: { email, source: 'link' },
    });

    // 2. Update user if exists
    await prisma.user.updateMany({
      where: { email },
      data: { projectEmailSubscribed: false },
    });
    
    success = true;
  } catch (error) {
    console.error('[Unsubscribe] Error:', error);
    errorMsg = 'Something went wrong. Please try again later. / რაღაც შეფერხდა. გთხოვთ სცადოთ მოგვიანებით.';
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Successfully Unsubscribed / გამოწერა გაუქმებულია</h2>
        <p className="text-lg">
          You have been successfully unsubscribed from <strong>{email}</strong>.
          <br />
          თქვენი გამოწერა წარმატებით გაუქმდა მისამართისთვის: <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold mb-2">Error / შეცდომა</h2>
      <p>{errorMsg || 'Unknown error occurred.'}</p>
    </div>
  );
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  let email = params.email || '';

  // Try to decode if it looks like Base64 (doesn't contain @)
  if (email && !email.includes('@')) {
    try {
      const decoded = Buffer.from(email, 'base64').toString('utf-8');
      if (decoded.includes('@')) {
        email = decoded;
      }
    } catch (e) {
      console.warn('[Unsubscribe] Failed to decode email parameter:', email);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        <div className="mb-8 flex justify-center">
          <svg
            className="w-16 h-16 text-blue-600"
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

        <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Freela.ge</h1>

        <Suspense fallback={<div className="animate-pulse text-gray-500">Processing... / მუშავდება...</div>}>
          <UnsubscribeAction email={email || ''} />
        </Suspense>

        <div className="mt-8 pt-8 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            If this was a mistake, you can re-subscribe in your profile settings.
            <br />
            თუ ეს შეცდომით მოხდა, შეგიძლიათ კვლავ გამოიწეროთ თქვენი პროფილის პარამეტრებიდან.
          </p>
          <Link
            href="/"
            className="inline-block mt-6 text-blue-600 font-semibold hover:text-blue-800 transition-colors"
          >
            Go to Homepage / მთავარზე გადასვლა
          </Link>
        </div>
      </div>
    </div>
  );
}
