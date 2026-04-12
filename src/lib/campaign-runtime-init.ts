import { ensureCampaignSchedulerStarted } from "@/lib/campaign-scheduler";
import { ensureCampaignWorkerStarted } from "@/lib/campaign-worker-init";

declare global {
  var __freelaCampaignRuntimeStarted: boolean | undefined;
}

/**
 * Ensure campaign worker and scheduler are running in this process.
 */
export function ensureCampaignRuntimeStarted(): boolean {
  if (globalThis.__freelaCampaignRuntimeStarted) return true;

  const workerStarted = ensureCampaignWorkerStarted();
  const schedulerStarted = ensureCampaignSchedulerStarted();
  const started = workerStarted || schedulerStarted;

  if (started) {
    globalThis.__freelaCampaignRuntimeStarted = true;
  }

  return started;
}

