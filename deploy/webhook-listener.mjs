#!/usr/bin/env node
/**
 * Simple GitHub Webhook Handler for Auto-Deployment
 * Run on VPS: node webhook-listener.mjs
 * 
 * Features:
 * - Listens for GitHub push events
 * - Auto-deploys when main branch is pushed
 * - Sends deployment status back to GitHub
 */

import http from "http";
import { spawn } from "child_process";
import { createHmac } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(__dirname, "..");
const PORT = process.env.WEBHOOK_PORT || 3001;
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || "your-secret-key";

function verifySignature(req, body) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const expected = `sha256=${createHmac("sha256", SECRET).update(body).digest("hex")}`;
  return signature === expected;
}

function deploy() {
  return new Promise((resolve, reject) => {
    console.log(`[${new Date().toISOString()}] Starting deployment...`);

    const deploy = spawn("bash", [path.join(APP_DIR, "deploy", "quick-deploy.sh"), "auto-deploy: webhook trigger"], {
      cwd: APP_DIR,
      stdio: "pipe",
    });

    let output = "";
    deploy.stdout.on("data", (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    deploy.stderr.on("data", (data) => {
      output += data.toString();
      process.stderr.write(data);
    });

    deploy.on("close", (code) => {
      if (code === 0) {
        console.log(`[${new Date().toISOString()}] ✓ Deployment successful`);
        resolve({ success: true, output });
      } else {
        console.log(`[${new Date().toISOString()}] ✗ Deployment failed with code ${code}`);
        reject(new Error(`Deployment failed: ${output}`));
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/deploy") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        // Verify GitHub signature
        if (!verifySignature(req, body)) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid signature" }));
          return;
        }

        const event = JSON.parse(body);

        // Only deploy on push to main branch
        if (event.ref === "refs/heads/main" && event.repository?.name === "freela") {
          console.log(`\n📨 GitHub webhook received: ${event.head_commit?.message || "push to main"}`);

          try {
            await deploy();
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "success", message: "Deployment completed" }));
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "error", message: error.message }));
          }
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ignored", reason: "Not main branch or wrong repo" }));
        }
      } catch (error) {
        console.error("Error processing webhook:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", listening: true }));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   GitHub Webhook Listener Running     ║
╚═══════════════════════════════════════╝

📡 Listening on port ${PORT}
   App directory: ${APP_DIR}

🔗 Webhook URL: https://freela.ge:${PORT}/deploy
   (Configure in GitHub Settings → Webhooks)

⚡ Auto-deploys on push to main branch

Press Ctrl+C to stop
  `);
});

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.close();
  process.exit(0);
});
