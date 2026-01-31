import { db, rateLimits } from "./db";
import { and, eq, gt, sql } from "drizzle-orm";

/**
 * Rate limit configuration
 */
export const RATE_LIMITS = {
  confession: { limit: 1, windowSeconds: 3600 }, // 1 per hour
  comment: { limit: 1, windowSeconds: 30 }, // 1 per 30 seconds
  vote: { limit: 20, windowSeconds: 3600 }, // 20 per hour
} as const;

export type ActionType = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check if an action is allowed under rate limits.
 * Does NOT record the action - call recordAction separately after success.
 */
export async function checkRateLimit(
  fingerprint: string,
  actionType: ActionType
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[actionType];
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000);

  // Count recent actions of this type
  const recentActions = await db
    .select({ count: sql<number>`count(*)` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.agentFingerprint, fingerprint),
        eq(rateLimits.actionType, actionType),
        gt(rateLimits.createdAt, windowStart)
      )
    );

  const count = Number(recentActions[0]?.count ?? 0);
  const remaining = Math.max(0, config.limit - count);
  const allowed = count < config.limit;

  // Calculate reset time (find oldest action in window)
  let resetIn = 0;
  if (!allowed) {
    const oldestAction = await db
      .select({ createdAt: rateLimits.createdAt })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.agentFingerprint, fingerprint),
          eq(rateLimits.actionType, actionType),
          gt(rateLimits.createdAt, windowStart)
        )
      )
      .orderBy(rateLimits.createdAt)
      .limit(1);

    if (oldestAction[0]) {
      const oldestTime = oldestAction[0].createdAt.getTime();
      const resetTime = oldestTime + config.windowSeconds * 1000;
      resetIn = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
    }
  }

  return { allowed, remaining, resetIn };
}

/**
 * Record an action for rate limiting.
 * Call this after a successful action.
 */
export async function recordAction(
  fingerprint: string,
  actionType: ActionType
): Promise<void> {
  await db.insert(rateLimits).values({
    agentFingerprint: fingerprint,
    actionType,
  });
}

/**
 * Clean up old rate limit entries (optional maintenance).
 * Call periodically to keep the table small.
 */
export async function cleanupRateLimits(): Promise<number> {
  const cutoff = new Date(Date.now() - 3600 * 1000); // 1 hour ago

  const result = await db
    .delete(rateLimits)
    .where(sql`${rateLimits.createdAt} < ${cutoff}`)
    .returning({ id: rateLimits.id });

  return result.length;
}
