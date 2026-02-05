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

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

const args = parseArgs(process.argv);
const databaseUrl = requireEnv("DATABASE_URL");
const fileArg = args.file || args.f;
if (!fileArg) {
  console.error("Usage: node scripts/pg-restore.mjs --file=./backups/xxx.dump");
  process.exit(1);
}

const file = path.resolve(fileArg);
if (!fs.existsSync(file)) {
  console.error(`Backup file not found: ${file}`);
  process.exit(1);
}

const res = spawnSync(
  "pg_restore",
  [
    "--no-owner",
    "--no-privileges",
    "--clean",
    "--if-exists",
    "--dbname",
    databaseUrl,
    file
  ],
  { stdio: "inherit" }
);

if (res.error) {
  throw new Error(
    `Failed to run pg_restore. Ensure Postgres client tools are installed and pg_restore is on PATH.\n${res.error.message}`
  );
}
if (res.status !== 0) {
  process.exit(res.status ?? 1);
}

console.log("Restore completed.");

