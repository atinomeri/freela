import { Container } from "@/components/ui/container";
import { site } from "@/lib/site";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Github, Linkedin, Twitter, Mail } from "lucide-react";
import { getDisabledPaths } from "@/lib/site-pages";

export async function SiteFooter() {
  const tNav = await getTranslations("nav");
  const tFooter = await getTranslations("footer");
  const tSite = await getTranslations("site");

  const platformLinks = [
    { href: "/projects", label: tNav("projects") },
    { href: "/freelancers", label: tNav("freelancers") },
    { href: "/pricing", label: tNav("pricing") }
  ] as const;
  
  const companyLinks = [
    { href: "/about", label: tNav("about") },
    { href: "/contact", label: tNav("contact") },
  ] as const;
  
  const legalLinks = [
    { href: "/legal/terms", label: tFooter("terms") },
    { href: "/legal/privacy", label: tFooter("privacy") },
  ] as const;

  const disabled = await getDisabledPaths([
    ...platformLinks.map((l) => l.href),
    ...companyLinks.map((l) => l.href),
    ...legalLinks.map((l) => l.href)
  ]);

  const platformVisible = platformLinks.filter((l) => !disabled.has(l.href));
  const companyVisible = companyLinks.filter((l) => !disabled.has(l.href));
  const legalVisible = legalLinks.filter((l) => !disabled.has(l.href));

  return (
    <footer className="border-t bg-muted/30">
      <Container className="py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                F
              </div>
              <span className="text-lg font-bold">{site.name}</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              {tSite("description")}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="#" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold">{tFooter("platform")}</h3>
            <ul className="mt-4 space-y-3">
              {platformVisible.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold">{tFooter("company")}</h3>
            <ul className="mt-4 space-y-3">
              {companyVisible.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
              {legalVisible.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold">{tFooter("contact")}</h3>
            <div className="mt-4 space-y-3">
              <a 
                href={`mailto:${site.supportEmail}`} 
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                {site.supportEmail}
              </a>
              <p className="text-sm text-muted-foreground">
                {tFooter("support")}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {site.name}. {tFooter("rights")}
          </p>
          <div className="text-sm text-muted-foreground">{tFooter("madeWith")}</div>
        </div>
      </Container>
    </footer>
  );
}
