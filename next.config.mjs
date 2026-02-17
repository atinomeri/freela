import createNextIntlPlugin from "next-intl/plugin";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let withBundleAnalyzer = (config) => config;
if (process.env.ANALYZE === "true") {
  try {
    const bundleAnalyzer = require("@next/bundle-analyzer");
    const factory = typeof bundleAnalyzer === "function" ? bundleAnalyzer : bundleAnalyzer.default;
    if (typeof factory === "function") {
      withBundleAnalyzer = factory({ enabled: true });
    }
  } catch {
    // analyzer is optional in runtime images where devDependencies are pruned
  }
}

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [
      {
        pathname: "/api/avatars",
        search: "?**"
      }
    ]
  },
  poweredByHeader: false,
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
    ];

    const prodOnly = isProd
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains"
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              // Next.js uses inline scripts; keep CSP meaningful while staying compatible.
              "script-src 'self' 'unsafe-inline'",
              // Allow same-origin APIs and optional Sentry ingest.
              "connect-src 'self' https://*.ingest.sentry.io",
              "upgrade-insecure-requests"
            ].join("; ")
          }
        ]
      : [];

    return [
      {
        source: "/:path*",
        headers: [...base, ...prodOnly]
      },
      {
        source: "/icon.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }]
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }]
      }
    ];
  }
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
