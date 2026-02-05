function normalizeLocale(locale: string | undefined) {
  const l = String(locale ?? "").toLowerCase();
  if (l === "ru" || l.startsWith("ru-")) return "ru";
  if (l === "en" || l.startsWith("en-")) return "en";
  return "ka";
}

export function passwordResetEmailTemplate(params: {
  resetUrl: string;
  ttlMinutes: number;
  locale?: string;
}) {
  const { resetUrl, ttlMinutes } = params;
  const locale = normalizeLocale(params.locale);

  const strings =
    locale === "ru"
      ? {
          subject: "Сброс пароля — Freela",
          heading: "Сброс пароля",
          greeting: "Здравствуйте!",
          request: "Получен запрос на сброс пароля.",
          ttlText: `Ссылка действует ${ttlMinutes} минут:`,
          ttlHtml: `Ссылка действует <strong>${ttlMinutes} минут</strong>.`,
          button: "Сменить пароль",
          fallback: "Если кнопка не работает, используйте эту ссылку:",
          ignore: "Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.",
          sign: "— Freela"
        }
      : locale === "en"
        ? {
            subject: "Password reset — Freela",
            heading: "Password reset",
            greeting: "Hello!",
            request: "A password reset request was received.",
            ttlText: `This link is valid for ${ttlMinutes} minutes:`,
            ttlHtml: `This link is valid for <strong>${ttlMinutes} minutes</strong>.`,
            button: "Change password",
            fallback: "If the button doesn’t work, use this link:",
            ignore: "If you didn’t request a password reset, you can safely ignore this email.",
            sign: "— Freela"
          }
        : {
            subject: "პაროლის აღდგენა — Freela",
            heading: "პაროლის აღდგენა",
            greeting: "გამარჯობა!",
            request: "მიღებულია პაროლის აღდგენის მოთხოვნა.",
            ttlText: `ბმული მოქმედებს ${ttlMinutes} წუთის განმავლობაში:`,
            ttlHtml: `ბმული მოქმედებს <strong>${ttlMinutes} წუთის</strong> განმავლობაში.`,
            button: "პაროლის შეცვლა",
            fallback: "თუ ღილაკი არ მუშაობს, გამოიყენეთ ეს ბმული:",
            ignore: "თუ თქვენ არ მოგითხოვიათ პაროლის აღდგენა, უბრალოდ დააიგნორეთ ეს შეტყობინება.",
            sign: "— Freela"
          };

  const text = [
    strings.greeting,
    "",
    strings.request,
    strings.ttlText,
    resetUrl,
    "",
    strings.ignore,
    "",
    strings.sign
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">${strings.heading}</h2>
      <p style="margin: 0 0 12px;">${strings.request}</p>
      <p style="margin: 0 0 16px;">${strings.ttlHtml}</p>
      <p style="margin: 0 0 20px;">
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 14px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none;">
          ${strings.button}
        </a>
      </p>
      <p style="margin: 0 0 12px; color: #444; font-size: 14px;">
        ${strings.fallback}
        <br />
        <a href="${resetUrl}">${resetUrl}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="margin: 0; color: #666; font-size: 12px;">${strings.ignore}</p>
    </div>
  `.trim();

  return { subject: strings.subject, text, html };
}
