import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardMessages");
  return { title: t("title"), description: t("subtitle") };
}

export default async function MessagesPage() {
  const locale = await getLocale();
  const t = await getTranslations("dashboardMessages");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "EMPLOYER" && session.user.role !== "FREELANCER") redirect("/dashboard");

  const where =
    session.user.role === "EMPLOYER"
      ? { employerId: session.user.id }
      : { freelancerId: session.user.id };

  const threads = await prisma.thread.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      project: { select: { id: true, title: true } },
      employer: { select: { id: true, name: true } },
      freelancer: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true }
      }
    }
  });

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link className="text-sm text-muted-foreground underline hover:text-foreground" href="/dashboard">
          {t("dashboard")}
        </Link>
      </div>

      {threads.length === 0 ? (
        <Card className="mt-6 p-6">
          <div className="font-medium">{t("emptyTitle")}</div>
          <div className="mt-2 text-sm text-muted-foreground">{t("emptySubtitle")}</div>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4">
          {threads.map((thread) => {
            const counterparty = session.user.role === "EMPLOYER" ? thread.freelancer.name : thread.employer.name;
            const last = thread.messages[0];
            return (
              <Link key={thread.id} href={`/dashboard/messages/${thread.id}`} className="group">
                <Card className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{thread.project.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("with")}: {counterparty}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(
                        new Date(last?.createdAt ?? thread.updatedAt)
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {last?.body
                      ? last.body.length > 120
                        ? `${last.body.slice(0, 120)}…`
                        : last.body
                      : t("noMessages")}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </Container>
  );
}
