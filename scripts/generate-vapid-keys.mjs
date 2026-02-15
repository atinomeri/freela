#!/usr/bin/env node
/**
 * Generate VAPID keys for Push Notifications
 * Run: node scripts/generate-vapid-keys.mjs
 * 
 * After running, add the output to your .env file:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY (shared with client)
 * - VAPID_PRIVATE_KEY (server-only, keep secret!)
 * - VAPID_SUBJECT (mailto: or https:// URL)
 */

import webpush from "web-push";

console.log("Generating VAPID keys for Push Notifications...\n");

const vapidKeys = webpush.generateVAPIDKeys();

console.log("Add these to your .env file:\n");
console.log("# Push Notifications (VAPID keys)");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log("VAPID_SUBJECT=mailto:support@freela.ge");
console.log("");
console.log("⚠️  IMPORTANT:");
console.log("  - VAPID_PRIVATE_KEY must be kept secret!");
console.log("  - Only NEXT_PUBLIC_VAPID_PUBLIC_KEY is exposed to the client");
console.log("  - Once in production, do NOT regenerate keys (subscriptions will break)");
