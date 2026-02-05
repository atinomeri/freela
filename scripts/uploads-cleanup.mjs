import pg from "pg";
import fs from "node:fs";
import path from "node:path";

function parseBoolean(v) {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

const DRY_RUN = parseBoolean(process.env.DRY_RUN);
const UPLOADS_DIR = process.env.UPLOADS_DIR?.trim() || path.join(process.cwd(), "data", "uploads");
const RETENTION_DAYS = Number.parseInt(process.env.UPLOAD_RETENTION_DAYS ?? "365", 10) || 365;

function requireEnv(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === "") throw new Error(`Missing env var: ${name}`);
  return String(v);
}

function listFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(abs);
      else if (e.isFile()) out.push(abs);
    }
  }
  return out;
}

function toRel(absPath) {
  return absPath.replace(UPLOADS_DIR, "").replace(/^[\\/]+/, "").replace(/\\/g, "/");
}

const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

const databaseUrl = requireEnv("DATABASE_URL");
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

let rows = [];
try {
  const res = await client.query('SELECT \"storagePath\", \"createdAt\" FROM \"MessageAttachment\"');
  rows = Array.isArray(res.rows) ? res.rows : [];
} finally {
  await client.end();
}

const keep = new Set(rows.map((a) => String(a.storagePath ?? "").replace(/\\/g, "/")).filter(Boolean));
const keepByPath = new Map(
  rows
    .map((a) => [String(a.storagePath ?? "").replace(/\\/g, "/"), a.createdAt ? new Date(a.createdAt) : null])
    .filter((x) => x[0])
);

const all = listFiles(UPLOADS_DIR);
let deleted = 0;
let wouldDelete = 0;

for (const abs of all) {
  const rel = toRel(abs);
  const createdAt = keepByPath.get(rel);
  const isOrphan = !keep.has(rel);
  const isExpired = createdAt instanceof Date && !Number.isNaN(createdAt.getTime()) ? createdAt < cutoff : false;

  if (isOrphan || isExpired) {
    if (DRY_RUN) {
      wouldDelete += 1;
      console.log("[dry-run] delete", rel, isOrphan ? "(orphan)" : "(expired)");
    } else {
      try {
        fs.unlinkSync(abs);
        deleted += 1;
      } catch {
        // ignore
      }
    }
  }
}

console.log(
  DRY_RUN
    ? `Cleanup dry-run complete. Would delete: ${wouldDelete}`
    : `Cleanup complete. Deleted: ${deleted}`
);
