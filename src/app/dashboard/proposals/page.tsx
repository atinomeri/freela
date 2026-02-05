import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { proposalStatusLabel } from "@/lib/proposal-status";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardProposals");
  return { title: t("title"), description: t("subtitle") };
}

export default async function MyProposalsPage() {
  const locale = await getLocale();
  const t = await getTranslations("dashboardProposals");
  const tStatuses = await getTranslations("proposalStatus");

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "FREELANCER") redirect("/dashboard");

  const proposals = await prisma.proposal.findMany({
    where: { freelancerId: session.user.id },
    include: { project: { select: { id: true, title: true, budgetGEL: true, city: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link className="text-sm text-muted-foreground underline hover:text-foreground" href="/projects">
          {t("viewProjects")}
        </Link>
      </div>

      {proposals.length === 0 ? (
        <Card className="mt-6 p-6">
          <div className="font-medium">{t("emptyTitle")}</div>
          <div className="mt-2 text-sm text-muted-foreground">{t("emptySubtitle")}</div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4">
          {proposals.map((p) => (
            <Card key={p.id} className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{p.project.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("sent")}:{" "}
                    {new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(
                      new Date(p.createdAt)
                    )}
                  </div>
                </div>
                <Badge>{proposalStatusLabel(p.status, tStatuses)}</Badge>
              </div>
              <div className="mt-2 text-sm">
                {t("budget")} {p.project.budgetGEL ? `${p.project.budgetGEL} ₾` : t("notSpecified")}
              </div>
              <div className="mt-3 text-xs">
                <Link className="underline text-muted-foreground hover:text-foreground" href={`/projects/${p.project.id}`}>
                  {t("viewProject")}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
