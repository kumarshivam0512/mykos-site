// ─── Rate Limiting + Cost Capping ────────────────────────────────
// Production hardening: prevent runaway costs from rapid retries or
// malicious clients. In-memory implementation suitable for single-instance
// deployment; swap to Redis when scaling horizontally.

import { NextResponse, type NextRequest } from "next/server";

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface CostBucket {
  totalUsd: number;
  windowStart: number;
}

const REQUEST_BUCKETS = new Map<string, Bucket>();
const COST_BUCKETS = new Map<string, CostBucket>();

// Defaults (override via env vars at deploy time)
const RATE_LIMIT_PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 20);
const COST_CAP_PER_HOUR_USD = Number(process.env.COST_CAP_PER_HOUR_USD ?? 10);
const COST_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Get a stable client identifier (IP-based for unauthenticated calls;
 * could be extended to use session ID for authed users).
 */
function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIp || "anonymous";
}

/**
 * Token bucket rate limit check. Returns null if allowed,
 * or a NextResponse with 429 if rate limited.
 */
export function checkRateLimit(req: NextRequest): NextResponse | null {
  const clientId = getClientId(req);
  const now = Date.now();
  let bucket = REQUEST_BUCKETS.get(clientId);

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_PER_MIN, lastRefill: now };
    REQUEST_BUCKETS.set(clientId, bucket);
  }

  // Refill tokens: 1 token per (60_000 / RATE_LIMIT_PER_MIN) ms
  const refillRate = RATE_LIMIT_PER_MIN / 60_000;
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(RATE_LIMIT_PER_MIN, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const retryAfterSec = Math.ceil((1 - bucket.tokens) / refillRate / 1000);
    return NextResponse.json(
      {
        error: "Rate limit exceeded — too many requests in short time",
        code: "RATE_LIMITED",
        retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  bucket.tokens -= 1;
  return null;
}

/**
 * Cost cap check — call BEFORE expensive generation.
 * Returns null if within budget, or 402 response if cap exceeded.
 */
export function checkCostCap(req: NextRequest, estimatedCostUsd: number): NextResponse | null {
  const clientId = getClientId(req);
  const now = Date.now();
  let bucket = COST_BUCKETS.get(clientId);

  if (!bucket || now - bucket.windowStart > COST_WINDOW_MS) {
    bucket = { totalUsd: 0, windowStart: now };
    COST_BUCKETS.set(clientId, bucket);
  }

  if (bucket.totalUsd + estimatedCostUsd > COST_CAP_PER_HOUR_USD) {
    const resetInMin = Math.ceil((COST_WINDOW_MS - (now - bucket.windowStart)) / 60_000);
    return NextResponse.json(
      {
        error: `Hourly cost cap of $${COST_CAP_PER_HOUR_USD} would be exceeded by this request ($${estimatedCostUsd.toFixed(2)})`,
        code: "COST_CAP_EXCEEDED",
        currentSpendUsd: bucket.totalUsd,
        capUsd: COST_CAP_PER_HOUR_USD,
        resetInMin,
      },
      { status: 402 }
    );
  }

  return null;
}

/**
 * Record actual cost incurred AFTER a successful generation.
 */
export function recordCost(req: NextRequest, costUsd: number): void {
  const clientId = getClientId(req);
  const bucket = COST_BUCKETS.get(clientId);
  if (bucket) {
    bucket.totalUsd += costUsd;
  } else {
    COST_BUCKETS.set(clientId, { totalUsd: costUsd, windowStart: Date.now() });
  }
}

/**
 * Standard error response helper with proper error codes.
 */
export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

export function apiError(message: string, code: string, status: number, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, code, details } as ApiError, { status });
}

export const ERROR_CODES = {
  RATE_LIMITED: "RATE_LIMITED",
  COST_CAP_EXCEEDED: "COST_CAP_EXCEEDED",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_INPUT: "MISSING_INPUT",
  NO_PROVIDER: "NO_PROVIDER_CONFIGURED",
  GENERATION_FAILED: "GENERATION_FAILED",
  UPSTREAM_ERROR: "UPSTREAM_PROVIDER_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;
