"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MailerLoginPage } from "../login-page";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail?: string | null;
  fromName?: string | null;
  trackOpens?: boolean;
  trackClicks?: boolean;
  hasPassword: boolean;
  source: "env" | "user";
}

interface ApiErrorShape {
  error?: string | { message?: string };
  message?: string;
}

export default function MailerSettingsPage() {
  const { user, apiFetch } = useMailerAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [host, setHost] = useState("");
  const [port, setPort] = useState("465");
  const [secure, setSecure] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [source, setSource] = useState<"env" | "user">("env");

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch("/api/desktop/smtp-config");
        if (!res.ok) throw new Error("Failed to load SMTP config");
        const body = (await res.json()) as { data: SmtpConfig };
        const data = body.data;
        setHost(data.host || "");
        setPort(String(data.port || 465));
        setSecure(Boolean(data.secure));
        setUsername(data.username || "");
        setFromEmail(data.fromEmail || "");
        setFromName(data.fromName || "");
        setTrackOpens(data.trackOpens ?? true);
        setTrackClicks(data.trackClicks ?? true);
        setHasPassword(Boolean(data.hasPassword));
        setSource(data.source);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load SMTP config");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [user, apiFetch]);

  if (!user) return <MailerLoginPage />;

  function parseError(body: ApiErrorShape | null, fallback: string): string {
    const apiErr = body?.error;
    if (typeof apiErr === "string") return apiErr;
    if (typeof apiErr?.message === "string") return apiErr.message;
    if (typeof body?.message === "string") return body.message;
    return fallback;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiFetch("/api/desktop/smtp-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port: Number(port),
          secure,
          username,
          password: password || undefined,
          fromEmail: fromEmail || null,
          fromName: fromName || null,
          trackOpens,
          trackClicks,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorShape | null;
        throw new Error(parseError(body, "Failed to save SMTP config"));
      }

      setHasPassword(true);
      setSource("user");
      setPassword("");
      setSuccess("SMTP settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save SMTP config");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">SMTP Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Current source: <span className="font-medium">{source === "user" ? "User config" : "Environment defaults"}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
          {success}
        </div>
      )}

      <Card className="p-6" hover={false}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <form className="grid gap-4" onSubmit={handleSave}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">SMTP host</span>
                <Input value={host} onChange={(e) => setHost(e.target.value)} required />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Port</span>
                <Input value={port} onChange={(e) => setPort(e.target.value)} required />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Username</span>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">
                  Password {hasPassword ? "(leave blank to keep current)" : ""}
                </span>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!hasPassword}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">From email</span>
                <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">From name</span>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
              </label>
            </div>

            <div className="grid gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                />
                Use secure connection (TLS/SSL)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={trackOpens}
                  onChange={(e) => setTrackOpens(e.target.checked)}
                />
                Enable open tracking
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={trackClicks}
                  onChange={(e) => setTrackClicks(e.target.checked)}
                />
                Enable click tracking
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={saving}>
                Save settings
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

