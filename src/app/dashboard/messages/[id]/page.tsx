import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { MessageComposer } from "@/app/dashboard/messages/message-composer";
import { MessageThread } from "@/app/dashboard/messages/[id]/message-thread";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboardThread");
  return { title: t("title"), description: t("subtitle") };
}

export default async function ThreadPage({ params }: Props) {
  const t = await getTranslations("dashboardThread");
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;
  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, title: true } },
      employer: { select: { id: true, name: true } },
      freelancer: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true } },
          attachments: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true } }
        }
      }
    }
  });

  if (!thread) notFound();
  const isParticipant = thread.employerId === session.user.id || thread.freelancerId === session.user.id;
  if (!isParticipant) notFound();

  const counterparty = session.user.role === "EMPLOYER" ? thread.freelancer.name : thread.employer.name;

  return (
    <Container className="py-12 sm:py-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{thread.project.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("conversation")}: {counterparty}
          </p>
        </div>
        <Link className="text-sm text-muted-foreground underline hover:text-foreground" href="/dashboard/messages">
          {t("allConversations")}
        </Link>
      </div>

      <Card className="mt-6 p-6">
        <MessageThread
          key={thread.messages[thread.messages.length - 1]?.id ?? "empty"}
          threadId={thread.id}
          currentUserId={session.user.id}
          initial={thread.messages.map((m) => ({
            id: m.id,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            deliveredAt: m.deliveredAt ? m.deliveredAt.toISOString() : null,
            readAt: m.readAt ? m.readAt.toISOString() : null,
            sender: { id: m.sender.id, name: m.sender.name },
            attachments: m.attachments
          }))}
        />
      </Card>

      <MessageComposer threadId={thread.id} />
    </Container>
  );
}
