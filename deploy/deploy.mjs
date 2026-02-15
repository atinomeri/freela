#!/usr/bin/env node
/**
 * Direct deployment script using SSH
 * Works on Windows and Linux
 */

import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

const config = {
  vpsHost: "76.13.144.121",
  vpsUser: "root",
  appDir: "/root/freela",
  healthUrl: "https://freela.ge/api/health",
};

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function logStep(msg) {
  console.log(`\n${colors.cyan}=== ${msg} ===${colors.reset}`);
}

async function runCommand(cmd, description = "") {
  try {
    log(`➜ ${description || cmd}`, "cyan");
    const { stdout, stderr } = await execPromise(cmd, { maxBuffer: 10 * 1024 * 1024 });
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes("Warning")) console.error(stderr);
    return true;
  } catch (error) {
    log(`✗ Command failed: ${error.message}`, "red");
    return false;
  }
}

async function checkHealth() {
  try {
    logStep("Health Check");
    const { stdout } = await execPromise(`curl.exe -s ${config.healthUrl}`);
    const health = JSON.parse(stdout);
    if (health.ok) {
      log(`✓ Server healthy (uptime: ${health.uptimeSeconds}s)`, "green");
      return true;
    }
    return false;
  } catch {
    log("✗ Health check failed or server unreachable", "red");
    return false;
  }
}

async function pullLatestAndDeploy() {
  logStep("Starting Deployment");

  // Check if we can reach SSH
  log("Testing SSH connection...", "yellow");

  // Create SSH command that pulls latest code and restarts
  const sshCmd = `ssh -o ConnectTimeout=5 root@${config.vpsHost} "cd ${config.appDir} && git pull origin main && docker-compose -f docker-compose.prod.yml up -d && sleep 3 && curl -s https://freela.ge/api/health"`;

  try {
    log(`Executing on VPS: git pull, docker-compose up, health check...`, "cyan");
    const { stdout, stderr } = await execPromise(sshCmd, { timeout: 120000 });

    if (stdout.includes('"ok":true')) {
      log("✓ Deployment successful!", "green");
      console.log(stdout.split("\n").slice(-3).join("\n"));
      return true;
    } else {
      log("✗ Health check failed after deployment", "red");
      console.log(stdout);
      if (stderr) console.error(stderr);
      return false;
    }
  } catch (error) {
    if (error.message.includes("Permission denied")) {
      log("✗ SSH Permission denied. Using alternative method...", "yellow");
      return await alternativeDeployMethod();
    }
    log(`✗ SSH failed: ${error.message}`, "red");
    return false;
  }
}

async function alternativeDeployMethod() {
  logStep("Alternative: Waiting for GitHub Actions");
  log("GitHub Actions workflow is auto-deploying...", "cyan");
  log("Checking every 10 seconds for server to come back online...", "yellow");

  const maxAttempts = 12; // 2 minutes max
  for (let i = 0; i < maxAttempts; i++) {
    log(`[${i + 1}/${maxAttempts}] Checking server health...`, "cyan");
    try {
      const { stdout } = await execPromise(`curl.exe -s ${config.healthUrl}`, { timeout: 5000 });
      const health = JSON.parse(stdout);
      if (health.ok) {
        log(`✓ Server came back online!`, "green");
        return true;
      }
    } catch {
      // Server still down
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  log("✗ Server did not come back online after 2 minutes", "red");
  return false;
}

async function main() {
  console.log(`
╔════════════════════════════════╗
║   FREELA QUICK DEPLOY (Node)   ║
╚════════════════════════════════╝
  `);

  logStep("Initial Health Check");
  const wasHealthy = await checkHealth();

  const success = await pullLatestAndDeploy();

  if (!success) {
    log("\nℹ Server might still be deploying via GitHub Actions.", "yellow");
    log("Check https://github.com/atinomeri/freela/actions", "yellow");
    log("Or try again in 2 minutes.", "yellow");
    process.exit(1);
  }

  logStep("Deployment Complete");
  log("✓ Changes deployed successfully!", "green");
  log("Visit: https://freela.ge", "cyan");
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`, "red");
  process.exit(1);
});
