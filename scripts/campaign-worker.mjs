#!/usr/bin/env node

/**
 * Standalone Campaign Worker Process
 *
 * Run with: node --import tsx scripts/campaign-worker.mjs
 *   or:     npx tsx scripts/campaign-worker.mjs
 *
 * Required env vars:
 *   DATABASE_URL  — PostgreSQL connection string
 *   REDIS_URL     — Redis connection string (e.g. redis://localhost:6379)
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Optional env vars:
 *   CAMPAIGN_BATCH_SIZE     — contacts per batch (default: 50)
 *   CAMPAIGN_DELAY_MIN_MS   — min delay between emails (default: 200)
 *   CAMPAIGN_DELAY_MAX_MS   — max delay between emails (default: 1000)
 *   CAMPAIGN_BATCH_PAUSE_MS — pause between batches (default: 5000)
 *   TRACK_OPENS=true        — enable open tracking
 *   TRACKING_PIXEL_URL      — pixel endpoint URL
 *   TRACK_CLICKS=true       — enable click tracking
 *   CLICK_TRACKING_URL      — click redirect endpoint URL
 */

import "dotenv/config";

// Remove "server-only" restriction for standalone worker
// by patching the module resolution before importing worker code
import { register } from "node:module";

// Dynamically import the worker
const { startCampaignWorker, stopCampaignWorker } = await import(
  "../src/lib/campaign-worker.ts"
);

console.log("─────────────────────────────────────");
console.log("  Campaign Worker Process");
console.log("─────────────────────────────────────");
console.log(`  REDIS_URL:    ${process.env.REDIS_URL || "(not set)"}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? "✓ configured" : "✗ missing"}`);
console.log(`  SMTP_HOST:    ${process.env.SMTP_HOST || "(not set)"}`);
console.log(`  BATCH_SIZE:   ${process.env.CAMPAIGN_BATCH_SIZE || "50 (default)"}`);
console.log("─────────────────────────────────────");

const worker = startCampaignWorker();

if (!worker) {
  console.error("Failed to start worker. Check REDIS_URL.");
  process.exit(1);
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  await stopCampaignWorker();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
