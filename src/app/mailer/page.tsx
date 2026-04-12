"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Mail, Users, Send, BarChart3 } from "lucide-react";
import { MailerLoginPage } from "./login-page";
import { useTranslations } from "next-intl";

interface DashboardStats {
  totalCampaigns: number;
  totalContactLists: number;
  totalSent: number;
  openRate: number;
  clickRate: number;
}

export default function MailerDashboard() {
  const { user, apiFetch } = useMailerAuth();
  const t = useTranslations("mailer");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      try {
        const [campaignsRes, contactsRes, trackingRes] = await Promise.all([
          apiFetch("/api/desktop/campaigns?limit=1"),
          apiFetch("/api/desktop/contact-lists?limit=1"),
          apiFetch("/api/tracking/stats"),
        ]);

        const campaigns = campaignsRes.ok ? await campaignsRes.json() : null;
        const contacts = contactsRes.ok ? await contactsRes.json() : null;
        const tracking = trackingRes.ok ? await trackingRes.json() : null;

        const campaignsMeta = campaigns?.meta ?? campaigns?.pagination;
        const contactsMeta = contacts?.meta ?? contacts?.pagination;

        setStats({
          totalCampaigns: Number(campaignsMeta?.total ?? 0),
          totalContactLists: Number(contactsMeta?.total ?? 0),
          totalSent: Number(tracking?.total_sent ?? 0),
          openRate: Number(tracking?.open_rate ?? 0),
          clickRate: Number(tracking?.click_rate ?? 0),
        });
      } catch {
        // Silently fail — dashboard will show without stats
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [user, apiFetch]);

  if (!user) return <MailerLoginPage />;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.welcomeBack", { email: user.email })}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6" hover={false}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-semibold">
                {loading ? "—" : stats?.totalCampaigns ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">{t("dashboard.campaigns")}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6" hover={false}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-2xl font-semibold">
                {loading ? "—" : stats?.totalContactLists ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">{t("dashboard.contactLists")}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:col-span-2 lg:col-span-1" hover={false}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
              <Send className="h-5 w-5 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-semibold">
                {loading ? "—" : stats?.totalSent ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">{t("dashboard.emailsSent")}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:col-span-2 lg:col-span-1" hover={false}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold">
                {loading ? "—" : `${stats?.openRate ?? 0}% / ${stats?.clickRate ?? 0}%`}
              </div>
              <div className="text-xs text-muted-foreground">{t("dashboard.openClickRate")}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="mt-6 p-6" hover={false}>
        <h2 className="mb-4 text-sm font-semibold">{t("dashboard.quickActions")}</h2>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/mailer/campaigns/new" variant="primary" size="sm">
            <Mail className="h-4 w-4" />
            {t("actions.newCampaign")}
          </ButtonLink>
          <ButtonLink href="/mailer/contacts" variant="secondary" size="sm">
            <Users className="h-4 w-4" />
            {t("actions.manageContacts")}
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
