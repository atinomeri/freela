import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ProjectsFilters } from "@/app/projects/projects-filters";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFreelancerCategoryLabel, isFreelancerCategory } from "@/lib/categories";
import { formatLongDate } from "@/lib/date";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("projects");
  return { title: t("title"), description: t("description") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ProjectsPage({ searchParams }: Props) {
  const locale = await getLocale();
  const t = await getTranslations("projects");
  const tCategories = await getTranslations("categories");

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/auth/login`);
  if (session.user.role !== "FREELANCER") redirect(`/dashboard`);

  const sp = (await searchParams) ?? {};
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const q = qRaw.length >= 2 ? qRaw.slice(0, 100) : "";
  const categoryRaw = typeof sp.category === "string" ? sp.category.trim() : "";
  const category = isFreelancerCategory(categoryRaw) ? categoryRaw : "";
  const minBudget = typeof sp.minBudget === "string" ? sp.minBudget.trim() : "";
  const maxBudget = typeof sp.maxBudget === "string" ? sp.maxBudget.trim() : "";
  const sort =
    sp.sort === "budget_asc"
      ? "budget_asc"
      : sp.sort === "budget_desc" || sp.sort === "budget"
        ? "budget_desc"
        : "new";
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(typeof sp.pageSize === "string" ? sp.pageSize : "12", 10) || 12));

  const where: any = {};
  where.isOpen = true;
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } }
    ];
  }
  if (minBudget || maxBudget) {
    where.budgetGEL = {};
    if (minBudget && Number.isFinite(Number(minBudget))) where.budgetGEL.gte = Number.parseInt(minBudget, 10);
    if (maxBudget && Number.isFinite(Number(maxBudget))) where.budgetGEL.lte = Number.parseInt(maxBudget, 10);
  }

  const orderBy: Prisma.ProjectOrderByWithRelationInput[] =
    sort === "budget_asc"
      ? [{ budgetGEL: "asc" }, { createdAt: "desc" }]
      : sort === "budget_desc"
        ? [{ budgetGEL: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const withPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (minBudget) params.set("minBudget", minBudget);
    if (maxBudget) params.set("maxBudget", maxBudget);
    if (sort !== "new") params.set("sort", sort);
    if (pageSize !== 12) params.set("pageSize", String(pageSize));
    params.set("page", String(nextPage));
    return `/projects?${params.toString()}`;
  };

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, title: true, category: true, createdAt: true, budgetGEL: true, description: true }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages && total > 0) {
    redirect(withPage(totalPages));
  }
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ButtonLink href="/dashboard/proposals" variant="secondary">
          {t("myProposals")}
        </ButtonLink>
      </div>

      <div className="mt-6">
        <ProjectsFilters initial={{ q, category, minBudget, maxBudget, sort }} />
        <div className="mt-2 text-sm text-muted-foreground">{t("found", { count: total })}</div>
      </div>

      <div className="mt-6 grid gap-4">
        {projects.length === 0 ? (
          <Card className="p-6">
            <div className="font-medium">{t("emptyTitle")}</div>
            <div className="mt-2 text-sm text-muted-foreground">{t("emptyDescription")}</div>
          </Card>
        ) : (
          projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="group">
              <Card className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    {p.category ? (
                      <div className="mt-2">
                        <Badge className="border-primary/30 bg-primary/5 text-primary">
                          {getFreelancerCategoryLabel(p.category, tCategories)}
                        </Badge>
                      </div>
                    ) : null}
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{t("added")}:</span> {formatLongDate(p.createdAt, locale)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {p.description.length > 140 ? `${p.description.slice(0, 140)}…` : p.description}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {p.budgetGEL ? `${p.budgetGEL} ₾` : t("budgetMissing")}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <div>{t("pageInfo", { page, pages: totalPages, total })}</div>
        <div className="flex gap-2">
          <ButtonLink href={canPrev ? withPage(page - 1) : "#"} variant="secondary" aria-disabled={!canPrev}>
            {t("prev")}
          </ButtonLink>
          <ButtonLink href={canNext ? withPage(page + 1) : "#"} variant="secondary" aria-disabled={!canNext}>
            {t("next")}
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
