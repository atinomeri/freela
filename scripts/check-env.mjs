import fs from "node:fs";
import path from "node:path";

function requireEnv(name) {
  const value = process.env[name];
  if (value && String(value).trim().length > 0) return value;
  throw new Error(
    [
      `Missing required env var: ${name}.`,
      `Set it in your environment (recommended for production) or create a .env.local file in the project root and add:`,
      ``,
      `NEXTAUTH_URL=http://localhost:3000`,
      `NEXTAUTH_SECRET=<generate a strong secret>`,
      ``,
      `You can copy .env.example as a starting point.`
    ].join("\n")
  );
}

// Load env files if they exist (this preflight runs before Next.js loads env).
// Precedence (closest to Next.js): .env.[mode].local > .env.local > .env.[mode] > .env
const initialKeys = new Set(Object.keys(process.env));

function tryLoad(file) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (initialKeys.has(key)) continue;
    if (!process.env[key]) process.env[key] = value;
  }
}

const mode = process.env.NODE_ENV || "development";
tryLoad(".env");
tryLoad(`.env.${mode}`);
tryLoad(".env.local");
tryLoad(`.env.${mode}.local`);

requireEnv("NEXTAUTH_URL");
requireEnv("NEXTAUTH_SECRET");
requireEnv("DATABASE_URL");

// REDIS_URL is required for multi-instance realtime, but keep it optional for quick local dev.
if (process.env.NODE_ENV === "production") {
  requireEnv("REDIS_URL");
} else if (!process.env.REDIS_URL) {
  console.warn("Warning: REDIS_URL not set. Realtime events will not work across multiple instances.");
}

console.log("Env check OK: NEXTAUTH_URL, NEXTAUTH_SECRET, DATABASE_URL are set.");
