/**
 * MCP Security Gateway - Quota Tracker
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.5 - Quota Tracking
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Tracks daily and monthly quotas for users and tenants.
 *   Supports multiple quota types (requests, tokens, storage).
 *
 * @compliance
 *   - Resource allocation enforcement
 *   - Usage metering for billing
 */

// ============================================
// TYPES
// ============================================

/**
 * Quota types
 */
export type QuotaType = 'requests' | 'tokens' | 'storage' | 'compute';

/**
 * Quota period
 */
export type QuotaPeriod = 'daily' | 'monthly' | 'annual';

/**
 * Quota tier configuration
 */
export interface QuotaTier {
  /** Tier name */
  name: string;

  /** Tier ID */
  id: string;

  /** Quotas by type and period */
  quotas: {
    [key in QuotaType]?: {
      [period in QuotaPeriod]?: number;
    };
  };

  /** Overage allowed */
  overageAllowed: boolean;

  /** Overage rate (per unit) */
  overageRate?: number;

  /** Warning threshold (percentage) */
  warningThreshold: number;

  /** Critical threshold (percentage) */
  criticalThreshold: number;
}

/**
 * Quota usage record
 */
export interface QuotaUsage {
  /** User or tenant ID */
  entityId: string;

  /** Entity type */
  entityType: 'user' | 'tenant';

  /** Quota type */
  quotaType: QuotaType;

  /** Period */
  period: QuotaPeriod;

  /** Period start timestamp */
  periodStart: number;

  /** Period end timestamp */
  periodEnd: number;

  /** Current usage */
  used: number;

  /** Quota limit */
  limit: number;

  /** Overage used */
  overage: number;
}

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  /** Whether quota is available */
  allowed: boolean;

  /** Current usage */
  used: number;

  /** Total limit */
  limit: number;

  /** Remaining quota */
  remaining: number;

  /** Usage percentage */
  usagePercent: number;

  /** Warning level */
  level: 'ok' | 'warning' | 'critical' | 'exceeded';

  /** Time until reset */
  resetAt: number;

  /** Is in overage */
  inOverage: boolean;

  /** Overage amount */
  overageAmount: number;
}

/**
 * Quota warning notification
 */
export interface QuotaWarning {
  /** Entity ID */
  entityId: string;

  /** Entity type */
  entityType: 'user' | 'tenant';

  /** Quota type */
  quotaType: QuotaType;

  /** Period */
  period: QuotaPeriod;

  /** Warning level */
  level: 'warning' | 'critical' | 'exceeded';

  /** Current usage */
  used: number;

  /** Limit */
  limit: number;

  /** Usage percentage */
  usagePercent: number;

  /** Timestamp */
  timestamp: string;
}

/**
 * Quota tracker configuration
 */
export interface QuotaTrackerConfig {
  /** Default tier */
  defaultTier: string;

  /** Available tiers */
  tiers: QuotaTier[];

  /** Persist usage (callback) */
  persistUsage?: (usage: QuotaUsage) => Promise<void>;

  /** Load usage (callback) */
  loadUsage?: (
    entityId: string,
    entityType: 'user' | 'tenant',
    quotaType: QuotaType,
    period: QuotaPeriod
  ) => Promise<QuotaUsage | null>;

  /** Warning callback */
  onWarning?: (warning: QuotaWarning) => void;
}

// ============================================
// DEFAULT TIERS
// ============================================

const DEFAULT_TIERS: QuotaTier[] = [
  {
    name: 'Free',
    id: 'free',
    quotas: {
      requests: { daily: 1000, monthly: 10000 },
      tokens: { daily: 50000, monthly: 100000 },
    },
    overageAllowed: false,
    warningThreshold: 80,
    criticalThreshold: 95,
  },
  {
    name: 'Pro',
    id: 'pro',
    quotas: {
      requests: { daily: 10000, monthly: 100000 },
      tokens: { daily: 500000, monthly: 1000000 },
    },
    overageAllowed: true,
    overageRate: 0.001, // $0.001 per request over
    warningThreshold: 80,
    criticalThreshold: 95,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    quotas: {
      requests: { daily: -1, monthly: -1 }, // Unlimited
      tokens: { daily: -1, monthly: -1 },
    },
    overageAllowed: true,
    warningThreshold: 90,
    criticalThreshold: 99,
  },
];

// ============================================
// QUOTA TRACKER
// ============================================

/**
 * Quota Tracker
 *
 * Tracks and enforces usage quotas for users and tenants.
 */
export class QuotaTracker {
  private config: QuotaTrackerConfig;
  private usage: Map<string, QuotaUsage> = new Map();
  private entityTiers: Map<string, string> = new Map();
  private warningsEmitted: Set<string> = new Set();

  constructor(config?: Partial<QuotaTrackerConfig>) {
    this.config = {
      defaultTier: 'free',
      tiers: DEFAULT_TIERS,
      ...config,
    };
  }

  /**
   * Check if quota is available
   */
  async checkQuota(
    entityId: string,
    entityType: 'user' | 'tenant',
    quotaType: QuotaType,
    amount: number = 1
  ): Promise<QuotaCheckResult> {
    const tier = this.getTier(entityId);
    const period = this.determinePeriod(quotaType);
    const usage = await this.getUsage(entityId, entityType, quotaType, period);

    const limit = this.getLimit(tier, quotaType, period);

    // Unlimited quota
    if (limit === -1) {
      return {
        allowed: true,
        used: usage.used,
        limit: Infinity,
        remaining: Infinity,
        usagePercent: 0,
        level: 'ok',
        resetAt: usage.periodEnd,
        inOverage: false,
        overageAmount: 0,
      };
    }

    const newUsage = usage.used + amount;
    const remaining = Math.max(0, limit - usage.used);
    const usagePercent = (usage.used / limit) * 100;

    // Determine level
    let level: 'ok' | 'warning' | 'critical' | 'exceeded' = 'ok';
    if (newUsage > limit) {
      level = 'exceeded';
    } else if (usagePercent >= tier.criticalThreshold) {
      level = 'critical';
    } else if (usagePercent >= tier.warningThreshold) {
      level = 'warning';
    }

    // Emit warnings
    this.emitWarningIfNeeded(entityId, entityType, quotaType, period, level, usage.used, limit, usagePercent);

    // Check if allowed
    const allowed = newUsage <= limit || (tier.overageAllowed && level === 'exceeded');

    return {
      allowed,
      used: usage.used,
      limit,
      remaining,
      usagePercent,
      level,
      resetAt: usage.periodEnd,
      inOverage: newUsage > limit,
      overageAmount: Math.max(0, newUsage - limit),
    };
  }

  /**
   * Record usage
   */
  async recordUsage(
    entityId: string,
    entityType: 'user' | 'tenant',
    quotaType: QuotaType,
    amount: number = 1
  ): Promise<QuotaUsage> {
    const period = this.determinePeriod(quotaType);
    const usage = await this.getUsage(entityId, entityType, quotaType, period);
    const tier = this.getTier(entityId);
    const limit = this.getLimit(tier, quotaType, period);

    // Update usage
    usage.used += amount;

    // Track overage
    if (limit !== -1 && usage.used > limit) {
      usage.overage = usage.used - limit;
    }

    // Persist
    await this.persistUsage(usage);

    return usage;
  }

  /**
   * Get current usage
   */
  async getUsage(
    entityId: string,
    entityType: 'user' | 'tenant',
    quotaType: QuotaType,
    period: QuotaPeriod
  ): Promise<QuotaUsage> {
    const key = this.getUsageKey(entityId, quotaType, period);
    const { start, end } = this.getPeriodBounds(period);

    // Check memory cache
    let usage = this.usage.get(key);

    // Check if period is still valid
    if (usage && usage.periodEnd < Date.now()) {
      // Period expired, reset
      usage = undefined;
      this.usage.delete(key);
    }

    // Try to load from persistence
    if (!usage && this.config.loadUsage) {
      usage = await this.config.loadUsage(entityId, entityType, quotaType, period) || undefined;

      // Check if loaded usage is still valid
      if (usage && usage.periodEnd < Date.now()) {
        usage = undefined;
      }
    }

    // Create new usage record if needed
    if (!usage) {
      const tier = this.getTier(entityId);
      const limit = this.getLimit(tier, quotaType, period);

      usage = {
        entityId,
        entityType,
        quotaType,
        period,
        periodStart: start,
        periodEnd: end,
        used: 0,
        limit,
        overage: 0,
      };

      this.usage.set(key, usage);
    }

    return usage;
  }

  /**
   * Set entity tier
   */
  setTier(entityId: string, tierId: string): void {
    this.entityTiers.set(entityId, tierId);
  }

  /**
   * Get entity tier
   */
  getTier(entityId: string): QuotaTier {
    const tierId = this.entityTiers.get(entityId) || this.config.defaultTier;
    const tier = this.config.tiers.find((t) => t.id === tierId);

    if (!tier) {
      // Fallback to first tier
      return this.config.tiers[0]!;
    }

    return tier;
  }

  /**
   * Get limit for quota type and period
   */
  private getLimit(tier: QuotaTier, quotaType: QuotaType, period: QuotaPeriod): number {
    const quotaConfig = tier.quotas[quotaType];
    if (!quotaConfig) {
      return 0;
    }

    return quotaConfig[period] ?? 0;
  }

  /**
   * Determine primary period for quota type
   */
  private determinePeriod(quotaType: QuotaType): QuotaPeriod {
    // Most quotas use monthly, some use daily for burst protection
    if (quotaType === 'compute') {
      return 'daily';
    }
    return 'monthly';
  }

  /**
   * Get period boundaries
   */
  private getPeriodBounds(period: QuotaPeriod): { start: number; end: number } {
    const now = new Date();

    switch (period) {
      case 'daily': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start: start.getTime(), end: end.getTime() };
      }

      case 'monthly': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start: start.getTime(), end: end.getTime() };
      }

      case 'annual': {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear() + 1, 0, 1);
        return { start: start.getTime(), end: end.getTime() };
      }
    }
  }

  /**
   * Get usage key for caching
   */
  private getUsageKey(entityId: string, quotaType: QuotaType, period: QuotaPeriod): string {
    const { start } = this.getPeriodBounds(period);
    return `${entityId}:${quotaType}:${period}:${start}`;
  }

  /**
   * Persist usage
   */
  private async persistUsage(usage: QuotaUsage): Promise<void> {
    const key = this.getUsageKey(usage.entityId, usage.quotaType, usage.period);
    this.usage.set(key, usage);

    if (this.config.persistUsage) {
      await this.config.persistUsage(usage);
    }
  }

  /**
   * Emit warning if threshold crossed
   */
  private emitWarningIfNeeded(
    entityId: string,
    entityType: 'user' | 'tenant',
    quotaType: QuotaType,
    period: QuotaPeriod,
    level: 'ok' | 'warning' | 'critical' | 'exceeded',
    used: number,
    limit: number,
    usagePercent: number
  ): void {
    if (level === 'ok') return;

    const warningKey = `${entityId}:${quotaType}:${period}:${level}`;

    // Only emit once per period
    if (this.warningsEmitted.has(warningKey)) return;
    this.warningsEmitted.add(warningKey);

    const warning: QuotaWarning = {
      entityId,
      entityType,
      quotaType,
      period,
      level: level === 'exceeded' ? 'exceeded' : level,
      used,
      limit,
      usagePercent,
      timestamp: new Date().toISOString(),
    };

    if (this.config.onWarning) {
      this.config.onWarning(warning);
    }
  }

  /**
   * Get usage summary for entity
   */
  async getUsageSummary(
    entityId: string,
    entityType: 'user' | 'tenant'
  ): Promise<Record<QuotaType, { daily?: QuotaCheckResult; monthly?: QuotaCheckResult }>> {
    const quotaTypes: QuotaType[] = ['requests', 'tokens', 'storage', 'compute'];
    const summary: Record<string, { daily?: QuotaCheckResult; monthly?: QuotaCheckResult }> = {};

    for (const quotaType of quotaTypes) {
      summary[quotaType] = {};

      const tier = this.getTier(entityId);
      const quotaConfig = tier.quotas[quotaType];

      if (quotaConfig?.daily) {
        const usage = await this.getUsage(entityId, entityType, quotaType, 'daily');
        summary[quotaType]!.daily = await this.checkQuota(entityId, entityType, quotaType, 0);
      }

      if (quotaConfig?.monthly) {
        const _usage = await this.getUsage(entityId, entityType, quotaType, 'monthly');
        summary[quotaType]!.monthly = await this.checkQuota(entityId, entityType, quotaType, 0);
      }
    }

    return summary as Record<QuotaType, { daily?: QuotaCheckResult; monthly?: QuotaCheckResult }>;
  }

  /**
   * Reset quotas for entity (e.g., after upgrade)
   */
  resetQuotas(entityId: string): void {
    // Remove all usage records for entity
    for (const key of this.usage.keys()) {
      if (key.startsWith(`${entityId}:`)) {
        this.usage.delete(key);
      }
    }

    // Clear warnings
    for (const key of this.warningsEmitted.keys()) {
      if (key.startsWith(`${entityId}:`)) {
        this.warningsEmitted.delete(key);
      }
    }
  }

  /**
   * Add custom tier
   */
  addTier(tier: QuotaTier): void {
    // Remove existing tier with same ID
    this.config.tiers = this.config.tiers.filter((t) => t.id !== tier.id);
    this.config.tiers.push(tier);
  }

  /**
   * Get all tiers
   */
  getTiers(): QuotaTier[] {
    return [...this.config.tiers];
  }
}

// ============================================
// EXPORTS
// ============================================

export default QuotaTracker;
