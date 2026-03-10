import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Получаем базовый URL приложения с фоллбэком на production домен
const getBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://freela.ge';
};

export async function GET(request: NextRequest) {
  const BASE_URL = getBaseUrl();

  try {
    // Получаем параметры url и email из URL
    const { searchParams } = new URL(request.url);
    const encodedUrl = searchParams.get('url');
    const encodedEmail = searchParams.get('email');

    // Если отсутствуют обязательные параметры - редиректим на главную страницу
    if (!encodedUrl || !encodedEmail) {
      console.warn('[Click Tracking] Missing required parameters');
      return NextResponse.redirect(BASE_URL, 302);
    }

    // Декодируем Base64 параметры
    let targetUrl: string;
    let email: string;

    try {
      targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
      email = Buffer.from(encodedEmail, 'base64').toString('utf-8');
    } catch (decodeError) {
      console.error('[Click Tracking] Base64 decode error:', decodeError);
      // При ошибке декодирования редиректим на главную
      return NextResponse.redirect(BASE_URL, 302);
    }

    // Определяем финальный URL для редиректа
    let finalUrl: string;

    // Если URL абсолютный (начинается с http:// или https://)
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      // Валидируем абсолютный URL
      try {
        new URL(targetUrl); // Проверка валидности
        finalUrl = targetUrl;
      } catch (urlError) {
        console.error('[Click Tracking] Invalid absolute URL:', urlError);
        return NextResponse.redirect(BASE_URL, 302);
      }
    }
    // Если URL относительный (начинается с /)
    else if (targetUrl.startsWith('/')) {
      // Склеиваем базовый домен с относительным путем
      finalUrl = `${BASE_URL}${targetUrl}`;
    }
    // Если URL не начинается ни с http://, ни с /
    else {
      console.error('[Click Tracking] Invalid URL format:', targetUrl);
      return NextResponse.redirect(BASE_URL, 302);
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
          eventType: 'CLICK',
          url: finalUrl,
          userAgent,
          ipAddress,
        },
      })
      .catch((error) => {
        console.error('[Click Tracking] Database error:', error);
      });

    console.log(`[Click Tracking] Link clicked by ${email}: ${finalUrl}`);

    // Редиректим пользователя на финальный URL
    return NextResponse.redirect(finalUrl, 302);
  } catch (error) {
    console.error('[Click Tracking] Unexpected error:', error);

    // При критической ошибке редиректим на главную страницу домена
    return NextResponse.redirect(BASE_URL, 302);
  }
}
