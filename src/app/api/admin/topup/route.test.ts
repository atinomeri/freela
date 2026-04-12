import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  adjustDesktopUserBalance,
  createDesktopLedgerEntry,
  createDesktopPayment,
} from "@/lib/desktop-billing";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    desktopUser: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/desktop-billing", () => ({
  adjustDesktopUserBalance: vi.fn(),
  createDesktopLedgerEntry: vi.fn(),
  createDesktopPayment: vi.fn(),
}));

describe("POST /api/admin/topup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without admin session", async () => {
    (getServerSession as any).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/admin/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", amount: 100 }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("creates payment + ledger on successful topup", async () => {
    (getServerSession as any).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });
    (prisma.desktopUser.findUnique as any).mockResolvedValue({
      id: "desktop-user-1",
      email: "user@example.com",
    });

    const tx = {};
    (prisma.$transaction as any).mockImplementation((cb: any) => cb(tx));
    (adjustDesktopUserBalance as any).mockResolvedValue({ before: 100, after: 300 });
    (createDesktopPayment as any).mockResolvedValue({ id: "payment-1" });
    (createDesktopLedgerEntry as any).mockResolvedValue({ id: "ledger-1" });

    const response = await POST(
      new Request("http://localhost/api/admin/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          amount: 200,
          reason: "manual correction",
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.payment_id).toBe("payment-1");
    expect(adjustDesktopUserBalance).toHaveBeenCalledWith(tx, "desktop-user-1", 200);
    expect(createDesktopPayment).toHaveBeenCalled();
    expect(createDesktopLedgerEntry).toHaveBeenCalled();
  });
});
