/**
 * MCP Security Gateway - Per-Tenant Rate Limits
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.8 - Per-Tenant Limits
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Per-tenant rate limiting and quota management.
 *   Prevents resource abuse and ensures fair usage.
 */

// ============================================
// TYPES
// ============================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Requests per window */
  limit: number;

  /** Window size in milliseconds */
  windowMs: number;

  /** Whether to block or queue on limit */
  blockOnLimit: boolean;
}

/**
 * Tenant quota configuration
 */
export interface TenantQuota {
  /** Daily request limit */
  dailyRequests: number;

  /** Monthly request limit */
  monthlyRequests: number;

  /** Concurrent request limit */
  concurrentRequests: number;

  /** Maximum payload size in bytes */
  maxPayloadSize: number;

  /** Maximum response size in bytes */
  maxResponseSize: number;

  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;

  /** Allowed tools (empty = all) */
  allowedTools: string[];

  /** Blocked tools */
  blockedTools: string[];
}

/**
 * Tenant limits configuration
 */
export interface TenantLimits {
  /** Tenant identifier */
  tenantId: string;

  /** Rate limit configuration */
  rateLimit: RateLimitConfig;

  /** Quota configuration */
  quota: TenantQuota;

  /** Whether tenant is active */
  active: boolean;

  /** Priority level (higher = more resources) */
  priority: 'low' | 'normal' | 'high' | 'critical';
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean;

  /** Remaining requests in window */
  remaining: number;

  /** Time until window resets (ms) */
  resetIn: number;

  /** Current request count */
  current: number;

  /** Limit applied */
  limit: number;

  /** Retry-After header value (seconds) */
  retryAfter?: number;
}

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  /** Whether request is within quota */
  allowed: boolean;

  /** Quota violations */
  violations: QuotaViolation[];

  /** Current usage stats */
  usage: QuotaUsage;
}

/**
 * Quota violation
 */
export interface QuotaViolation {
  /** Quota type violated */
  type: 'daily' | 'monthly' | 'concurrent' | 'payload' | 'execution';

  /** Current value */
  current: number;

  /** Limit value */
  limit: number;

  /** Human-readable message */
  message: string;
}

/**
 * Quota usage statistics
 */
export interface QuotaUsage {
  /** Requests today */
  dailyRequests: number;

  /** Requests this month */
  monthlyRequests: number;

  /** Current concurrent requests */
  concurrentRequests: number;

  /** Last reset timestamp */
  lastReset: Date;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  limit: 100,
  windowMs: 60 * 1000, // 1 minute
  blockOnLimit: true,
};

const DEFAULT_QUOTA: TenantQuota = {
  dailyRequests: 10000,
  monthlyRequests: 300000,
  concurrentRequests: 10,
  maxPayloadSize: 1024 * 1024, // 1 MB
  maxResponseSize: 10 * 1024 * 1024, // 10 MB
  maxExecutionTime: 30000, // 30 seconds
  allowedTools: [],
  blockedTools: [],
};

// ============================================
// RATE LIMITER
// ============================================

/**
 * Token bucket entry
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Tenant Rate Limiter
 *
 * Implements token bucket rate limiting per tenant.
 */
export class TenantRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private limits: Map<string, RateLimitConfig> = new Map();
  private defaultLimit: RateLimitConfig;

  constructor(defaultLimit: RateLimitConfig = DEFAULT_RATE_LIMIT) {
    this.defaultLimit = defaultLimit;
  }

  /**
   * Set rate limit for a tenant
   */
  setLimit(tenantId: string, limit: RateLimitConfig): void {
    this.limits.set(tenantId, limit);
  }

  /**
   * Check if request is allowed
   */
  checkLimit(tenantId: string): RateLimitResult {
    const limit = this.limits.get(tenantId) ?? this.defaultLimit;
    const now = Date.now();

    let bucket = this.buckets.get(tenantId);

    if (!bucket) {
      bucket = { tokens: limit.limit, lastRefill: now };
      this.buckets.set(tenantId, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const refillRate = limit.limit / limit.windowMs;
    const tokensToAdd = elapsed * refillRate;

    bucket.tokens = Math.min(limit.limit, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetIn: Math.ceil((limit.limit - bucket.tokens) / refillRate),
        current: limit.limit - Math.floor(bucket.tokens),
        limit: limit.limit,
      };
    }

    const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil(limit.windowMs - elapsed),
      current: limit.limit,
      limit: limit.limit,
      retryAfter,
    };
  }

  /**
   * Consume tokens without checking
   */
  consume(tenantId: string, tokens: number = 1): boolean {
    const bucket = this.buckets.get(tenantId);
    if (!bucket) return false;

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }
    return false;
  }

  /**
   * Reset rate limit for a tenant
   */
  reset(tenantId: string): void {
    this.buckets.delete(tenantId);
  }

  /**
   * Get current state for tenant
   */
  getState(tenantId: string): { tokens: number; limit: number } | null {
    const bucket = this.buckets.get(tenantId);
    const limit = this.limits.get(tenantId) ?? this.defaultLimit;

    if (!bucket) return null;

    return {
      tokens: Math.floor(bucket.tokens),
      limit: limit.limit,
    };
  }
}

// ============================================
// QUOTA MANAGER
// ============================================

/**
 * Tenant Quota Manager
 *
 * Tracks and enforces per-tenant quotas.
 */
export class TenantQuotaManager {
  private quotas: Map<string, TenantQuota> = new Map();
  private usage: Map<string, QuotaUsage> = new Map();
  private concurrent: Map<string, number> = new Map();
  private defaultQuota: TenantQuota;

  constructor(defaultQuota: TenantQuota = DEFAULT_QUOTA) {
    this.defaultQuota = defaultQuota;
  }

  /**
   * Set quota for a tenant
   */
  setQuota(tenantId: string, quota: Partial<TenantQuota>): void {
    const existing = this.quotas.get(tenantId) ?? this.defaultQuota;
    this.quotas.set(tenantId, { ...existing, ...quota });
  }

  /**
   * Get quota for a tenant
   */
  getQuota(tenantId: string): TenantQuota {
    return this.quotas.get(tenantId) ?? this.defaultQuota;
  }

  /**
   * Check if request is within quota
   */
  checkQuota(
    tenantId: string,
    options: { payloadSize?: number; toolName?: string } = {}
  ): QuotaCheckResult {
    const quota = this.getQuota(tenantId);
    const usage = this.getOrCreateUsage(tenantId);
    const violations: QuotaViolation[] = [];

    // Reset daily/monthly counters if needed
    this.maybeResetCounters(tenantId, usage);

    // Check daily limit
    if (usage.dailyRequests >= quota.dailyRequests) {
      violations.push({
        type: 'daily',
        current: usage.dailyRequests,
        limit: quota.dailyRequests,
        message: `Daily request limit exceeded (${quota.dailyRequests})`,
      });
    }

    // Check monthly limit
    if (usage.monthlyRequests >= quota.monthlyRequests) {
      violations.push({
        type: 'monthly',
        current: usage.monthlyRequests,
        limit: quota.monthlyRequests,
        message: `Monthly request limit exceeded (${quota.monthlyRequests})`,
      });
    }

    // Check concurrent requests
    const concurrent = this.concurrent.get(tenantId) ?? 0;
    if (concurrent >= quota.concurrentRequests) {
      violations.push({
        type: 'concurrent',
        current: concurrent,
        limit: quota.concurrentRequests,
        message: `Concurrent request limit exceeded (${quota.concurrentRequests})`,
      });
    }

    // Check payload size
    if (options.payloadSize && options.payloadSize > quota.maxPayloadSize) {
      violations.push({
        type: 'payload',
        current: options.payloadSize,
        limit: quota.maxPayloadSize,
        message: `Payload size exceeds limit (${quota.maxPayloadSize} bytes)`,
      });
    }

    // Check tool access
    if (options.toolName) {
      if (quota.blockedTools.includes(options.toolName)) {
        violations.push({
          type: 'execution',
          current: 0,
          limit: 0,
          message: `Tool '${options.toolName}' is blocked for this tenant`,
        });
      }

      if (quota.allowedTools.length > 0 && !quota.allowedTools.includes(options.toolName)) {
        violations.push({
          type: 'execution',
          current: 0,
          limit: 0,
          message: `Tool '${options.toolName}' is not in allowed list`,
        });
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      usage: { ...usage, concurrentRequests: concurrent },
    };
  }

  /**
   * Record request start
   */
  startRequest(tenantId: string): void {
    const usage = this.getOrCreateUsage(tenantId);
    usage.dailyRequests++;
    usage.monthlyRequests++;

    const concurrent = (this.concurrent.get(tenantId) ?? 0) + 1;
    this.concurrent.set(tenantId, concurrent);
  }

  /**
   * Record request end
   */
  endRequest(tenantId: string): void {
    const concurrent = Math.max(0, (this.concurrent.get(tenantId) ?? 1) - 1);
    this.concurrent.set(tenantId, concurrent);
  }

  /**
   * Get usage statistics
   */
  getUsage(tenantId: string): QuotaUsage {
    return this.getOrCreateUsage(tenantId);
  }

  /**
   * Reset usage for tenant
   */
  resetUsage(tenantId: string): void {
    this.usage.set(tenantId, {
      dailyRequests: 0,
      monthlyRequests: 0,
      concurrentRequests: 0,
      lastReset: new Date(),
    });
    this.concurrent.set(tenantId, 0);
  }

  /**
   * Get or create usage record
   */
  private getOrCreateUsage(tenantId: string): QuotaUsage {
    let usage = this.usage.get(tenantId);
    if (!usage) {
      usage = {
        dailyRequests: 0,
        monthlyRequests: 0,
        concurrentRequests: 0,
        lastReset: new Date(),
      };
      this.usage.set(tenantId, usage);
    }
    return usage;
  }

  /**
   * Reset counters if day/month changed
   */
  private maybeResetCounters(tenantId: string, usage: QuotaUsage): void {
    const now = new Date();
    const lastReset = usage.lastReset;

    // Reset daily counter
    if (now.toDateString() !== lastReset.toDateString()) {
      usage.dailyRequests = 0;
    }

    // Reset monthly counter
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      usage.monthlyRequests = 0;
    }

    usage.lastReset = now;
  }
}

// ============================================
// TENANT LIMITS MANAGER
// ============================================

/**
 * Tenant Limits Manager
 *
 * Combines rate limiting and quota management.
 */
export class TenantLimitsManager {
  private rateLimiter: TenantRateLimiter;
  private quotaManager: TenantQuotaManager;
  private tenantLimits: Map<string, TenantLimits> = new Map();

  constructor() {
    this.rateLimiter = new TenantRateLimiter();
    this.quotaManager = new TenantQuotaManager();
  }

  /**
   * Configure limits for a tenant
   */
  configureTenant(limits: TenantLimits): void {
    this.tenantLimits.set(limits.tenantId, limits);
    this.rateLimiter.setLimit(limits.tenantId, limits.rateLimit);
    this.quotaManager.setQuota(limits.tenantId, limits.quota);
  }

  /**
   * Check all limits for a request
   */
  checkLimits(
    tenantId: string,
    options: { payloadSize?: number; toolName?: string } = {}
  ): { allowed: boolean; rateLimit: RateLimitResult; quota: QuotaCheckResult } {
    const tenant = this.tenantLimits.get(tenantId);

    // Check if tenant is active
    if (tenant && !tenant.active) {
      return {
        allowed: false,
        rateLimit: {
          allowed: false,
          remaining: 0,
          resetIn: 0,
          current: 0,
          limit: 0,
        },
        quota: {
          allowed: false,
          violations: [{ type: 'execution', current: 0, limit: 0, message: 'Tenant is inactive' }],
          usage: { dailyRequests: 0, monthlyRequests: 0, concurrentRequests: 0, lastReset: new Date() },
        },
      };
    }

    const rateLimit = this.rateLimiter.checkLimit(tenantId);
    const quota = this.quotaManager.checkQuota(tenantId, options);

    return {
      allowed: rateLimit.allowed && quota.allowed,
      rateLimit,
      quota,
    };
  }

  /**
   * Record request lifecycle
   */
  startRequest(tenantId: string): void {
    this.quotaManager.startRequest(tenantId);
  }

  endRequest(tenantId: string): void {
    this.quotaManager.endRequest(tenantId);
  }

  /**
   * Get tenant limits
   */
  getTenantLimits(tenantId: string): TenantLimits | undefined {
    return this.tenantLimits.get(tenantId);
  }

  /**
   * Get rate limiter instance
   */
  getRateLimiter(): TenantRateLimiter {
    return this.rateLimiter;
  }

  /**
   * Get quota manager instance
   */
  getQuotaManager(): TenantQuotaManager {
    return this.quotaManager;
  }
}

// ============================================
// EXPORTS
// ============================================

export default TenantLimitsManager;
