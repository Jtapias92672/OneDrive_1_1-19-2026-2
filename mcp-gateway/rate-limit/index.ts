/**
 * MCP Security Gateway - Rate Limit Module
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.4-3.7.6 - Rate Limiting
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Rate limiting module exports.
 *   Provides token bucket rate limiting and quota tracking.
 */

// ============================================
// RATE LIMITER
// ============================================

export {
  RateLimiter,
  type RateLimitConfig,
  type RateLimitTiers,
  type ToolRateLimits,
  type RateLimitResult,
  type RateLimitHeaders,
} from './rate-limiter.js';

// ============================================
// QUOTA TRACKER
// ============================================

export {
  QuotaTracker,
  type QuotaType,
  type QuotaPeriod,
  type QuotaTier,
  type QuotaUsage,
  type QuotaCheckResult,
  type QuotaWarning,
  type QuotaTrackerConfig,
} from './quota-tracker.js';

// ============================================
// COMBINED RATE LIMIT MANAGER
// ============================================

import { RateLimiter, RateLimitResult, RateLimitTiers, ToolRateLimits } from './rate-limiter.js';
import { QuotaTracker, QuotaCheckResult, QuotaTier, QuotaType } from './quota-tracker.js';

/**
 * Combined rate limit and quota check result
 */
export interface CombinedLimitResult {
  /** Whether request is allowed */
  allowed: boolean;

  /** Rate limit result */
  rateLimit: RateLimitResult;

  /** Quota check result (if applicable) */
  quota?: QuotaCheckResult;

  /** Blocking reason (if not allowed) */
  reason?: 'rate_limit' | 'quota_exceeded';

  /** HTTP status code to return */
  statusCode: number;

  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Rate Limit Manager
 *
 * Combines rate limiting and quota tracking for unified enforcement.
 */
export class RateLimitManager {
  private rateLimiter: RateLimiter;
  private quotaTracker: QuotaTracker;

  constructor(config?: {
    rateLimiter?: {
      userLimits?: Partial<RateLimitTiers>;
      toolLimits?: ToolRateLimits[];
    };
    quotaTracker?: {
      defaultTier?: string;
      tiers?: QuotaTier[];
    };
  }) {
    this.rateLimiter = new RateLimiter(config?.rateLimiter);
    this.quotaTracker = new QuotaTracker(config?.quotaTracker);
  }

  /**
   * Check rate limits and quotas
   */
  async checkLimits(
    userId: string,
    toolName: string,
    quotaType: QuotaType = 'requests'
  ): Promise<CombinedLimitResult> {
    // Check rate limits first (faster)
    const rateLimitResult = this.rateLimiter.checkLimit(userId, toolName);

    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        rateLimit: rateLimitResult,
        reason: 'rate_limit',
        statusCode: 429,
        headers: {
          ...rateLimitResult.headers,
          'X-Rate-Limit-Reason': 'rate_limit',
        },
      };
    }

    // Check quota
    const quotaResult = await this.quotaTracker.checkQuota(userId, 'user', quotaType);

    if (!quotaResult.allowed) {
      return {
        allowed: false,
        rateLimit: rateLimitResult,
        quota: quotaResult,
        reason: 'quota_exceeded',
        statusCode: 429,
        headers: {
          ...rateLimitResult.headers,
          'X-Quota-Limit': String(quotaResult.limit),
          'X-Quota-Remaining': String(quotaResult.remaining),
          'X-Quota-Reset': String(quotaResult.resetAt),
          'X-Rate-Limit-Reason': 'quota_exceeded',
        },
      };
    }

    // Record usage
    await this.quotaTracker.recordUsage(userId, 'user', quotaType);

    return {
      allowed: true,
      rateLimit: rateLimitResult,
      quota: quotaResult,
      statusCode: 200,
      headers: {
        ...rateLimitResult.headers,
        'X-Quota-Remaining': String(quotaResult.remaining),
      },
    };
  }

  /**
   * Get rate limiter
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  /**
   * Get quota tracker
   */
  getQuotaTracker(): QuotaTracker {
    return this.quotaTracker;
  }

  /**
   * Set user tier
   */
  setUserTier(userId: string, tierId: string): void {
    this.quotaTracker.setTier(userId, tierId);
  }

  /**
   * Reset user limits
   */
  resetUserLimits(userId: string): void {
    this.rateLimiter.resetUser(userId);
    this.quotaTracker.resetQuotas(userId);
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.rateLimiter.shutdown();
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export { RateLimitManager as default };
