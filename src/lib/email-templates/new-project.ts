function normalizeLocale(locale: string | undefined) {
  const l = String(locale ?? "").toLowerCase();
  if (l === "ru" || l.startsWith("ru-")) return "ru";
  if (l === "en" || l.startsWith("en-")) return "en";
  return "ka";
}

export function newProjectTemplate(params: {
  projectTitle: string;
  projectUrl: string;
  locale?: string;
}) {
  const { projectTitle, projectUrl } = params;
  const locale = normalizeLocale(params.locale);

  const strings =
    locale === "ru"
      ? {
          subject: "Новый заказ на Freela",
          heading: "Новый заказ",
          greeting: "Здравствуйте!",
          message: "На Freela появился новый заказ, который может вас заинтересовать:",
          projectLabel: "Заказ:",
          button: "Посмотреть заказ",
          fallback: "Если кнопка не работает, используйте эту ссылку:",
          unsubscribe: "Чтобы отписаться от уведомлений, зайдите в личный кабинет.",
          sign: "— Freela"
        }
      : locale === "en"
        ? {
            subject: "New project on Freela",
            heading: "New project",
            greeting: "Hello!",
            message: "A new project has been posted on Freela that may interest you:",
            projectLabel: "Project:",
            button: "View project",
            fallback: "If the button doesn't work, use this link:",
            unsubscribe: "To unsubscribe from notifications, go to your dashboard.",
            sign: "— Freela"
          }
        : {
            subject: "ახალი შეკვეთა Freela-ზე",
            heading: "ახალი შეკვეთა",
            greeting: "გამარჯობა!",
            message: "Freela-ზე გამოჩნდა ახალი შეკვეთა, რომელიც შეიძლება დაგაინტერესოთ:",
            projectLabel: "შეკვეთა:",
            button: "შეკვეთის ნახვა",
            fallback: "თუ ღილაკი არ მუშაობს, გამოიყენეთ ეს ბმული:",
            unsubscribe: "შეტყობინებების გასათიშად გადადით პირად კაბინეტში.",
            sign: "— Freela"
          };

  const text = [
    strings.greeting,
    "",
    strings.message,
    `${strings.projectLabel} ${projectTitle}`,
    projectUrl,
    "",
    strings.unsubscribe,
    "",
    strings.sign
  ].join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">${strings.heading}</h2>
      <p style="margin: 0 0 12px;">${strings.message}</p>
      <p style="margin: 0 0 16px;"><strong>${strings.projectLabel}</strong> ${projectTitle}</p>
      <p style="margin: 0 0 20px;">
        <a href="${projectUrl}" style="display: inline-block; padding: 10px 14px; background: #16a34a; color: #fff; border-radius: 8px; text-decoration: none;">
          ${strings.button}
        </a>
      </p>
      <p style="margin: 0 0 12px; color: #444; font-size: 14px;">
        ${strings.fallback}
        <br />
        <a href="${projectUrl}">${projectUrl}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="margin: 0; color: #666; font-size: 12px;">${strings.unsubscribe}</p>
    </div>
  `;

  return { subject: strings.subject, text, html };
}
