"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MailerLoginPage } from "../../login-page";

export default function NewCampaignPage() {
  const { user, apiFetch } = useMailerAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return <MailerLoginPage />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await apiFetch("/api/desktop/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject,
          html: html || `<p>${subject}</p>`,
          senderName: senderName || undefined,
          senderEmail: senderEmail || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create campaign");
      }

      const data = await res.json();
      router.push(`/mailer/campaigns/${data.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/mailer/campaigns"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">New Campaign</h1>
      </div>

      <Card className="p-6" hover={false}>
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form className="grid gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Campaign Name *</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. April Newsletter"
              required
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Email Subject *</span>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Check out our latest updates"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Sender Name</span>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. John from Company"
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Sender Email</span>
              <Input
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                type="email"
                placeholder="e.g. john@company.com"
              />
            </label>
          </div>

          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">HTML Body *</span>
            <p className="text-xs text-muted-foreground">
              Use [[column_name]] for personalization placeholders
            </p>
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<p>Hello [[name]],</p><p>Your email content here...</p>"
              className="min-h-[200px] font-mono text-xs"
              required
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/mailer/campaigns")}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {saving ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
