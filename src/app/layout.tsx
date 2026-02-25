import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Georgian } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { PageTransition } from "@/components/page-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { LazyChatbox } from "@/components/lazy-chatbox";
import { site } from "@/lib/site";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import Script from "next/script"; // დამატებულია Google Analytics-ისთვის

export const runtime = "nodejs";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5c6cf9" },
    { media: "(prefers-color-scheme: dark)", color: "#5c6cf9" }
  ]
};

const inter = Inter({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-inter" });
const georgian = Noto_Sans_Georgian({ subsets: ["georgian"], display: "swap", variable: "--font-georgian" });

function ogLocale(locale: string) {
  if (locale === "ru" || locale.startsWith("ru-")) return "ru_RU";
  if (locale === "en" || locale.startsWith("en-")) return "en_US";
  return "ka_GE";
}

const defaultSeoTitle = "Freela.ge - ფრილანსერების პლატფორმა | პროექტები და შეკვეთები";
const defaultSeoDescription =
  "იპოვე პროექტები პროგრამირების, დიზაინისა და სხვა სფეროებში. განათავსე შეკვეთა და იპოვე საუკეთესო ფრილანსერი საქართველოში.";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const description = defaultSeoDescription;

  return {
    metadataBase: new URL(site.url),
    title: { default: defaultSeoTitle, template: `%s | Freela.ge` },
    description,
    alternates: { canonical: "/" },
    icons: {
      icon: [
        { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
      ],
      shortcut: "/icons/favicon-32x32.png",
      apple: [
        { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
      ]
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: site.name
    },
    openGraph: {
      type: "website",
      locale: ogLocale(locale),
      url: site.url,
      siteName: site.name,
      title: defaultSeoTitle,
      description
    },
    twitter: { card: "summary_large_image", title: defaultSeoTitle, description }
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
    const theme = stored === "light" || stored === "dark" ? stored : "light";
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  } catch {}
})();
`.trim();

  return (
    <html lang={locale} className={`${inter.variable} ${georgian.variable} light`} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5c6cf9" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        {/* Google Analytics - G-8QBS20Y7SM */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8QBS20Y7SM"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8QBS20Y7SM');
          `}
        </Script>

        <ThemeProvider defaultTheme="light">
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
                <LazyChatbox />
              </ToastProvider>
            </AuthSessionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}