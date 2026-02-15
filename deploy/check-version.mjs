#!/usr/bin/env node
/**
 * Check current deployment version on server
 */

import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

async function getLocalCommit() {
  try {
    const { stdout } = await execPromise("git rev-parse HEAD");
    return stdout.trim().substring(0, 7);
  } catch (e) {
    return null;
  }
}

async function getServerCommit() {
  try {
    const cmd = `ssh -o ConnectTimeout=5 root@76.13.144.121 "cd /root/freela && git rev-parse HEAD 2>/dev/null || echo 'unknown'"`;
    const { stdout } = await execPromise(cmd, { timeout: 10000 });
    return stdout.trim().substring(0, 7);
  } catch {
    return null;
  }
}

async function main() {
  console.log("🔍 Checking deployment status...\n");

  const local = await getLocalCommit();
  console.log(`Local commit:  ${local}`);

  const server = await getServerCommit();
  console.log(`Server commit: ${server || "unreachable via SSH"}`);

  if (local === server) {
    console.log("\n✅ Server is up-to-date!");
  } else if (!server) {
    console.log("\n⏳ Cannot verify via SSH. Checking health...");
    try {
      const { stdout } = await execPromise("curl.exe -s https://freela.ge/api/health");
      const health = JSON.parse(stdout);
      console.log(`\n✓ Server is online and healthy`);
      console.log(`  Uptime: ${health.uptimeSeconds}s`);
      console.log(`  Response time: ${health.ms}ms`);
      console.log("\n📝 Note: SSH is blocked, but server is responding.");
      console.log("Try refreshing https://freela.ge with Ctrl+Shift+R (hard refresh)");
    } catch (e) {
      console.log("\n✗ Server is not responding");
    }
  } else {
    console.log("\n⚠️  Server is outdated!");
    console.log(`   Local: ${local} vs Server: ${server}`);
    console.log("\nWaiting for GitHub Actions to deploy...");
  }
}

main();
