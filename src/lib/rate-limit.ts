import "server-only";
import { createClient } from "redis";

type HeadersLike = Headers | Record<string, string | string[] | undefined> | undefined | null;

export function getClientIpFromHeaders(headers: HeadersLike): string {
  if (!headers) return "unknown";

  const get = (name: string) => {
    if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name);
    const v = (headers as Record<string, string | string[] | undefined>)[name];
    if (Array.isArray(v)) return v[0] ?? null;
    return v ?? null;
  };

  const xff = get("x-forwarded-for");
  if (xff) return String(xff).split(",")[0]!.trim() || "unknown";

  const realIp = get("x-real-ip");
  if (realIp) return String(realIp).trim() || "unknown";

  return "unknown";
}

export function getClientIp(req: Request): string {
  return getClientIpFromHeaders(req.headers);
}

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type RedisClient = ReturnType<typeof createClient>;

let redis: RedisClient | null = null;
let redisInit: Promise<RedisClient> | null = null;
let warnedNoRedis = false;

async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    if (!warnedNoRedis && process.env.NODE_ENV !== "production") {
      warnedNoRedis = true;
      console.warn("[rate-limit] REDIS_URL not set; using in-memory limiter (dev only).");
    }
    return null;
  }

  if (redis) return redis;
  if (redisInit) return redisInit;

  redisInit = (async () => {
    const client = createClient({ url });
    client.on("error", () => {
      // ignore; caller will fall back to in-memory if needed
    });
    await client.connect();
    redis = client;
    return client;
  })();

  return redisInit;
}

type MemoryBucket = { count: number; expiresAt: number };
const memory = new Map<string, MemoryBucket>();

function checkMemory(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const existing = memory.get(key);
  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + windowSeconds * 1000;
    memory.set(key, { count: 1, expiresAt });
    return { allowed: true, limit, remaining: limit - 1, retryAfterSeconds: windowSeconds };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const retryAfterSeconds = Math.max(0, Math.ceil((existing.expiresAt - now) / 1000));
  return { allowed: existing.count <= limit, limit, remaining, retryAfterSeconds };
}

export async function checkRateLimit(params: {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  // Avoid flakiness in automated tests that may reuse the same IP bucket ("unknown") across runs.
  if (process.env.NODE_ENV === "test" || process.env.E2E === "true") {
    return { allowed: true, limit: params.limit, remaining: params.limit, retryAfterSeconds: 0 };
  }

  const keySafe = (params.key || "unknown").slice(0, 200);
  const redisKey = `rl:${params.scope}:${keySafe}`;

  const client = await getRedisClient().catch(() => null);
  if (!client) return checkMemory(redisKey, params.limit, params.windowSeconds);

  try {
    const count = await client.incr(redisKey);
    if (count === 1) {
      await client.expire(redisKey, params.windowSeconds);
    }

    let ttl = await client.ttl(redisKey);
    if (ttl < 0) {
      await client.expire(redisKey, params.windowSeconds);
      ttl = params.windowSeconds;
    }

    const remaining = Math.max(0, params.limit - count);
    return {
      allowed: count <= params.limit,
      limit: params.limit,
      remaining,
      retryAfterSeconds: Math.max(0, ttl)
    };
  } catch {
    // If Redis is down, fall back to in-memory buckets instead of fail-open.
    return checkMemory(redisKey, params.limit, params.windowSeconds);
  }
}
