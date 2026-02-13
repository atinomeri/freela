import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { ProjectsTable } from "@/app/admin/projects/projects-table";
import { Prisma } from "@prisma/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminProjects");
  return { title: t("title"), description: t("subtitle") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function toSingle(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminProjectsPage({ searchParams }: Props) {
  const t = await getTranslations("adminProjects");
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

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
  const openFilter = toSingle(sp.open).trim().toLowerCase();

  const where: Prisma.ProjectWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } }
    ];
  }
  if (openFilter === "true") where.isOpen = true;
  if (openFilter === "false") where.isOpen = false;

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      city: true,
      isOpen: true,
      completedAt: true,
      createdAt: true,
      employer: { select: { id: true, name: true, email: true } }
    }
  });

  return (
    <Card className="p-6">
      <div>
        <div className="text-xl font-semibold">{t("title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>
      </div>

      <div className="mt-5">
        <ProjectsTable initialProjects={projects} />
      </div>
    </Card>
  );
}

