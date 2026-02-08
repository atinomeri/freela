function normalizeLocale(locale: string | undefined) {
  const l = String(locale ?? "").toLowerCase();
  if (l === "ru" || l.startsWith("ru-")) return "ru";
  if (l === "en" || l.startsWith("en-")) return "en";
  return "ka";
}

export function verifyEmailTemplate(params: { verifyUrl: string; ttlHours: number; locale?: string }) {
  const { verifyUrl, ttlHours } = params;
  const locale = normalizeLocale(params.locale);

  const strings =
    locale === "ru"
      ? {
          subject: "Подтвердите email — Freela",
          heading: "Подтверждение email",
          greeting: "Здравствуйте!",
          request: "Пожалуйста, подтвердите вашу электронную почту, чтобы завершить регистрацию.",
          ttlText: `Ссылка действительна ${ttlHours} ч.:`,
          ttlHtml: `Ссылка действительна <strong>${ttlHours} ч.</strong>.`,
          button: "Подтвердить email",
          fallback: "Если кнопка не работает, используйте эту ссылку:",
          ignore: "Если вы не регистрировались, просто игнорируйте это письмо.",
          sign: "— Freela"
        }
      : locale === "en"
        ? {
            subject: "Verify your email — Freela",
            heading: "Email verification",
            greeting: "Hello!",
            request: "Please verify your email address to complete your registration.",
            ttlText: `This link is valid for ${ttlHours} hours:`,
            ttlHtml: `This link is valid for <strong>${ttlHours} hours</strong>.`,
            button: "Verify email",
            fallback: "If the button doesn’t work, use this link:",
            ignore: "If you didn’t sign up, you can safely ignore this email.",
            sign: "— Freela"
          }
        : {
            subject: "ელ-ფოსტის დადასტურება — Freela",
            heading: "ელ-ფოსტის დადასტურება",
            greeting: "გამარჯობა!",
            request: "გთხოვთ, დაადასტუროთ თქვენი ელ-ფოსტა რეგისტრაციის დასასრულებლად.",
            ttlText: `ბმული მოქმედებს ${ttlHours} საათის განმავლობაში:`,
            ttlHtml: `ბმული მოქმედებს <strong>${ttlHours} საათის</strong> განმავლობაში.`,
            button: "ელ-ფოსტის დადასტურება",
            fallback: "თუ ღილაკი არ მუშაობს, გამოიყენეთ ეს ბმული:",
            ignore: "თუ რეგისტრაცია თქვენ არ გაგიკეთებიათ, უბრალოდ დააიგნორეთ ეს წერილი.",
            sign: "— Freela"
          };

  const text = [
    strings.greeting,
    "",
    strings.request,
    strings.ttlText,
    verifyUrl,
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
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 14px; background: #16a34a; color: #fff; border-radius: 8px; text-decoration: none;">
          ${strings.button}
        </a>
      </p>
      <p style="margin: 0 0 12px; color: #444; font-size: 14px;">
        ${strings.fallback}
        <br />
        <a href="${verifyUrl}">${verifyUrl}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="margin: 0; color: #666; font-size: 12px;">${strings.ignore}</p>
    </div>
  `.trim();

  return { subject: strings.subject, text, html };
}

