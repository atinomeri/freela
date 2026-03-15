import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { TopupForm } from "./topup-form";

export const metadata: Metadata = {
  title: "Top Up Balance",
  description: "Add balance to desktop app users",
};

export default async function AdminTopupPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role !== "ADMIN") {
    return (
      <Card className="p-6">
        <div className="font-medium">Access Denied</div>
        <div className="mt-2 text-sm text-muted-foreground">
          You need admin privileges to access this page.
        </div>
      </Card>
    );
  }

  // Fetch desktop users for the table
  const users = await prisma.desktopUser.findMany({
    select: {
      id: true,
      email: true,
      userType: true,
      firstName: true,
      lastName: true,
      companyName: true,
      balance: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="grid gap-8">
      {/* Top Up Form */}
      <Card className="p-6">
        <h1 className="text-xl font-semibold mb-1">Top Up Desktop User Balance</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Add balance to a desktop app user account (in GEL).
        </p>
        <TopupForm />
      </Card>

      {/* Desktop Users Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Desktop Users</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {users.length} registered desktop user{users.length !== 1 ? "s" : ""}
        </p>

        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No desktop users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Name / Company</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 pr-4 font-medium text-right">Balance (GEL)</th>
                  <th className="pb-2 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 pr-4 font-mono text-xs">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      {u.userType === "INDIVIDUAL"
                        ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"
                        : u.companyName || "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.userType === "COMPANY"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {u.userType === "COMPANY" ? "Company" : "Individual"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono">
                      {(u.balance / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5 text-muted-foreground">
                      {u.createdAt.toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
