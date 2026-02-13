import type { Metadata } from "next";
import crypto from "node:crypto";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authVerifyEmail");
  return { title: t("title"), description: t("subtitle") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const t = await getTranslations("authVerifyEmail");
  const sp = (await searchParams) ?? {};
  const token = typeof sp.token === "string" ? sp.token.trim() : "";

  let message = "";

  if (!token) {
    message = t("missingToken");
  } else if (!("emailVerificationToken" in prisma)) {
    message = t("serverRestartRequired");
  } else {
    const tokenHash = sha256(token);
    const rows = await prisma.$queryRaw<
      Array<{ id: string; userId: string; emailVerifiedAt: Date | null }>
    >`
      SELECT t."id", t."userId", u."emailVerifiedAt"
      FROM "EmailVerificationToken" t
      JOIN "User" u ON u."id" = t."userId"
      WHERE t."tokenHash" = ${tokenHash}
        AND t."usedAt" IS NULL
        AND t."expiresAt" > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      message = t("invalidToken");
    } else {
      await prisma.$transaction([
        prisma.$executeRaw`
          UPDATE "User"
          SET "emailVerifiedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${row.userId}
            AND "emailVerifiedAt" IS NULL
        `,
        prisma.$executeRaw`
          UPDATE "EmailVerificationToken"
          SET "usedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${row.id}
            AND "usedAt" IS NULL
        `
      ]);
      message = t("success");
    }
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-md">
        <h1 className="text-center text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-6 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm text-foreground">
          {message}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link className="underline hover:text-foreground" href="/auth/login">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </Container>
  );
}
