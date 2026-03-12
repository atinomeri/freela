import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { PrintButton } from "./print-button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardPrint");
  return { title: t("title") };
}

export default async function ProjectPrintPage({ params }: Props) {
  const locale = await getLocale();
  const t = await getTranslations("dashboardPrint");

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "EMPLOYER") redirect("/dashboard");

  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, employerId: session.user.id },
    select: {
      id: true,
      title: true,
      description: true,
      budgetGEL: true,
      city: true,
      createdAt: true,
      employer: { select: { name: true } }
    }
  });

  if (!project) notFound();

  const proposal = await prisma.proposal.findFirst({
    where: { projectId: id, status: "ACCEPTED" },
    select: {
      message: true,
      priceGEL: true,
      createdAt: true,
      freelancer: { select: { name: true } }
    }
  });

  if (!proposal) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-16">
        <div className="mb-6 print:hidden">
          <Link
            href={`/dashboard/projects/${id}`}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            {t("backButton")}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{t("noAcceptedProposal")}</p>
      </div>
    );
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="mx-auto max-w-3xl px-8 py-12">
      {/* UI controls – hidden when printing */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/projects/${id}`}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          {t("backButton")}
        </Link>
        <PrintButton label={t("printButton")} />
      </div>

      {/* Printable document */}
      <div className="rounded-2xl border border-border/70 bg-white p-10 shadow-sm print:rounded-none print:border-none print:p-0 print:shadow-none">
        {/* Header */}
        <div className="mb-8 border-b border-border/70 pb-6 text-center print:border-b-gray-300">
          <div className="text-2xl font-bold tracking-tight">freela.ge</div>
          <div className="mt-2 text-lg font-semibold">{t("title")}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {dateFormatter.format(new Date())}
          </div>
        </div>

        {/* Parties */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("employer")}
            </div>
            <div className="mt-2 text-base font-medium">{project.employer.name}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("freelancer")}
            </div>
            <div className="mt-2 text-base font-medium">{proposal.freelancer.name}</div>
          </div>
        </div>

        {/* Project details */}
        <div className="mb-8">
          <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("projectDetails")}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">{t("projectTitle")}</span>
              <span className="font-medium">{project.title}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">{t("projectCity")}</span>
              <span>{project.city}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">{t("projectBudget")}</span>
              <span>
                {project.budgetGEL ? `${project.budgetGEL} ₾` : t("notSpecified")}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">{t("projectDate")}</span>
              <span>{dateFormatter.format(new Date(project.createdAt))}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">
                {t("projectDescription")}
              </span>
              <span className="whitespace-pre-wrap">{project.description}</span>
            </div>
          </div>
        </div>

        {/* Proposal details */}
        <div className="mb-8">
          <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("proposalDetails")}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">{t("price")}</span>
              <span className="font-medium">
                {proposal.priceGEL ? `${proposal.priceGEL} ₾` : t("notSpecified")}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">{t("proposalDate")}</span>
              <span>{dateFormatter.format(new Date(proposal.createdAt))}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-36 shrink-0 text-muted-foreground">
                {t("proposalMessage")}
              </span>
              <span className="whitespace-pre-wrap">{proposal.message}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-12 border-t border-border/70 pt-8 print:border-t-gray-300">
          <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {t("signatures")}
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="text-xs text-muted-foreground">{t("signatureEmployer")}</div>
              <div className="mt-8 border-b border-border/70 print:border-b-gray-400" />
              <div className="mt-2 text-xs text-muted-foreground">{project.employer.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("signatureFreelancer")}</div>
              <div className="mt-8 border-b border-border/70 print:border-b-gray-400" />
              <div className="mt-2 text-xs text-muted-foreground">
                {proposal.freelancer.name}
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="text-xs text-muted-foreground">{t("signatureDate")}</div>
            <div className="mt-8 w-48 border-b border-border/70 print:border-b-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
