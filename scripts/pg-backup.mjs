import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function requireEnv(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === "") {
    throw new Error(`Missing env var: ${name}`);
  }
  return String(v);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}-${pad(d.getSeconds())}`;
}

const databaseUrl = requireEnv("DATABASE_URL");
const outDir = process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : path.resolve("backups");
fs.mkdirSync(outDir, { recursive: true });

const outFile = path.join(outDir, `freela_${timestamp()}.dump`);

const res = spawnSync(
  "pg_dump",
  [
    "--no-owner",
    "--no-privileges",
    "--format=custom",
    "--file",
    outFile,
    "--dbname",
    databaseUrl
  ],
  { stdio: "inherit" }
);

if (res.error) {
  throw new Error(
    `Failed to run pg_dump. Ensure Postgres client tools are installed and pg_dump is on PATH.\n${res.error.message}`
  );
}
if (res.status !== 0) {
  process.exit(res.status ?? 1);
}

console.log(`Backup written: ${outFile}`);

