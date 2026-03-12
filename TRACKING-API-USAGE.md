# Email Tracking API - Руководство по использованию

## Обзор

Система трекинга email открытий и кликов для **Freela Email Sender**.

### Production URL
```
https://freela.ge/api/tracking/pixel
https://freela.ge/api/tracking/click
```

---

## 1. Pixel Tracking (Отслеживание открытий писем)

### Эндпоинт
```
GET /api/tracking/pixel?data={base64_email}
```

### Параметры
- `data` - Email получателя, закодированный в Base64

### Как использовать в вашем Email Sender

```typescript
// В вашем десктопном приложении
function createTrackingPixel(recipientEmail: string): string {
  const encodedEmail = Buffer.from(recipientEmail).toString('base64');
  return `<img src="https://freela.ge/api/tracking/pixel?data=${encodedEmail}" width="1" height="1" style="display:none;" alt="" />`;
}

// Пример использования
const recipientEmail = "client@example.com";
const pixelHtml = createTrackingPixel(recipientEmail);

// Вставьте pixelHtml в конец тела письма перед закрывающим тегом </body>
const emailHtml = `
  <html>
    <body>
      <h1>Ваше сообщение</h1>
      <p>Текст письма...</p>
      ${pixelHtml}
    </body>
  </html>
`;
```

### Что происходит
1. Письмо открывается получателем
2. Почтовый клиент загружает невидимый GIF (1x1 пиксель)
3. Сервер декодирует email и записывает событие `OPEN` в БД
4. Возвращает прозрачный GIF с заголовками против кэширования

---

## 2. Click Tracking (Отслеживание кликов по ссылкам)

### Эндпоинт
```
GET /api/tracking/click?url={base64_url}&email={base64_email}
```

### Параметры
- `url` - Оригинальный URL назначения (абсолютный или относительный), закодированный в Base64
- `email` - Email получателя, закодированный в Base64

### Поддерживаемые форматы URL
- **Абсолютные URL**: `https://freela.ge/projects`, `http://example.com`
- **Относительные URL**: `/projects`, `/pricing` (автоматически дополняются до `https://freela.ge{path}`)

### Как использовать в вашем Email Sender

```typescript
// В вашем десктопном приложении
function createTrackedLink(originalUrl: string, recipientEmail: string): string {
  const encodedUrl = Buffer.from(originalUrl).toString('base64');
  const encodedEmail = Buffer.from(recipientEmail).toString('base64');
  return `https://freela.ge/api/tracking/click?url=${encodedUrl}&email=${encodedEmail}`;
}

// Пример использования
const recipientEmail = "client@example.com";
const targetUrl = "https://freela.ge/projects/123";
const trackedUrl = createTrackedLink(targetUrl, recipientEmail);

// Используйте trackedUrl вместо оригинального URL в письме
const emailHtml = `
  <html>
    <body>
      <h1>Новый проект для вас!</h1>
      <p>Посмотрите интересный проект:</p>
      <a href="${trackedUrl}">Открыть проект</a>
    </body>
  </html>
`;
```

### Что происходит
1. Получатель кликает на ссылку в письме
2. Сервер декодирует URL и email
3. Записывает событие `CLICK` в БД с URL
4. Выполняет редирект (HTTP 302) на оригинальный URL
5. Пользователь попадает на нужную страницу

---

## 3. Unsubscribe Link (გამოწერის გაუქმების ბმული)

### ფორმატი
```
https://freela.ge/unsub?email={base64_email}
```

### როგორ გამოიყენოთ თქვენს Email Sender-ში

```typescript
// Desktop აპლიკაციაში მიუთითეთ:
const unsubscribeUrl = `https://freela.ge/unsub?email=${encodedEmail}`;

// ან გამოიყენეთ პლეისჰოლდერი:
// https://freela.ge/unsub?email=[[Email_B64]]
```

---

## 4. Полный пример для Email Sender

```typescript
interface EmailTrackingConfig {
  baseUrl: string; // "https://freela.ge"
}

class EmailTrackingHelper {
  constructor(private config: EmailTrackingConfig) {}

  // Создать pixel tracking
  createPixel(recipientEmail: string): string {
    const encoded = Buffer.from(recipientEmail).toString('base64');
    return `<img src="${this.config.baseUrl}/api/tracking/pixel?data=${encoded}" width="1" height="1" style="display:none;" alt="" />`;
  }

  // Создать отслеживаемую ссылку
  createTrackedLink(originalUrl: string, recipientEmail: string): string {
    const encodedUrl = Buffer.from(originalUrl).toString('base64');
    const encodedEmail = Buffer.from(recipientEmail).toString('base64');
    return `${this.config.baseUrl}/api/tracking/click?url=${encodedUrl}&email=${encodedEmail}`;
  }

  // Обработать HTML письма - заменить все ссылки и добавить pixel
  processEmailHtml(html: string, recipientEmail: string): string {
    // 1. Заменить все ссылки на tracked версии
    const linkRegex = /<a\s+href="(https?:\/\/[^"]+)"([^>]*)>/gi;
    let processedHtml = html.replace(linkRegex, (match, url, attrs) => {
      const trackedUrl = this.createTrackedLink(url, recipientEmail);
      return `<a href="${trackedUrl}"${attrs}>`;
    });

    // 2. Добавить tracking pixel перед </body>
    const pixel = this.createPixel(recipientEmail);
    processedHtml = processedHtml.replace(
      /<\/body>/i,
      `${pixel}</body>`
    );

    return processedHtml;
  }
}

// Использование в вашем Email Sender
const tracker = new EmailTrackingHelper({
  baseUrl: 'https://freela.ge'
});

const recipientEmail = 'client@example.com';
const originalHtml = `
  <html>
    <body>
      <h1>Привет!</h1>
      <p>Посмотрите наши проекты:</p>
      <a href="https://freela.ge/projects">Все проекты</a>
      <a href="https://freela.ge/pricing">Тарифы</a>
    </body>
  </html>
`;

// Обработать HTML - все ссылки станут отслеживаемыми + pixel
const trackedHtml = tracker.processEmailHtml(originalHtml, recipientEmail);

// Отправить письмо с trackedHtml
sendEmail({
  to: recipientEmail,
  subject: 'Новые проекты на Freela',
  html: trackedHtml
});
```

---

## 4. Просмотр статистики

### SQL запрос для просмотра всех событий
```sql
SELECT
  id,
  email,
  "eventType",
  url,
  "userAgent",
  "ipAddress",
  "createdAt"
FROM "EmailTrackingEvent"
ORDER BY "createdAt" DESC
LIMIT 100;
```

### Статистика открытий по email
```sql
SELECT
  email,
  COUNT(*) as open_count,
  MAX("createdAt") as last_opened
FROM "EmailTrackingEvent"
WHERE "eventType" = 'OPEN'
GROUP BY email
ORDER BY open_count DESC;
```

### Статистика кликов по URL
```sql
SELECT
  url,
  COUNT(*) as click_count,
  COUNT(DISTINCT email) as unique_users
FROM "EmailTrackingEvent"
WHERE "eventType" = 'CLICK'
GROUP BY url
ORDER BY click_count DESC;
```

### Конверсия (открытия → клики) по email
```sql
SELECT
  email,
  COUNT(CASE WHEN "eventType" = 'OPEN' THEN 1 END) as opens,
  COUNT(CASE WHEN "eventType" = 'CLICK' THEN 1 END) as clicks,
  ROUND(
    100.0 * COUNT(CASE WHEN "eventType" = 'CLICK' THEN 1 END) /
    NULLIF(COUNT(CASE WHEN "eventType" = 'OPEN' THEN 1 END), 0),
    2
  ) as conversion_rate
FROM "EmailTrackingEvent"
GROUP BY email
HAVING COUNT(CASE WHEN "eventType" = 'OPEN' THEN 1 END) > 0
ORDER BY conversion_rate DESC;
```

---

## 5. База данных

### Схема таблицы EmailTrackingEvent
```prisma
model EmailTrackingEvent {
  id        String   @id @default(cuid())
  email     String   // Декодированный email получателя
  eventType String   // 'OPEN' или 'CLICK'
  url       String?  // Куда кликнули (только для CLICK)
  userAgent String?  // User-Agent браузера/клиента
  ipAddress String?  // IP адрес для дополнительной аналитики
  createdAt DateTime @default(now())

  @@index([email, eventType])
  @@index([createdAt])
}
```

### Прямой доступ к БД (production)
```bash
ssh root@76.13.144.121
cd /root/freela/deploy
docker compose -f docker-compose.prod.yml exec db psql -U freela -d freela
```

---

## 6. Безопасность и особенности

### ✅ Что реализовано
- **Graceful error handling** - сервер не падает при неправильных данных
- **Заголовки против кэширования** - каждое открытие письма отслеживается
- **Асинхронная запись в БД** - не блокирует ответ клиенту
- **Валидация URL** - проверка перед редиректом
- **Логирование** - все события пишутся в логи приложения
- **IP и User-Agent** - дополнительная аналитика

### ⚠️ Ограничения
- Pixel tracking не работает если:
  - Почтовый клиент блокирует загрузку изображений
  - Используется текстовый режим просмотра
  - Активны расширения для блокировки трекинга
- Click tracking не работает если:
  - Пользователь копирует ссылку вместо клика
  - Используется preview ссылок

---

## 7. Тестирование

### Локально
```bash
# Запустить тестовый скрипт
node test-tracking-encoding.js
```

### Production
```bash
# Pixel tracking
curl -I "https://freela.ge/api/tracking/pixel?data=dGVzdEBmcmVlbGEuZ2U="

# Click tracking
curl -I -L "https://freela.ge/api/tracking/click?url=aHR0cHM6Ly9mcmVlbGEuZ2UvcHJvamVjdHM=&email=dGVzdEBmcmVlbGEuZ2U="
```

---

## 8. Мониторинг

### Проверка логов
```bash
# На сервере
ssh root@76.13.144.121
cd /root/freela/deploy
docker compose -f docker-compose.prod.yml logs app -f | grep -i tracking
```

### Проверка базы данных
```bash
# Последние 10 событий
ssh root@76.13.144.121 "cd /root/freela/deploy && docker compose -f docker-compose.prod.yml exec -T db psql -U freela -d freela -c 'SELECT * FROM \"EmailTrackingEvent\" ORDER BY \"createdAt\" DESC LIMIT 10;'"
```

---

## Контакты

Если есть вопросы или нужна помощь с интеграцией - свяжитесь с разработчиком.

**Статус:** ✅ Деплой выполнен и протестирован 09.03.2026
