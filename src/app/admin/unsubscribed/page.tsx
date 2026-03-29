import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { UnsubscribedTable } from "./unsub-table";

export const metadata: Metadata = {
  title: "Unsubscribed Emails — Admin",
  description: "Manage unsubscribed email addresses",
};

export default async function AdminUnsubscribedPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== "ADMIN") {
    return (
      <Card className="p-6">
        <div className="font-medium">Access Denied</div>
        <div className="mt-2 text-sm text-muted-foreground">
          You do not have permission to view this page.
        </div>
      </Card>
    );
  }

  const records = await prisma.unsubscribedEmail.findMany({
    orderBy: { createdAt: "desc" },
  });

  const items = records.map((r) => ({
    id: r.id,
    email: r.email,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Unsubscribed Emails</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length} email{items.length !== 1 ? "s" : ""} unsubscribed
        </p>
      </div>

      <UnsubscribedTable initialItems={items} />
    </div>
  );
}
