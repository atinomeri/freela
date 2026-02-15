#!/usr/bin/env node
/**
 * Monitor deployment until latest code is live
 */

import { execSync } from "child_process";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(msg, color = "reset") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${msg}${colors.reset}`);
}

function getCommit(remote = false) {
  try {
    if (remote) {
      // Check GitHub commit
      const output = execSync(`curl -s https://api.github.com/repos/atinomeri/freela/commits/main --header="Authorization: token ${process.env.GITHUB_TOKEN || ''}" 2>/dev/null`).toString();
      const data = JSON.parse(output);
      return data.sha?.substring(0, 7) || null;
    } else {
      // Check local
      return execSync("git rev-parse HEAD").toString().trim().substring(0, 7);
    }
  } catch {
    return null;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`
╔═══════════════════════════════════╗
║   MONITORING DEPLOYMENT STATUS    ║
╚═══════════════════════════════════╝
  `);

  const local = getCommit();
  log(`Local HEAD:     ${local}`, "green");

  const maxWait = 30; // 30 x 10 sec = 5 minutes
  for (let i = 0; i < maxWait; i++) {
    try {
      const response = execSync("curl.exe -s https://freela.ge/api/health").toString();
      const health = JSON.parse(response);

      // Server is online
      log(`Server OK (uptime: ${health.uptimeSeconds}s, response: ${health.ms}ms)`, "green");

      if (i > 0) {
        log("✓ Server is live! Hard refresh your browser with Ctrl+Shift+R", "green");
        process.exit(0);
      }
    } catch {
      if (i === 0) {
        log("Server appears to be restarting for deployment...", "yellow");
      }
    }

    if (i < maxWait - 1) {
      log(`Waiting... (${i + 1}/${maxWait} checks)`, "cyan");
      await sleep(10000);
    }
  }

  log("Deployment check complete. Visit https://freela.ge and hard refresh (Ctrl+Shift+R)", "cyan");
  log("If changes still don't appear, check GitHub Actions: https://github.com/atinomeri/freela/actions", "yellow");
}

main();
