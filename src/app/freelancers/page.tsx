import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { FreelancersFilters } from "@/app/freelancers/freelancers-filters";
import { getFreelancerCategoryLabel, isFreelancerCategory } from "@/lib/categories";
import { getLocale, getTranslations } from "next-intl/server";
import { Link as I18nLink } from "@/i18n/navigation";
import { isPageEnabled } from "@/lib/site-pages";
import { getPageOverride } from "@/lib/site-page-content";
import { SitePageOverride } from "@/components/site-page-override";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("freelancers");
  return { title: t("title"), description: t("description") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function normalizeSkills(input: unknown) {
  if (Array.isArray(input)) return input.map(String);
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return input.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export default async function FreelancersPage({ searchParams }: Props) {
  const locale = await getLocale();
  const override = await getPageOverride("/freelancers", locale);
  if (!(await isPageEnabled("/freelancers"))) notFound();
  const t = await getTranslations("freelancers");
  const tCategories = await getTranslations("categories");
  if (override) return <SitePageOverride title={override.title} body={override.body} />;

  const sp = (await searchParams) ?? {};
  const qRaw = typeof sp.q === "string" ? sp.q.trim() : "";
  const q = qRaw.length >= 2 ? qRaw.slice(0, 100) : "";
  const categoryRaw = typeof sp.category === "string" ? sp.category.trim() : "";
  const category = isFreelancerCategory(categoryRaw) ? categoryRaw : "";
  const minRate = typeof sp.minRate === "string" ? sp.minRate.trim() : "";
  const maxRate = typeof sp.maxRate === "string" ? sp.maxRate.trim() : "";
  const sort =
    sp.sort === "rate_asc" ? "rate_asc" : sp.sort === "rate_desc" ? "rate_desc" : "new";
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(typeof sp.pageSize === "string" ? sp.pageSize : "12", 10) || 12));

  const buildWhere = (includeSkills: boolean) => {
    const where: any = { user: { role: "FREELANCER" } };
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } }
      ];
      if (includeSkills) {
        where.OR.push({ skills: { contains: q, mode: "insensitive" } });
      }
    }
    if (minRate || maxRate) {
      where.hourlyGEL = {};
      if (minRate && Number.isFinite(Number(minRate))) where.hourlyGEL.gte = Number.parseInt(minRate, 10);
      if (maxRate && Number.isFinite(Number(maxRate))) where.hourlyGEL.lte = Number.parseInt(maxRate, 10);
    }
    return where;
  };

  const orderBy: Prisma.ProfileOrderByWithRelationInput[] =
    sort === "rate_asc"
      ? [{ hourlyGEL: "asc" }, { updatedAt: "desc" }]
      : sort === "rate_desc"
        ? [{ hourlyGEL: "desc" }, { updatedAt: "desc" }]
        : [{ updatedAt: "desc" }];

  let total = 0;
  let freelancers = [];
  try {
    const where = buildWhere(true);
    [total, freelancers] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, name: true } } }
      })
    ]);
  } catch {
    const where = buildWhere(false);
    [total, freelancers] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, name: true } } }
      })
    ]);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages && total > 0) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (minRate) params.set("minRate", minRate);
    if (maxRate) params.set("maxRate", maxRate);
    if (sort !== "new") params.set("sort", sort);
    if (pageSize !== 12) params.set("pageSize", String(pageSize));
    params.set("page", String(totalPages));
    redirect(`/freelancers?${params.toString()}`);
  }

  const withPage = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (minRate) params.set("minRate", minRate);
    if (maxRate) params.set("maxRate", maxRate);
    if (sort !== "new") params.set("sort", sort);
    if (pageSize !== 12) params.set("pageSize", String(pageSize));
    params.set("page", String(nextPage));
    return `/freelancers?${params.toString()}`;
  };

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <ButtonLink href="/auth/register" variant="secondary">
          {t("createProfile")}
        </ButtonLink>
      </div>

      <div className="mt-6">
        <FreelancersFilters initial={{ q, category, minRate, maxRate, sort }} />
        <div className="mt-2 text-sm text-muted-foreground">{t("found", { count: total })}</div>
      </div>

      {freelancers.length === 0 ? (
        <Card className="mt-6 p-6">
          <div className="font-medium">{t("emptyTitle")}</div>
          <div className="mt-2 text-sm text-muted-foreground">{t("emptyDescription")}</div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {freelancers.map((f) => {
            const skills = normalizeSkills(f.skills);
            const categoryLabel = getFreelancerCategoryLabel(f.category, tCategories);
            return (
              <I18nLink key={f.user.id} href={`/freelancers/${f.user.id}`} className="group">
                <Card className="p-6 h-full">
                  <div className="font-medium">{f.user.name}</div>
                  <div className="text-sm text-muted-foreground">{f.title ?? t("defaultTitle")}</div>
                  {categoryLabel ? (
                    <div className="mt-3">
                      <Badge className="border-primary/30 bg-primary/5 text-primary">{categoryLabel}</Badge>
                    </div>
                  ) : null}
                  <div className="mt-3 text-sm text-muted-foreground">
                    {f.bio ? (f.bio.length > 120 ? `${f.bio.slice(0, 120)}…` : f.bio) : t("bioMissing")}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("rateLabel")}</span>
                    <span className="font-medium">{f.hourlyGEL ? t("rateValue", { rate: f.hourlyGEL }) : t("rateMissing")}</span>
                  </div>
                  {skills.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {skills.slice(0, 6).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-5 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    {t("viewProfile")} →
                  </div>
                </Card>
              </I18nLink>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
        <div>{t("pageInfo", { page, pages: totalPages, total })}</div>
        <div className="flex gap-2">
          <ButtonLink href={page > 1 ? withPage(page - 1) : "#"} variant="secondary" aria-disabled={page <= 1}>
            {t("prev")}
          </ButtonLink>
          <ButtonLink href={page < totalPages ? withPage(page + 1) : "#"} variant="secondary" aria-disabled={page >= totalPages}>
            {t("next")}
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
