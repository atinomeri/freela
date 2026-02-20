/**
 * Feature Flags System
 * Control feature rollout without code deployments
 */

import "server-only";
import { cacheGetOrSet, cacheDelete } from "./cache";
import { logInfo, type LogContext } from "./logger";

// ============================================
// Feature Flag Types
// ============================================

export type FeatureFlagValue = boolean | string | number | Record<string, unknown>;

export interface FeatureFlag {
  key: string;
  value: FeatureFlagValue;
  description?: string;
  enabled: boolean;
  /** Percentage of users to enable (0-100) for gradual rollout */
  rolloutPercentage?: number;
  /** Specific user IDs to enable/disable */
  userIds?: {
    enabled?: string[];
    disabled?: string[];
  };
  /** Environment-specific overrides */
  environments?: {
    development?: FeatureFlagValue;
    production?: FeatureFlagValue;
  };
}

// ============================================
// Default Feature Flags
// ============================================

const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  // Feature: New messaging system
  "messaging.v2": {
    key: "messaging.v2",
    value: true,
    description: "Enable new messaging system with read receipts",
    enabled: true,
    rolloutPercentage: 100,
  },

  // Feature: AI-powered recommendations
  "ai.recommendations": {
    key: "ai.recommendations",
    value: false,
    description: "Show AI-powered project recommendations",
    enabled: false,
    rolloutPercentage: 0,
  },

  // Feature: Premium features
  "premium.enabled": {
    key: "premium.enabled",
    value: true,
    description: "Enable premium subscription features",
    enabled: true,
  },

  // Feature: Maintenance mode
  "maintenance.mode": {
    key: "maintenance.mode",
    value: false,
    description: "Put the site in maintenance mode",
    enabled: false,
  },

  // Feature: Beta features
  "beta.features": {
    key: "beta.features",
    value: false,
    description: "Enable beta features for testing",
    enabled: false,
    userIds: {
      enabled: [], // Add beta tester user IDs here
    },
  },

  // Feature: Rate limit bypass
  "ratelimit.bypass": {
    key: "ratelimit.bypass",
    value: false,
    description: "Bypass rate limiting (for testing)",
    enabled: false,
    environments: {
      development: true,
      production: false,
    },
  },
};

// ============================================
// Flag Resolution
// ============================================

interface FlagContext {
  userId?: string;
  environment?: "development" | "production";
}

/**
 * Get all feature flags (with caching)
 */
async function getAllFlags(): Promise<Record<string, FeatureFlag>> {
  return cacheGetOrSet(
    "feature-flags:all",
    async () => {
      // In a real app, you'd load these from a database or external service
      // For now, we use the defaults defined above
      return DEFAULT_FLAGS;
    },
    { ttl: 60 } // Refresh every minute
  );
}

/**
 * Hash a user ID to a number between 0-99 for rollout percentage
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if a flag is enabled for a given context
 */
function isEnabledForContext(flag: FeatureFlag, context: FlagContext): boolean {
  // Check if globally disabled
  if (!flag.enabled) return false;

  // Check environment-specific override
  const env = context.environment ?? process.env.NODE_ENV as "development" | "production";
  if (flag.environments?.[env] !== undefined) {
    return !!flag.environments[env];
  }

  // Check user-specific overrides
  if (context.userId) {
    if (flag.userIds?.disabled?.includes(context.userId)) return false;
    if (flag.userIds?.enabled?.includes(context.userId)) return true;
  }

  // Check rollout percentage
  if (flag.rolloutPercentage !== undefined && context.userId) {
    const userHash = hashUserId(context.userId);
    return userHash < flag.rolloutPercentage;
  }

  return flag.enabled;
}

// ============================================
// Public API
// ============================================

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(
  key: string,
  context: FlagContext = {}
): Promise<boolean> {
  const flags = await getAllFlags();
  const flag = flags[key];

  if (!flag) {
    // Unknown flags default to false
    return false;
  }

  return isEnabledForContext(flag, context);
}

/**
 * Get a feature flag value
 */
export async function getFeatureValue<T extends FeatureFlagValue>(
  key: string,
  defaultValue: T,
  context: FlagContext = {}
): Promise<T> {
  const flags = await getAllFlags();
  const flag = flags[key];

  if (!flag || !isEnabledForContext(flag, context)) {
    return defaultValue;
  }

  return flag.value as T;
}

/**
 * Get all flags for a user (useful for client-side hydration)
 */
export async function getFlagsForUser(
  userId?: string
): Promise<Record<string, boolean>> {
  const flags = await getAllFlags();
  const context: FlagContext = { userId };
  const result: Record<string, boolean> = {};

  for (const [key, flag] of Object.entries(flags)) {
    result[key] = isEnabledForContext(flag, context);
  }

  return result;
}

/**
 * Update a feature flag (requires admin access)
 */
export async function updateFeatureFlag(
  key: string,
  updates: Partial<Omit<FeatureFlag, "key">>
): Promise<void> {
  // In a real app, you'd update this in a database
  // For now, we just invalidate the cache
  await cacheDelete("feature-flags:all");

  // Log the change
  logInfo(`[Feature Flag] Updated "${key}"`, updates as LogContext);
}

/**
 * Require a feature flag to be enabled, throw if not
 */
export async function requireFeature(
  key: string,
  context: FlagContext = {}
): Promise<void> {
  const enabled = await isFeatureEnabled(key, context);
  if (!enabled) {
    throw new Error(`Feature "${key}" is not enabled`);
  }
}
