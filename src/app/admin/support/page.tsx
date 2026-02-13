import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SupportInboxControls } from "@/app/admin/support/support-inbox-controls";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toSingle(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateTime(value: Date) {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminSupport");
  return { title: t("title"), description: t("subtitle") };
}

export default async function AdminSupportPage({ searchParams }: Props) {
  const t = await getTranslations("adminSupport");
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
  const selectedIdRaw = toSingle(sp.thread);

  const threads = await prisma.supportThread.findMany({
    orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      lastMessageAt: true,
      requesterName: true,
      requesterEmail: true,
      requesterUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, senderRole: true, createdAt: true }
      }
    }
  });

  const selectedId = threads.some((t) => t.id === selectedIdRaw) ? selectedIdRaw : threads[0]?.id ?? "";

  const selectedThread = selectedId
    ? await prisma.supportThread.findUnique({
        where: { id: selectedId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          lastMessageAt: true,
          requesterName: true,
          requesterEmail: true,
          requesterUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          messages: {
            orderBy: { createdAt: "asc" },
            take: 300,
            select: {
              id: true,
              body: true,
              senderRole: true,
              createdAt: true,
              senderUser: { select: { id: true, name: true, email: true } }
            }
          }
        }
      })
    : null;

  return (
    <Card className="p-6">
      <div>
        <div className="text-xl font-semibold">{t("title")}</div>
        <div className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-border bg-background/40">
          <div className="border-b border-border px-3 py-2 text-sm font-medium">{t("threadsTitle")}</div>
          <div className="max-h-[70vh] overflow-y-auto">
            {threads.length === 0 ? (
              <div className="px-3 py-6 text-sm text-muted-foreground">{t("empty")}</div>
            ) : (
              threads.map((thread) => {
                const active = thread.id === selectedId;
                const identity =
                  thread.requesterUser?.name ||
                  thread.requesterUser?.email ||
                  thread.requesterName ||
                  thread.requesterEmail ||
                  thread.id.slice(0, 12);
                const preview = thread.messages[0]?.body?.slice(0, 80) || t("noMessages");
                return (
                  <Link
                    key={thread.id}
                    href={`/admin/support?thread=${encodeURIComponent(thread.id)}`}
                    className={[
                      "block border-b border-border px-3 py-3 hover:bg-muted/30",
                      active ? "bg-primary/10" : ""
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-medium">{identity}</div>
                      <span
                        className={[
                          "rounded border px-1.5 py-0.5 text-[10px]",
                          thread.status === "OPEN"
                            ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-600/30 bg-amber-500/10 text-amber-400"
                        ].join(" ")}
                      >
                        {thread.status}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preview}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{formatDateTime(thread.lastMessageAt)}</div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-background/40 p-4">
          {!selectedThread ? (
            <div className="text-sm text-muted-foreground">{t("selectThread")}</div>
          ) : (
            <>
              <div className="grid gap-1 border-b border-border pb-3">
                <div className="text-sm font-medium">{t("threadInfo")}</div>
                <div className="text-xs text-muted-foreground">
                  {t("status")}: {selectedThread.status}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("requester")}:{" "}
                  {selectedThread.requesterUser?.name ||
                    selectedThread.requesterUser?.email ||
                    selectedThread.requesterName ||
                    selectedThread.requesterEmail ||
                    selectedThread.id.slice(0, 12)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("createdAt")}: {formatDateTime(selectedThread.createdAt)}
                </div>
              </div>

              <div className="grid max-h-[52vh] gap-3 overflow-y-auto pr-1">
                {selectedThread.messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t("noMessages")}</div>
                ) : (
                  selectedThread.messages.map((m) => {
                    const mine = m.senderRole === "ADMIN";
                    const senderName =
                      m.senderUser?.name || (m.senderRole === "ADMIN" ? t("adminLabel") : t("visitorLabel"));
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                            mine ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}
                        >
                          <div className="text-[10px] opacity-80">
                            {senderName} · {m.senderRole}
                          </div>
                          <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
                          <div className="mt-1 text-[10px] opacity-70">{formatDateTime(m.createdAt)}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <SupportInboxControls threadId={selectedThread.id} status={selectedThread.status} />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
