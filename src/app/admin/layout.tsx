import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("adminNav");

  return (
    <Container className="py-10 sm:py-12">
      <div className="mb-8 flex flex-wrap items-center gap-3 text-sm">
        <Link className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:bg-muted/40" href="/admin">
          {t("dashboard")}
        </Link>
        <Link className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:bg-muted/40" href="/admin/users">
          {t("users")}
        </Link>
        <Link className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:bg-muted/40" href="/admin/projects">
          {t("projects")}
        </Link>
        <Link
          className="rounded-md border border-border bg-background/60 px-3 py-1.5 hover:bg-muted/40"
          href="/admin/content/pricing"
        >
          {t("content")}
        </Link>
        <Link className="ml-auto text-muted-foreground underline hover:text-foreground" href="/dashboard">
          {t("backToDashboard")}
        </Link>
      </div>

      {children}
    </Container>
  );
}

