/**
 * MCP Security Gateway - Rate Limiter
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.4 - Rate Limiter Core
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Token bucket rate limiting implementation for MCP Gateway.
 *   Supports per-user, per-tool, and global rate limits.
 *
 * @compliance
 *   - DoS protection
 *   - Resource quota enforcement
 */

// ============================================
// TYPES
// ============================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum tokens in bucket */
  maxTokens: number;

  /** Token refill rate per second */
  refillRate: number;

  /** Initial tokens (defaults to maxTokens) */
  initialTokens?: number;

  /** Window size in milliseconds for sliding window */
  windowMs?: number;
}

/**
 * Rate limit tiers
 */
export interface RateLimitTiers {
  /** Requests per minute */
  perMinute: number;

  /** Requests per hour */
  perHour: number;

  /** Requests per day */
  perDay: number;
}

/**
 * Tool-specific rate limits
 */
export interface ToolRateLimits {
  /** Tool name pattern (glob or exact) */
  tool: string;

  /** Requests per minute */
  perMinute: number;

  /** Custom limit reason */
  reason?: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean;

  /** Remaining tokens/requests */
  remaining: number;

  /** Total limit */
  limit: number;

  /** Time until reset (milliseconds) */
  resetMs: number;

  /** Retry-After header value (seconds) */
  retryAfter?: number;

  /** Which limit was hit (if any) */
  limitType?: 'user' | 'tool' | 'global' | 'tenant';

  /** Rate limit headers for response */
  headers: RateLimitHeaders;
}

/**
 * Rate limit response headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Token bucket state
 */
interface TokenBucket {
  /** Current token count */
  tokens: number;

  /** Last refill timestamp */
  lastRefill: number;

  /** Configuration */
  config: RateLimitConfig;
}

/**
 * Sliding window state
 */
interface SlidingWindow {
  /** Request timestamps */
  requests: number[];

  /** Window configuration */
  windowMs: number;

  /** Maximum requests in window */
  maxRequests: number;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_USER_LIMITS: RateLimitTiers = {
  perMinute: 100,
  perHour: 1000,
  perDay: 5000,
};

const DEFAULT_TOOL_LIMITS: ToolRateLimits[] = [
  { tool: 'database_query', perMinute: 10, reason: 'Database protection' },
  { tool: 'shell_exec', perMinute: 5, reason: 'System command protection' },
  { tool: 'file_delete', perMinute: 2, reason: 'Destructive operation protection' },
  { tool: 'github_push', perMinute: 10, reason: 'API rate limit alignment' },
  { tool: 'llm_*', perMinute: 30, reason: 'LLM cost protection' },
];

const DEFAULT_GLOBAL_LIMITS: RateLimitConfig = {
  maxTokens: 10000,
  refillRate: 100, // tokens per second
};

// ============================================
// RATE LIMITER
// ============================================

/**
 * Rate Limiter
 *
 * Implements token bucket and sliding window rate limiting
 * for users, tools, and global limits.
 */
export class RateLimiter {
  private userBuckets: Map<string, TokenBucket> = new Map();
  private userWindows: Map<string, Map<string, SlidingWindow>> = new Map();
  private toolBuckets: Map<string, TokenBucket> = new Map();
  private globalBucket: TokenBucket;

  private userLimits: RateLimitTiers;
  private toolLimits: ToolRateLimits[];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: {
    userLimits?: Partial<RateLimitTiers>;
    toolLimits?: ToolRateLimits[];
    globalLimits?: Partial<RateLimitConfig>;
  }) {
    this.userLimits = { ...DEFAULT_USER_LIMITS, ...config?.userLimits };
    this.toolLimits = config?.toolLimits || DEFAULT_TOOL_LIMITS;

    const globalConfig = { ...DEFAULT_GLOBAL_LIMITS, ...config?.globalLimits };
    this.globalBucket = {
      tokens: globalConfig.maxTokens,
      lastRefill: Date.now(),
      config: globalConfig,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if request is allowed
   */
  checkLimit(userId: string, toolName: string): RateLimitResult {
    // Check global limit first
    const globalResult = this.checkGlobalLimit();
    if (!globalResult.allowed) {
      return globalResult;
    }

    // Check tool-specific limit
    const toolResult = this.checkToolLimit(toolName);
    if (!toolResult.allowed) {
      return toolResult;
    }

    // Check user limits (minute, hour, day)
    const userResult = this.checkUserLimits(userId);
    if (!userResult.allowed) {
      return userResult;
    }

    // All limits passed - consume tokens
    this.consumeToken(this.globalBucket);
    this.consumeToolToken(toolName);
    this.recordUserRequest(userId);

    return {
      allowed: true,
      remaining: Math.min(userResult.remaining, toolResult.remaining, globalResult.remaining),
      limit: this.userLimits.perMinute,
      resetMs: userResult.resetMs,
      headers: this.buildHeaders(userResult.remaining, this.userLimits.perMinute, userResult.resetMs),
    };
  }

  /**
   * Check global rate limit
   */
  private checkGlobalLimit(): RateLimitResult {
    this.refillBucket(this.globalBucket);

    if (this.globalBucket.tokens < 1) {
      const resetMs = this.calculateResetTime(this.globalBucket);
      return {
        allowed: false,
        remaining: 0,
        limit: this.globalBucket.config.maxTokens,
        resetMs,
        retryAfter: Math.ceil(resetMs / 1000),
        limitType: 'global',
        headers: this.buildHeaders(0, this.globalBucket.config.maxTokens, resetMs, Math.ceil(resetMs / 1000)),
      };
    }

    return {
      allowed: true,
      remaining: Math.floor(this.globalBucket.tokens),
      limit: this.globalBucket.config.maxTokens,
      resetMs: 0,
      headers: this.buildHeaders(
        Math.floor(this.globalBucket.tokens),
        this.globalBucket.config.maxTokens,
        0
      ),
    };
  }

  /**
   * Check tool-specific rate limit
   */
  private checkToolLimit(toolName: string): RateLimitResult {
    const toolLimit = this.findToolLimit(toolName);
    if (!toolLimit) {
      // No specific limit for this tool
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        resetMs: 0,
        headers: this.buildHeaders(999, 999, 0),
      };
    }

    const bucketKey = `tool:${toolName}`;
    let bucket = this.toolBuckets.get(bucketKey);

    if (!bucket) {
      bucket = {
        tokens: toolLimit.perMinute,
        lastRefill: Date.now(),
        config: {
          maxTokens: toolLimit.perMinute,
          refillRate: toolLimit.perMinute / 60, // Refill over 1 minute
        },
      };
      this.toolBuckets.set(bucketKey, bucket);
    }

    this.refillBucket(bucket);

    if (bucket.tokens < 1) {
      const resetMs = this.calculateResetTime(bucket);
      return {
        allowed: false,
        remaining: 0,
        limit: toolLimit.perMinute,
        resetMs,
        retryAfter: Math.ceil(resetMs / 1000),
        limitType: 'tool',
        headers: this.buildHeaders(0, toolLimit.perMinute, resetMs, Math.ceil(resetMs / 1000)),
      };
    }

    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      limit: toolLimit.perMinute,
      resetMs: 60000, // 1 minute window
      headers: this.buildHeaders(Math.floor(bucket.tokens), toolLimit.perMinute, 60000),
    };
  }

  /**
   * Check user rate limits
   */
  private checkUserLimits(userId: string): RateLimitResult {
    const now = Date.now();
    let userWindowMap = this.userWindows.get(userId);

    if (!userWindowMap) {
      userWindowMap = new Map();
      this.userWindows.set(userId, userWindowMap);
    }

    // Check minute window
    const minuteWindow = this.getOrCreateWindow(userWindowMap, 'minute', 60000, this.userLimits.perMinute);
    this.cleanWindow(minuteWindow, now);

    if (minuteWindow.requests.length >= minuteWindow.maxRequests) {
      const oldestRequest = minuteWindow.requests[0] || now;
      const resetMs = oldestRequest + minuteWindow.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        limit: this.userLimits.perMinute,
        resetMs: Math.max(0, resetMs),
        retryAfter: Math.ceil(Math.max(0, resetMs) / 1000),
        limitType: 'user',
        headers: this.buildHeaders(0, this.userLimits.perMinute, resetMs, Math.ceil(resetMs / 1000)),
      };
    }

    // Check hour window
    const hourWindow = this.getOrCreateWindow(userWindowMap, 'hour', 3600000, this.userLimits.perHour);
    this.cleanWindow(hourWindow, now);

    if (hourWindow.requests.length >= hourWindow.maxRequests) {
      const oldestRequest = hourWindow.requests[0] || now;
      const resetMs = oldestRequest + hourWindow.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        limit: this.userLimits.perHour,
        resetMs: Math.max(0, resetMs),
        retryAfter: Math.ceil(Math.max(0, resetMs) / 1000),
        limitType: 'user',
        headers: this.buildHeaders(0, this.userLimits.perHour, resetMs, Math.ceil(resetMs / 1000)),
      };
    }

    // Check day window
    const dayWindow = this.getOrCreateWindow(userWindowMap, 'day', 86400000, this.userLimits.perDay);
    this.cleanWindow(dayWindow, now);

    if (dayWindow.requests.length >= dayWindow.maxRequests) {
      const oldestRequest = dayWindow.requests[0] || now;
      const resetMs = oldestRequest + dayWindow.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        limit: this.userLimits.perDay,
        resetMs: Math.max(0, resetMs),
        retryAfter: Math.ceil(Math.max(0, resetMs) / 1000),
        limitType: 'user',
        headers: this.buildHeaders(0, this.userLimits.perDay, resetMs, Math.ceil(resetMs / 1000)),
      };
    }

    const remaining = minuteWindow.maxRequests - minuteWindow.requests.length;
    const resetMs = minuteWindow.requests.length > 0
      ? (minuteWindow.requests[0] || now) + minuteWindow.windowMs - now
      : minuteWindow.windowMs;

    return {
      allowed: true,
      remaining,
      limit: this.userLimits.perMinute,
      resetMs: Math.max(0, resetMs),
      headers: this.buildHeaders(remaining, this.userLimits.perMinute, Math.max(0, resetMs)),
    };
  }

  /**
   * Find tool-specific limit
   */
  private findToolLimit(toolName: string): ToolRateLimits | null {
    for (const limit of this.toolLimits) {
      // Check exact match
      if (limit.tool === toolName) {
        return limit;
      }

      // Check glob pattern (simple * matching)
      if (limit.tool.includes('*')) {
        const pattern = new RegExp('^' + limit.tool.replace(/\*/g, '.*') + '$');
        if (pattern.test(toolName)) {
          return limit;
        }
      }
    }

    return null;
  }

  /**
   * Refill token bucket
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * bucket.config.refillRate;

    bucket.tokens = Math.min(bucket.config.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  /**
   * Consume token from bucket
   */
  private consumeToken(bucket: TokenBucket): void {
    bucket.tokens = Math.max(0, bucket.tokens - 1);
  }

  /**
   * Consume tool token
   */
  private consumeToolToken(toolName: string): void {
    const bucket = this.toolBuckets.get(`tool:${toolName}`);
    if (bucket) {
      this.consumeToken(bucket);
    }
  }

  /**
   * Record user request in sliding windows
   */
  private recordUserRequest(userId: string): void {
    const now = Date.now();
    const userWindowMap = this.userWindows.get(userId);

    if (userWindowMap) {
      for (const window of userWindowMap.values()) {
        window.requests.push(now);
      }
    }
  }

  /**
   * Get or create sliding window
   */
  private getOrCreateWindow(
    windowMap: Map<string, SlidingWindow>,
    name: string,
    windowMs: number,
    maxRequests: number
  ): SlidingWindow {
    let window = windowMap.get(name);

    if (!window) {
      window = {
        requests: [],
        windowMs,
        maxRequests,
      };
      windowMap.set(name, window);
    }

    return window;
  }

  /**
   * Clean old requests from sliding window
   */
  private cleanWindow(window: SlidingWindow, now: number): void {
    const cutoff = now - window.windowMs;
    window.requests = window.requests.filter((ts) => ts > cutoff);
  }

  /**
   * Calculate time until bucket has enough tokens
   */
  private calculateResetTime(bucket: TokenBucket): number {
    if (bucket.tokens >= 1) return 0;

    const tokensNeeded = 1 - bucket.tokens;
    const secondsNeeded = tokensNeeded / bucket.config.refillRate;

    return Math.ceil(secondsNeeded * 1000);
  }

  /**
   * Build rate limit headers
   */
  private buildHeaders(
    remaining: number,
    limit: number,
    resetMs: number,
    retryAfter?: number
  ): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(Math.max(0, remaining)),
      'X-RateLimit-Reset': String(Date.now() + resetMs),
    };

    if (retryAfter !== undefined) {
      headers['Retry-After'] = String(retryAfter);
    }

    return headers;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    // Clean up old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean user windows
    for (const [userId, windowMap] of this.userWindows.entries()) {
      let hasActiveRequests = false;

      for (const window of windowMap.values()) {
        this.cleanWindow(window, now);
        if (window.requests.length > 0) {
          hasActiveRequests = true;
        }
      }

      if (!hasActiveRequests) {
        this.userWindows.delete(userId);
      }
    }

    // Clean tool buckets with no recent activity
    for (const [key, bucket] of this.toolBuckets.entries()) {
      if (now - bucket.lastRefill > 3600000) {
        // 1 hour inactive
        this.toolBuckets.delete(key);
      }
    }
  }

  /**
   * Get user usage statistics
   */
  getUserStats(userId: string): {
    minuteUsed: number;
    hourUsed: number;
    dayUsed: number;
    minuteLimit: number;
    hourLimit: number;
    dayLimit: number;
  } {
    const userWindowMap = this.userWindows.get(userId);
    const now = Date.now();

    if (!userWindowMap) {
      return {
        minuteUsed: 0,
        hourUsed: 0,
        dayUsed: 0,
        minuteLimit: this.userLimits.perMinute,
        hourLimit: this.userLimits.perHour,
        dayLimit: this.userLimits.perDay,
      };
    }

    const minuteWindow = userWindowMap.get('minute');
    const hourWindow = userWindowMap.get('hour');
    const dayWindow = userWindowMap.get('day');

    if (minuteWindow) this.cleanWindow(minuteWindow, now);
    if (hourWindow) this.cleanWindow(hourWindow, now);
    if (dayWindow) this.cleanWindow(dayWindow, now);

    return {
      minuteUsed: minuteWindow?.requests.length || 0,
      hourUsed: hourWindow?.requests.length || 0,
      dayUsed: dayWindow?.requests.length || 0,
      minuteLimit: this.userLimits.perMinute,
      hourLimit: this.userLimits.perHour,
      dayLimit: this.userLimits.perDay,
    };
  }

  /**
   * Reset user limits
   */
  resetUser(userId: string): void {
    this.userWindows.delete(userId);
    this.userBuckets.delete(userId);
  }

  /**
   * Update user limits
   */
  updateUserLimits(limits: Partial<RateLimitTiers>): void {
    this.userLimits = { ...this.userLimits, ...limits };
  }

  /**
   * Add tool limit
   */
  addToolLimit(limit: ToolRateLimits): void {
    // Remove existing limit for same tool
    this.toolLimits = this.toolLimits.filter((l) => l.tool !== limit.tool);
    this.toolLimits.push(limit);
  }

  /**
   * Shutdown rate limiter
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export default RateLimiter;
