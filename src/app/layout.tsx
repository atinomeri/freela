import type { Metadata } from "next";
import { Inter, Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { PageTransition } from "@/components/page-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { site } from "@/lib/site";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

export const runtime = "nodejs";

const inter = Inter({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-inter" });
const georgian = Noto_Sans_Georgian({ subsets: ["georgian"], display: "swap", variable: "--font-georgian" });

function ogLocale(locale: string) {
  if (locale === "ru" || locale.startsWith("ru-")) return "ru_RU";
  if (locale === "en" || locale.startsWith("en-")) return "en_US";
  return "ka_GE";
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("site");
  const description = t("metaDescription");

  return {
    metadataBase: new URL(site.url),
    title: { default: site.name, template: `%s · ${site.name}` },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      url: site.url,
      siteName: site.name,
      title: site.name,
      description
    },
    twitter: { card: "summary_large_image", title: site.name, description }
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const themeInitScript = `
(() => {
  try {
    const key = "freela-theme";
    const stored = window.localStorage.getItem(key);
    const theme = stored === "light" || stored === "dark" ? stored : "dark";
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  } catch {}
})();
`.trim();

  return (
    <html lang={locale} className={`${inter.variable} ${georgian.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider defaultTheme="dark">
          <NextIntlClientProvider locale={locale} messages={messages}>
            <AuthSessionProvider>
              <ToastProvider>
                <div className="min-h-dvh flex flex-col">
                  <SiteHeader />
                  <main className="flex-1">
                    <PageTransition>{children}</PageTransition>
                  </main>
                  <SiteFooter />
                </div>
              </ToastProvider>
            </AuthSessionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
