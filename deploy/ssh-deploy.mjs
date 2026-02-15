#!/usr/bin/env node
/**
 * Deploy to VPS using SSH with password authentication
 */

import { Client } from "ssh2";

const config = {
  host: "76.13.144.121",
  port: 22,
  username: "root",
  password: process.argv[2] || process.env.VPS_PASSWORD,
};

const deployCommands = `
cd /root/freela && \
echo "� Checking directory structure..." && \
ls -la && \
echo "📥 Pulling latest code..." && \
git pull origin main && \
echo "📂 Listing again after pull..." && \
ls -la && \
echo "🐳 Starting Docker containers..." && \
docker compose -f deploy/docker-compose.prod.yml up -d --build 2>/dev/null || \
docker compose up -d --build 2>/dev/null || \
docker-compose -f deploy/docker-compose.prod.yml up -d 2>/dev/null || \
docker-compose up -d && \
echo "⏳ Waiting for services..." && \
sleep 10 && \
echo "🏥 Health check:" && \
curl -s https://freela.ge/api/health
`;

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

async function deploy() {
  console.log(`
╔═══════════════════════════════════════╗
║     DEPLOYING TO VPS (SSH + Pass)     ║
╚═══════════════════════════════════════╝
  `);

  if (!config.password) {
    log("❌ Password not provided!", "red");
    log("Usage: node ssh-deploy.mjs <password>", "yellow");
    process.exit(1);
  }

  log(`🔗 Connecting to ${config.host}...`, "cyan");

  const conn = new Client();

  return new Promise((resolve, reject) => {
    conn.on("ready", () => {
      log("✅ Connected to VPS!", "green");
      log("\n📋 Running deployment commands...\n", "cyan");

      conn.exec(deployCommands, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        stream.on("close", (code) => {
          log(`\n═══════════════════════════════════════`, "cyan");
          if (code === 0) {
            log("✅ DEPLOYMENT SUCCESSFUL!", "green");
            log("\n🌐 Visit https://freela.ge and press Ctrl+Shift+R", "cyan");
          } else {
            log(`❌ Deployment finished with exit code: ${code}`, "red");
          }
          conn.end();
          resolve(code === 0);
        });

        stream.on("data", (data) => {
          process.stdout.write(data.toString());
        });

        stream.stderr.on("data", (data) => {
          process.stderr.write(colors.yellow + data.toString() + colors.reset);
        });
      });
    });

    conn.on("error", (err) => {
      log(`❌ SSH Error: ${err.message}`, "red");
      reject(err);
    });

    conn.connect(config);
  });
}

deploy()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    log(`❌ Fatal error: ${err.message}`, "red");
    process.exit(1);
  });
