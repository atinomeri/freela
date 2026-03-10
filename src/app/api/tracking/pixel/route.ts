import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1x1 прозрачный GIF в виде бинарного буфера
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: NextRequest) {
  try {
    // Получаем параметр data из URL
    const { searchParams } = new URL(request.url);
    const encodedData = searchParams.get('data');

    if (!encodedData) {
      console.warn('[Pixel Tracking] Missing data parameter');
      // Все равно возвращаем GIF, чтобы не ломать письмо
      return new NextResponse(TRANSPARENT_GIF_BUFFER, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Декодируем Base64 в строку email
    let email: string;
    try {
      email = Buffer.from(encodedData, 'base64').toString('utf-8');
    } catch (decodeError) {
      console.error('[Pixel Tracking] Base64 decode error:', decodeError);
      // Возвращаем GIF даже при ошибке декодирования
      return new NextResponse(TRANSPARENT_GIF_BUFFER, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Получаем дополнительные данные для аналитики
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      undefined;

    // Асинхронно записываем событие в базу данных
    // Используем неблокирующий подход - не ждем завершения записи
    prisma.emailTrackingEvent
      .create({
        data: {
          email,
          eventType: 'OPEN',
          userAgent,
          ipAddress,
        },
      })
      .catch((error) => {
        console.error('[Pixel Tracking] Database error:', error);
      });

    console.log(`[Pixel Tracking] Email opened: ${email}`);

    // Возвращаем 1x1 прозрачный GIF с заголовками против кэширования
    return new NextResponse(TRANSPARENT_GIF_BUFFER, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': TRANSPARENT_GIF_BUFFER.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Pixel Tracking] Unexpected error:', error);

    // Даже при критической ошибке возвращаем GIF
    return new NextResponse(TRANSPARENT_GIF_BUFFER, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}
