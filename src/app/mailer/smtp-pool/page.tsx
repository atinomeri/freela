"use client";

import { useMailerAuth } from "@/lib/mailer-auth";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MailerLoginPage } from "../login-page";
import { Plus, Trash2 } from "lucide-react";

interface PoolAccount {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string | null;
  fromName: string | null;
  active: boolean;
  failCount: number;
  priority: number;
}

interface ApiErrorShape {
  error?: string | { message?: string };
  message?: string;
}

export default function SmtpPoolPage() {
  const { user, apiFetch } = useMailerAuth();
  const [items, setItems] = useState<PoolAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [host, setHost] = useState("");
  const [port, setPort] = useState("465");
  const [secure, setSecure] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [priority, setPriority] = useState("0");

  const loadPool = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/desktop/smtp-pool");
      if (!res.ok) throw new Error("Failed to load SMTP pool");
      const body = await res.json();
      setItems(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SMTP pool");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (user) {
      void loadPool();
    }
  }, [user, loadPool]);

  if (!user) return <MailerLoginPage />;

  function parseError(body: ApiErrorShape | null, fallback: string): string {
    const apiErr = body?.error;
    if (typeof apiErr === "string") return apiErr;
    if (typeof apiErr?.message === "string") return apiErr.message;
    if (typeof body?.message === "string") return body.message;
    return fallback;
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await apiFetch("/api/desktop/smtp-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port: Number(port),
          secure,
          username,
          password,
          fromEmail: fromEmail || null,
          fromName: fromName || null,
          priority: Number(priority),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorShape | null;
        throw new Error(parseError(body, "Failed to add SMTP account"));
      }
      setHost("");
      setPort("465");
      setSecure(true);
      setUsername("");
      setPassword("");
      setFromEmail("");
      setFromName("");
      setPriority("0");
      await loadPool();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add SMTP account");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(account: PoolAccount) {
    setError("");
    try {
      const res = await apiFetch(`/api/desktop/smtp-pool/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !account.active }),
      });
      if (!res.ok) throw new Error("Failed to update account state");
      await loadPool();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account state");
    }
  }

  async function removeAccount(id: string) {
    setError("");
    try {
      const res = await apiFetch(`/api/desktop/smtp-pool/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete account");
      await loadPool();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">SMTP Pool</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rotate multiple SMTP accounts for campaign sending
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="mb-4 p-6" hover={false}>
        <form className="grid gap-4" onSubmit={addAccount}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1.5 text-sm lg:col-span-2">
              <span className="font-medium">SMTP host</span>
              <Input value={host} onChange={(e) => setHost(e.target.value)} required />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Port</span>
              <Input value={port} onChange={(e) => setPort(e.target.value)} required />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Priority</span>
              <Input value={priority} onChange={(e) => setPriority(e.target.value)} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1.5 text-sm lg:col-span-2">
              <span className="font-medium">Username</span>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label className="grid gap-1.5 text-sm lg:col-span-2">
              <span className="font-medium">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1.5 text-sm lg:col-span-2">
              <span className="font-medium">From email (optional)</span>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm lg:col-span-2">
              <span className="font-medium">From name (optional)</span>
              <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={secure}
              onChange={(e) => setSecure(e.target.checked)}
            />
            Use secure TLS/SSL
          </label>

          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              <Plus className="h-4 w-4" />
              Add SMTP account
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6" hover={false}>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No SMTP pool accounts configured.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {item.username} @ {item.host}:{item.port}
                    </span>
                    <Badge size="sm" variant={item.active ? "success" : "secondary"}>
                      {item.active ? "Active" : "Disabled"}
                    </Badge>
                    <Badge size="sm" variant="outline">P{item.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Failures: {item.failCount}
                    {item.fromEmail ? ` • From: ${item.fromEmail}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(item)}>
                    {item.active ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeAccount(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

