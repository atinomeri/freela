"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYER" | "FREELANCER" | "ADMIN";
  emailVerifiedAt: string | Date | null;
  isDisabled: boolean;
  disabledAt: string | Date | null;
  disabledReason: string | null;
  createdAt: string | Date;
};

function fmtDate(value: string | Date | null) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; errorCode?: string; error?: string } | null;
  if (!res.ok || !json?.ok) {
    const errorCode = json?.errorCode || "REQUEST_FAILED";
    throw new Error(errorCode);
  }
}

export function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const t = useTranslations("adminUsersTable");
  const tErrors = useTranslations("apiErrors");
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
  }, [filter, users]);

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("filterPlaceholder")}
          className="max-w-sm"
        />
        <Button
          variant="secondary"
          onClick={() => {
            router.refresh();
          }}
        >
          {t("refresh")}
        </Button>
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-3 py-2">{t("cols.user")}</th>
              <th className="px-3 py-2">{t("cols.role")}</th>
              <th className="px-3 py-2">{t("cols.verified")}</th>
              <th className="px-3 py-2">{t("cols.disabled")}</th>
              <th className="px-3 py-2">{t("cols.created")}</th>
              <th className="px-3 py-2">{t("cols.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const pending = pendingId === u.id;
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    <div className="text-[10px] text-muted-foreground">{u.id}</div>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-9 rounded-md border border-border bg-background/70 px-2"
                      value={u.role}
                      disabled={pending}
                      onChange={async (e) => {
                        const nextRole = e.target.value as UserRow["role"];
                        setPendingId(u.id);
                        setError("");
                        try {
                          await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/role`, { role: nextRole });
                          setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
                        } catch (e: any) {
                          setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
                        } finally {
                          setPendingId(null);
                        }
                      }}
                    >
                      <option value="EMPLOYER">EMPLOYER</option>
                      <option value="FREELANCER">FREELANCER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{u.emailVerifiedAt ? t("yes") : t("no")}</div>
                    {u.emailVerifiedAt ? (
                      <div className="text-[10px] text-muted-foreground">{fmtDate(u.emailVerifiedAt)}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-xs">{u.isDisabled ? t("yes") : t("no")}</div>
                    {u.isDisabled && u.disabledReason ? (
                      <div className="text-[10px] text-muted-foreground line-clamp-2 max-w-[260px]">{u.disabledReason}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(u.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pending || Boolean(u.emailVerifiedAt)}
                        onClick={async () => {
                          setPendingId(u.id);
                          setError("");
                          try {
                            await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/verify-email`, {});
                            setUsers((prev) =>
                              prev.map((x) => (x.id === u.id ? { ...x, emailVerifiedAt: new Date().toISOString() } : x))
                            );
                          } catch (e: any) {
                            setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
                          } finally {
                            setPendingId(null);
                          }
                        }}
                      >
                        {t("verifyEmail")}
                      </Button>

                      <Button
                        size="sm"
                        variant={u.isDisabled ? "secondary" : "destructive"}
                        disabled={pending}
                        onClick={async () => {
                          const reason = u.isDisabled ? "" : window.prompt(t("disablePrompt")) ?? "";
                          if (!u.isDisabled && reason.trim().length === 0) return;
                          setPendingId(u.id);
                          setError("");
                          try {
                            const nextDisabled = !u.isDisabled;
                            await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/disable`, {
                              isDisabled: nextDisabled,
                              reason: nextDisabled ? reason : ""
                            });
                            setUsers((prev) =>
                              prev.map((x) =>
                                x.id === u.id
                                  ? {
                                      ...x,
                                      isDisabled: nextDisabled,
                                      disabledAt: nextDisabled ? new Date().toISOString() : null,
                                      disabledReason: nextDisabled ? reason : null
                                    }
                                  : x
                              )
                            );
                          } catch (e: any) {
                            setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
                          } finally {
                            setPendingId(null);
                          }
                        }}
                      >
                        {u.isDisabled ? t("enable") : t("disable")}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={async () => {
                          const confirm = window.prompt(t("deletePrompt", { email: u.email })) ?? "";
                          if (confirm.trim() !== u.email) return;
                          setPendingId(u.id);
                          setError("");
                          try {
                            await postJson(`/api/admin/users/${encodeURIComponent(u.id)}/delete`, {});
                            setUsers((prev) => prev.filter((x) => x.id !== u.id));
                          } catch (e: any) {
                            setError(tErrors(String(e?.message ?? "REQUEST_FAILED")));
                          } finally {
                            setPendingId(null);
                          }
                        }}
                      >
                        {t("delete")}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-muted-foreground" colSpan={6}>
                  {t("empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
