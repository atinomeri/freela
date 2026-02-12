import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { ReviewsTable } from "@/app/admin/reviews/reviews-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminReviews");
  return { title: t("title"), description: t("subtitle") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function toSingle(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminReviewsPage({ searchParams }: Props) {
  const t = await getTranslations("adminReviews");
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;

  if (role !== "ADMIN") {
    return (
      <Card className="p-6">
        <div className="font-medium">{t("forbiddenTitle")}</div>
        <div className="mt-2 text-sm text-muted-foreground">{t("forbiddenSubtitle")}</div>
      </Card>
    );
  }

  const sp = (await searchParams) ?? {};
  const q = toSingle(sp.q).trim();
  const state = toSingle(sp.state).trim().toLowerCase();

  const where: any = {};
  if (state === "approved") where.isApproved = true;
  if (state === "pending") where.isApproved = false;
  if (q) {
    where.OR = [
      { comment: { contains: q, mode: "insensitive" } },
      { reviewer: { name: { contains: q, mode: "insensitive" } } },
      { freelancer: { name: { contains: q, mode: "insensitive" } } },
      { project: { title: { contains: q, mode: "insensitive" } } }
    ];
  }

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      rating: true,
      comment: true,
      isApproved: true,
      approvedAt: true,
      createdAt: true,
      reviewer: { select: { id: true, name: true, email: true } },
      freelancer: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, title: true } }
    }
  });

  return (
    <Card className="p-6">
      <div>
        <div className="text-xl font-semibold">{t("title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>
      </div>

      <div className="mt-5">
        <ReviewsTable initialReviews={reviews} />
      </div>
    </Card>
  );
}
