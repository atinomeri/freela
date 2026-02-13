import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { UsersTable } from "@/app/admin/users/users-table";
import { Prisma, Role } from "@prisma/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminUsers");
  return { title: t("title"), description: t("subtitle") };
}

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function toSingle(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const t = await getTranslations("adminUsers");
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
  const roleFilter = toSingle(sp.role).trim().toUpperCase();
  const disabledFilter = toSingle(sp.disabled).trim().toLowerCase();

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } }
    ];
  }
  if (roleFilter === "ADMIN" || roleFilter === "EMPLOYER" || roleFilter === "FREELANCER") {
    where.role = roleFilter as Role;
  }
  if (disabledFilter === "true") where.isDisabled = true;
  if (disabledFilter === "false") where.isDisabled = false;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      isDisabled: true,
      disabledAt: true,
      disabledReason: true,
      createdAt: true
    }
  });

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">{t("title")}</div>
          <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>
        </div>
      </div>

      <div className="mt-5">
        <UsersTable initialUsers={users} currentAdminUserId={session?.user?.id ?? ""} />
      </div>
    </Card>
  );
}

