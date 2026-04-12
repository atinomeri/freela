import "server-only";

import { prisma } from "@/lib/prisma";
import { enqueueCampaignSend } from "@/lib/campaign-queue";
import { ensureCampaignWorkerStarted } from "@/lib/campaign-worker-init";

declare global {
  var __freelaCampaignSchedulerTimer: NodeJS.Timeout | undefined;
  var __freelaCampaignSchedulerRunning: boolean | undefined;
}

const POLL_MS = Math.max(
  5_000,
  parseInt(process.env.CAMPAIGN_SCHEDULER_POLL_MS || "30000", 10),
);
const MAX_BATCH = 25;

async function queueDueCampaigns(): Promise<void> {
  if (globalThis.__freelaCampaignSchedulerRunning) return;
  globalThis.__freelaCampaignSchedulerRunning = true;

  try {
    const dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: "DRAFT",
        scheduledAt: { lte: new Date() },
        contactListId: { not: null },
      },
      orderBy: { scheduledAt: "asc" },
      take: MAX_BATCH,
      select: {
        id: true,
        desktopUserId: true,
        contactList: { select: { contactCount: true } },
      },
    });

    if (dueCampaigns.length === 0) return;

    ensureCampaignWorkerStarted();

    for (const campaign of dueCampaigns) {
      const contactCount = campaign.contactList?.contactCount ?? 0;
      if (contactCount <= 0) continue;

      const updated = await prisma.campaign.updateMany({
        where: {
          id: campaign.id,
          status: "DRAFT",
        },
        data: {
          status: "QUEUED",
          totalCount: contactCount,
        },
      });
      if (updated.count === 0) continue;

      const jobId = await enqueueCampaignSend(campaign.id, campaign.desktopUserId);
      if (!jobId) {
        await prisma.campaign.updateMany({
          where: { id: campaign.id, status: "QUEUED" },
          data: { status: "DRAFT" },
        });
      }
    }
  } catch (err) {
    console.error("[Campaign Scheduler] Tick error:", err);
  } finally {
    globalThis.__freelaCampaignSchedulerRunning = false;
  }
}

export function ensureCampaignSchedulerStarted(): boolean {
  if (globalThis.__freelaCampaignSchedulerTimer) return true;

  globalThis.__freelaCampaignSchedulerTimer = setInterval(() => {
    void queueDueCampaigns();
  }, POLL_MS);

  globalThis.__freelaCampaignSchedulerTimer.unref?.();
  void queueDueCampaigns();
  console.log(`[Campaign Scheduler] Started (poll ${POLL_MS}ms)`);
  return true;
}

