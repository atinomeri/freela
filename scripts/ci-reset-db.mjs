import pg from "pg";

function requireEnv(name) {
  const v = process.env[name];
  if (!v || String(v).trim() === "") throw new Error(`Missing env var: ${name}`);
  return String(v);
}

const databaseUrl = requireEnv("DATABASE_URL");

// Safety guard: only allow in CI/test contexts.
const isAllowed =
  process.env.CI === "true" ||
  process.env.NODE_ENV === "test" ||
  process.env.E2E === "true" ||
  process.env.ALLOW_DB_RESET === "true";

if (!isAllowed) {
  throw new Error("Refusing to reset DB. Set CI=true (or E2E=true or ALLOW_DB_RESET=true) to allow.");
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  // Fresh schema for deterministic tests.
  await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
  await client.query("CREATE SCHEMA public;");
} finally {
  await client.end();
}

console.log("DB schema reset OK.");

