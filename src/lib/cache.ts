/**
 * Redis caching layer for frequently accessed data
 * Provides typed cache operations with TTL support
 */

import "server-only";
import { createClient, type RedisClientType } from "redis";
import { logError, logDebug } from "./logger";

let client: RedisClientType | null = null;

function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url && url.length > 0 ? url : null;
}

async function getClient(): Promise<RedisClientType | null> {
  const url = getRedisUrl();
  if (!url) return null;

  if (client) return client;

  try {
    client = createClient({ url });
    client.on("error", (err) => {
      logError("Redis client error", err);
    });
    await client.connect();
    return client;
  } catch (err) {
    logError("Failed to connect to Redis", err);
    return null;
  }
}

// ============================================
// Cache Operations
// ============================================

export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Cache key prefix */
  prefix?: string;
}

const DEFAULT_TTL = 300; // 5 minutes
const KEY_PREFIX = "freela:cache:";

function buildKey(key: string, prefix?: string): string {
  return `${KEY_PREFIX}${prefix ?? ""}${key}`;
}

/**
 * Get a cached value
 */
export async function cacheGet<T>(key: string, options?: CacheOptions): Promise<T | null> {
  const redis = await getClient();
  if (!redis) return null;

  try {
    const fullKey = buildKey(key, options?.prefix);
    const data = await redis.get(fullKey);
    if (!data) return null;

    logDebug("Cache hit", { key: fullKey });
    return JSON.parse(data) as T;
  } catch (err) {
    logError("Cache get error", err, { key });
    return null;
  }
}

/**
 * Set a cached value
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<boolean> {
  const redis = await getClient();
  if (!redis) return false;

  try {
    const fullKey = buildKey(key, options?.prefix);
    const ttl = options?.ttl ?? DEFAULT_TTL;
    await redis.setEx(fullKey, ttl, JSON.stringify(value));
    logDebug("Cache set", { key: fullKey, ttl });
    return true;
  } catch (err) {
    logError("Cache set error", err, { key });
    return false;
  }
}

/**
 * Delete a cached value
 */
export async function cacheDelete(key: string, options?: CacheOptions): Promise<boolean> {
  const redis = await getClient();
  if (!redis) return false;

  try {
    const fullKey = buildKey(key, options?.prefix);
    await redis.del(fullKey);
    logDebug("Cache delete", { key: fullKey });
    return true;
  } catch (err) {
    logError("Cache delete error", err, { key });
    return false;
  }
}

/**
 * Delete all cached values matching a pattern
 */
export async function cacheDeletePattern(pattern: string, options?: CacheOptions): Promise<number> {
  const redis = await getClient();
  if (!redis) return 0;

  try {
    const fullPattern = buildKey(pattern, options?.prefix);
    let deleted = 0;
    let cursor = "0";
    do {
      const result = await redis.scan(cursor, { MATCH: fullPattern, COUNT: 100 });
      cursor = String(result.cursor);
      if (result.keys.length > 0) {
        deleted += await redis.del(result.keys);
      }
    } while (cursor !== "0");
    logDebug("Cache delete pattern", { pattern: fullPattern, deleted });
    return deleted;
  } catch (err) {
    logError("Cache delete pattern error", err, { pattern });
    return 0;
  }
}

/**
 * Get or set a cached value (cache-aside pattern)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) return cached;

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result (fire and forget)
  cacheSet(key, data, options).catch(() => {});

  return data;
}

// ============================================
// Specialized Cache Functions
// ============================================

/**
 * Cache user profile data
 */
export async function cacheUserProfile<T>(userId: string, data?: T): Promise<T | null> {
  const key = `user:${userId}:profile`;
  if (data !== undefined) {
    await cacheSet(key, data, { ttl: 600 }); // 10 minutes
    return data;
  }
  return cacheGet<T>(key);
}

/**
 * Invalidate user-related caches
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await cacheDeletePattern(`user:${userId}:*`);
}

/**
 * Cache project listing with pagination
 */
export async function cacheProjectListing<T>(
  filters: Record<string, unknown>,
  data?: T
): Promise<T | null> {
  const key = `projects:list:${JSON.stringify(filters)}`;
  if (data !== undefined) {
    await cacheSet(key, data, { ttl: 60 }); // 1 minute (changes frequently)
    return data;
  }
  return cacheGet<T>(key);
}

/**
 * Invalidate project listing caches
 */
export async function invalidateProjectListingCache(): Promise<void> {
  await cacheDeletePattern("projects:list:*");
}

/**
 * Cache freelancer listing
 */
export async function cacheFreelancerListing<T>(
  filters: Record<string, unknown>,
  data?: T
): Promise<T | null> {
  const key = `freelancers:list:${JSON.stringify(filters)}`;
  if (data !== undefined) {
    await cacheSet(key, data, { ttl: 120 }); // 2 minutes
    return data;
  }
  return cacheGet<T>(key);
}

/**
 * Invalidate freelancer listing caches
 */
export async function invalidateFreelancerListingCache(): Promise<void> {
  await cacheDeletePattern("freelancers:list:*");
}
