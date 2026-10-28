import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  isAllowed: boolean;
  currentCount: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

// In-memory L1 cache for sub-millisecond local rejection and resilient fallback
interface MemoryLimitRecord {
  count: number;
  resetAt: number;
}
const localMemoryStore = new Map<string, MemoryLimitRecord>();

let tableEnsured = false;
async function ensureRateLimitTable() {
  if (tableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "payment_rate_limits" (
        "key" VARCHAR(255) PRIMARY KEY,
        "count" INTEGER NOT NULL DEFAULT 1,
        "reset_at" TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_payment_rate_limits_reset" ON "payment_rate_limits" ("reset_at")
    `).catch(() => null);
    tableEnsured = true;
  } catch (err) {
    tableEnsured = true;
  }
}

/**
 * Extracts normalized client IP address from request headers.
 */
export function getRateLimitClientIp(req: Request | NextRequest): string {
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();

  return "127.0.0.1";
}

/**
 * Checks and updates rate limits using PostgreSQL atomic upsert (shared across serverless instances)
 * with in-memory L1 fast rejection.
 */
export async function checkPaymentRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const resetAtMs = now + windowSeconds * 1000;
  const resetAtDate = new Date(resetAtMs);

  // 1. Fast L1 In-Memory Check: if local memory is already past limit, reject immediately
  const localRec = localMemoryStore.get(key);
  if (localRec && localRec.resetAt > now && localRec.count >= limit) {
    localRec.count++;
    const retrySec = Math.max(1, Math.ceil((localRec.resetAt - now) / 1000));
    return {
      isAllowed: false,
      currentCount: localRec.count,
      limit,
      remaining: 0,
      resetAt: new Date(localRec.resetAt),
      retryAfterSeconds: retrySec,
    };
  }

  // 2. Authoritative PostgreSQL atomic upsert (shared across all Vercel serverless instances)
  try {
    await ensureRateLimitTable();

    const rows: any = await prisma.$queryRawUnsafe(
      `
      INSERT INTO "payment_rate_limits" ("key", "count", "reset_at")
      VALUES ($1, 1, $2)
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE 
        WHEN "payment_rate_limits"."reset_at" < NOW() THEN 1 
        ELSE "payment_rate_limits"."count" + 1 
      END,
      "reset_at" = CASE 
        WHEN "payment_rate_limits"."reset_at" < NOW() THEN $2 
        ELSE "payment_rate_limits"."reset_at" 
      END
      RETURNING "count", "reset_at";
      `,
      key,
      resetAtDate
    );

    if (rows && rows.length > 0) {
      const currentCount = Number(rows[0].count);
      const dbResetAt = new Date(rows[0].reset_at);
      const isAllowed = currentCount <= limit;
      const remaining = Math.max(0, limit - currentCount);
      const retryAfterSeconds = isAllowed
        ? 0
        : Math.max(1, Math.ceil((dbResetAt.getTime() - now) / 1000));

      // Synchronize L1 memory store
      localMemoryStore.set(key, {
        count: currentCount,
        resetAt: dbResetAt.getTime(),
      });

      return {
        isAllowed,
        currentCount,
        limit,
        remaining,
        resetAt: dbResetAt,
        retryAfterSeconds,
      };
    }
  } catch (dbErr) {
    console.warn(`[RATE_LIMIT_DB_WARNING]: Database rate limit query failed for key "${key}". Falling back to L1 counter:`, dbErr);
  }

  // 3. Fallback to In-Memory L1 counter if DB is temporarily unreachable
  if (!localRec || localRec.resetAt <= now) {
    localMemoryStore.set(key, { count: 1, resetAt: resetAtMs });
    return {
      isAllowed: true,
      currentCount: 1,
      limit,
      remaining: limit - 1,
      resetAt: resetAtDate,
      retryAfterSeconds: 0,
    };
  }

  localRec.count++;
  const isAllowed = localRec.count <= limit;
  const remaining = Math.max(0, limit - localRec.count);
  const retrySec = isAllowed ? 0 : Math.max(1, Math.ceil((localRec.resetAt - now) / 1000));

  return {
    isAllowed,
    currentCount: localRec.count,
    limit,
    remaining,
    resetAt: new Date(localRec.resetAt),
    retryAfterSeconds: retrySec,
  };
}

/**
 * Standard HTTP Rate Limit response headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
  };
  if (!result.isAllowed && result.retryAfterSeconds > 0) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }
  return headers;
}
