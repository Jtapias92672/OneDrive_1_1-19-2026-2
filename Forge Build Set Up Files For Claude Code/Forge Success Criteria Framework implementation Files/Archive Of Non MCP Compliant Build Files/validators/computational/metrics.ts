/**
 * FORGE Validation Metrics Collector
 * 
 * @epic 14.1 - Computational Accuracy Layer
 * @task 2.4 - Dashboard Metrics
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Collects and aggregates metrics for the computational validation pipeline.
 *   Provides data for dashboards, alerts, and compliance reporting.
 *   
 *   Key metrics:
 *   - Validation pass rate by category
 *   - Wolfram API usage and costs
 *   - Cache hit rates
 *   - Latency percentiles
 *   - Convergence rates
 */

import { ValidationReport, ValidationTier, ValidationStatus } from './computational-validator';
import { ConvergenceState } from './repair-loop';
import { ClaimCategory } from './claim-patterns';

// ============================================
// TYPES
// ============================================

export interface MetricPoint {
  timestamp: string;
  value: number;
  labels: Record<string, string>;
}

export interface LatencyStats {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface PeriodMetrics {
  /** Time period */
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: string;
  endTime: string;
  
  /** Volume metrics */
  totalValidations: number;
  totalClaims: number;
  uniqueSources: number;
  
  /** Accuracy metrics */
  overallPassRate: number;
  passRateByCategory: Record<string, number>;
  passRateByTier: Record<ValidationTier, number>;
  
  /** Tier distribution */
  claimsByTier: Record<ValidationTier, number>;
  escalationRate: number; // L1 → Wolfram
  humanReviewRate: number;
  
  /** Performance metrics */
  latencyMs: LatencyStats;
  latencyByTier: Record<ValidationTier, LatencyStats>;
  
  /** Wolfram API metrics */
  wolframCalls: number;
  wolframCacheHits: number;
  wolframCacheHitRate: number;
  wolframErrors: number;
  wolframErrorRate: number;
  
  /** Cost metrics */
  estimatedCostUsd: number;
  costPerClaim: number;
  budgetUsedPercent: number;
  
  /** Convergence metrics */
  convergenceAttempts: number;
  convergenceSuccessRate: number;
  avgIterationsToConverge: number;
}

export interface RealTimeMetrics {
  /** Current state */
  lastUpdated: string;
  
  /** Rolling 5-minute stats */
  validationsLast5Min: number;
  passRateLast5Min: number;
  avgLatencyLast5Min: number;
  
  /** Wolfram status */
  wolframHealthy: boolean;
  wolframDailyUsage: number;
  wolframDailyLimit: number;
  wolframDailyRemaining: number;
  
  /** Budget status */
  dailyBudgetUsedUsd: number;
  dailyBudgetLimitUsd: number;
  budgetAlertLevel: 'ok' | 'warning' | 'critical';
  
  /** Active validations */
  activeValidations: number;
  queueDepth: number;
}

export interface AlertConfig {
  /** Pass rate threshold for alert */
  passRateThreshold: number;
  
  /** Latency threshold (ms) */
  latencyThreshold: number;
  
  /** Budget usage threshold (percent) */
  budgetThreshold: number;
  
  /** Error rate threshold (percent) */
  errorRateThreshold: number;
  
  /** Alert callback */
  onAlert: (alert: Alert) => void;
}

export interface Alert {
  level: 'info' | 'warning' | 'critical';
  type: 'pass_rate' | 'latency' | 'budget' | 'error_rate' | 'wolfram_health';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

// ============================================
// METRICS COLLECTOR
// ============================================

export class MetricsCollector {
  private dataPoints: MetricPoint[] = [];
  private validationReports: Array<{ report: ValidationReport; timestamp: Date }> = [];
  private convergenceStates: ConvergenceState[] = [];
  private alertConfig?: AlertConfig;
  private maxDataPoints: number = 10000;

  constructor(alertConfig?: AlertConfig) {
    this.alertConfig = alertConfig;
  }

  /**
   * Record a validation report
   */
  recordValidation(report: ValidationReport): void {
    this.validationReports.push({
      report,
      timestamp: new Date(),
    });
    
    // Trim old data
    if (this.validationReports.length > this.maxDataPoints) {
      this.validationReports = this.validationReports.slice(-this.maxDataPoints);
    }
    
    // Record individual metrics
    this.recordMetric('validations_total', 1, { reportId: report.reportId });
    this.recordMetric('claims_total', report.summary.total, {});
    this.recordMetric('claims_valid', report.summary.valid, {});
    this.recordMetric('claims_invalid', report.summary.invalid, {});
    this.recordMetric('wolfram_calls', report.summary.wolframInvocations, {});
    this.recordMetric('cache_hits', report.summary.cacheHits, {});
    this.recordMetric('latency_ms', report.summary.totalLatencyMs, {});
    
    // Check alerts
    this.checkAlerts(report);
  }

  /**
   * Record a convergence attempt
   */
  recordConvergence(state: ConvergenceState): void {
    this.convergenceStates.push(state);
    
    this.recordMetric('convergence_attempts', 1, {
      converged: state.converged.toString(),
      exitReason: state.exitReason || 'unknown',
    });
    
    this.recordMetric('convergence_iterations', state.iteration, {});
  }

  /**
   * Get metrics for a time period
   */
  getPeriodMetrics(period: 'hour' | 'day' | 'week' | 'month'): PeriodMetrics {
    const now = new Date();
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    
    const startTime = new Date(now.getTime() - periodMs[period]);
    const reports = this.validationReports.filter(r => r.timestamp >= startTime);
    
    return this.calculatePeriodMetrics(reports.map(r => r.report), period, startTime, now);
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(): RealTimeMetrics {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    const recentReports = this.validationReports.filter(r => r.timestamp >= fiveMinAgo);
    
    let validationsLast5Min = 0;
    let totalClaims = 0;
    let validClaims = 0;
    let totalLatency = 0;
    let wolframUsage = 0;
    
    for (const { report } of recentReports) {
      validationsLast5Min++;
      totalClaims += report.summary.total;
      validClaims += report.summary.valid;
      totalLatency += report.summary.totalLatencyMs;
      wolframUsage += report.summary.wolframInvocations;
    }
    
    // Calculate daily Wolfram usage
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayReports = this.validationReports.filter(r => r.timestamp >= todayStart);
    const dailyWolframUsage = todayReports.reduce((sum, r) => sum + r.report.summary.wolframInvocations, 0);
    
    const dailyLimit = 100; // From config
    const budgetLimitUsd = 1.0; // $1/day default
    const costPerQuery = 0.01;
    
    let budgetAlertLevel: 'ok' | 'warning' | 'critical' = 'ok';
    const budgetUsedPercent = (dailyWolframUsage / dailyLimit) * 100;
    if (budgetUsedPercent >= 90) budgetAlertLevel = 'critical';
    else if (budgetUsedPercent >= 75) budgetAlertLevel = 'warning';
    
    return {
      lastUpdated: now.toISOString(),
      validationsLast5Min,
      passRateLast5Min: totalClaims > 0 ? validClaims / totalClaims : 1,
      avgLatencyLast5Min: validationsLast5Min > 0 ? totalLatency / validationsLast5Min : 0,
      wolframHealthy: true, // Would check actual API health
      wolframDailyUsage: dailyWolframUsage,
      wolframDailyLimit: dailyLimit,
      wolframDailyRemaining: dailyLimit - dailyWolframUsage,
      dailyBudgetUsedUsd: dailyWolframUsage * costPerQuery,
      dailyBudgetLimitUsd: budgetLimitUsd,
      budgetAlertLevel,
      activeValidations: 0, // Would track active async validations
      queueDepth: 0,
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];
    const period = this.getPeriodMetrics('hour');
    
    lines.push(`# HELP forge_validations_total Total number of validations`);
    lines.push(`# TYPE forge_validations_total counter`);
    lines.push(`forge_validations_total ${period.totalValidations}`);
    
    lines.push(`# HELP forge_claims_total Total number of claims processed`);
    lines.push(`# TYPE forge_claims_total counter`);
    lines.push(`forge_claims_total ${period.totalClaims}`);
    
    lines.push(`# HELP forge_pass_rate Current pass rate`);
    lines.push(`# TYPE forge_pass_rate gauge`);
    lines.push(`forge_pass_rate ${period.overallPassRate.toFixed(4)}`);
    
    lines.push(`# HELP forge_wolfram_calls_total Total Wolfram API calls`);
    lines.push(`# TYPE forge_wolfram_calls_total counter`);
    lines.push(`forge_wolfram_calls_total ${period.wolframCalls}`);
    
    lines.push(`# HELP forge_cache_hit_rate Cache hit rate`);
    lines.push(`# TYPE forge_cache_hit_rate gauge`);
    lines.push(`forge_cache_hit_rate ${period.wolframCacheHitRate.toFixed(4)}`);
    
    lines.push(`# HELP forge_latency_ms_p95 95th percentile latency`);
    lines.push(`# TYPE forge_latency_ms_p95 gauge`);
    lines.push(`forge_latency_ms_p95 ${period.latencyMs.p95}`);
    
    lines.push(`# HELP forge_cost_usd Estimated cost in USD`);
    lines.push(`# TYPE forge_cost_usd counter`);
    lines.push(`forge_cost_usd ${period.estimatedCostUsd.toFixed(4)}`);
    
    return lines.join('\n');
  }

  /**
   * Get dashboard data for UI
   */
  getDashboardData(): {
    summary: RealTimeMetrics;
    hourly: PeriodMetrics;
    daily: PeriodMetrics;
    charts: {
      passRateTrend: Array<{ time: string; value: number }>;
      latencyTrend: Array<{ time: string; value: number }>;
      wolframUsageTrend: Array<{ time: string; value: number }>;
    };
  } {
    const hourly = this.getPeriodMetrics('hour');
    const daily = this.getPeriodMetrics('day');
    
    // Generate trend data (last 24 hours, hourly buckets)
    const passRateTrend: Array<{ time: string; value: number }> = [];
    const latencyTrend: Array<{ time: string; value: number }> = [];
    const wolframUsageTrend: Array<{ time: string; value: number }> = [];
    
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const bucketStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
      const bucketEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      const bucketReports = this.validationReports.filter(
        r => r.timestamp >= bucketStart && r.timestamp < bucketEnd
      );
      
      const time = bucketStart.toISOString();
      
      if (bucketReports.length > 0) {
        const totalClaims = bucketReports.reduce((sum, r) => sum + r.report.summary.total, 0);
        const validClaims = bucketReports.reduce((sum, r) => sum + r.report.summary.valid, 0);
        const totalLatency = bucketReports.reduce((sum, r) => sum + r.report.summary.totalLatencyMs, 0);
        const wolframCalls = bucketReports.reduce((sum, r) => sum + r.report.summary.wolframInvocations, 0);
        
        passRateTrend.push({ time, value: totalClaims > 0 ? validClaims / totalClaims : 1 });
        latencyTrend.push({ time, value: totalLatency / bucketReports.length });
        wolframUsageTrend.push({ time, value: wolframCalls });
      } else {
        passRateTrend.push({ time, value: 0 });
        latencyTrend.push({ time, value: 0 });
        wolframUsageTrend.push({ time, value: 0 });
      }
    }
    
    return {
      summary: this.getRealTimeMetrics(),
      hourly,
      daily,
      charts: {
        passRateTrend,
        latencyTrend,
        wolframUsageTrend,
      },
    };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  private recordMetric(name: string, value: number, labels: Record<string, string>): void {
    this.dataPoints.push({
      timestamp: new Date().toISOString(),
      value,
      labels: { name, ...labels },
    });
    
    if (this.dataPoints.length > this.maxDataPoints) {
      this.dataPoints = this.dataPoints.slice(-this.maxDataPoints);
    }
  }

  private checkAlerts(report: ValidationReport): void {
    if (!this.alertConfig) return;
    
    const passRate = report.summary.total > 0 
      ? report.summary.valid / report.summary.total 
      : 1;
    
    if (passRate < this.alertConfig.passRateThreshold) {
      this.alertConfig.onAlert({
        level: passRate < 0.5 ? 'critical' : 'warning',
        type: 'pass_rate',
        message: `Pass rate ${(passRate * 100).toFixed(1)}% below threshold ${(this.alertConfig.passRateThreshold * 100).toFixed(1)}%`,
        value: passRate,
        threshold: this.alertConfig.passRateThreshold,
        timestamp: new Date().toISOString(),
      });
    }
    
    const avgLatency = report.summary.total > 0 
      ? report.summary.totalLatencyMs / report.summary.total 
      : 0;
    
    if (avgLatency > this.alertConfig.latencyThreshold) {
      this.alertConfig.onAlert({
        level: avgLatency > this.alertConfig.latencyThreshold * 2 ? 'critical' : 'warning',
        type: 'latency',
        message: `Average latency ${avgLatency.toFixed(0)}ms exceeds threshold ${this.alertConfig.latencyThreshold}ms`,
        value: avgLatency,
        threshold: this.alertConfig.latencyThreshold,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private calculatePeriodMetrics(
    reports: ValidationReport[],
    period: 'hour' | 'day' | 'week' | 'month',
    startTime: Date,
    endTime: Date
  ): PeriodMetrics {
    const latencies: number[] = [];
    const latenciesByTier: Record<ValidationTier, number[]> = {
      L1_LOCAL: [],
      L1_5_WOLFRAM: [],
      L2_SEMANTIC: [],
      HUMAN_REVIEW: [],
    };
    
    let totalClaims = 0;
    let validClaims = 0;
    let wolframCalls = 0;
    let cacheHits = 0;
    let wolframErrors = 0;
    
    const claimsByTier: Record<ValidationTier, number> = {
      L1_LOCAL: 0,
      L1_5_WOLFRAM: 0,
      L2_SEMANTIC: 0,
      HUMAN_REVIEW: 0,
    };
    
    const passByCategory: Record<string, { total: number; valid: number }> = {};
    const passByTier: Record<ValidationTier, { total: number; valid: number }> = {
      L1_LOCAL: { total: 0, valid: 0 },
      L1_5_WOLFRAM: { total: 0, valid: 0 },
      L2_SEMANTIC: { total: 0, valid: 0 },
      HUMAN_REVIEW: { total: 0, valid: 0 },
    };
    
    for (const report of reports) {
      totalClaims += report.summary.total;
      validClaims += report.summary.valid;
      wolframCalls += report.summary.wolframInvocations;
      cacheHits += report.summary.cacheHits;
      
      for (const claim of report.claims) {
        latencies.push(claim.latencyMs);
        latenciesByTier[claim.tier].push(claim.latencyMs);
        claimsByTier[claim.tier]++;
        
        passByTier[claim.tier].total++;
        if (claim.status === 'VALID') passByTier[claim.tier].valid++;
        
        const cat = claim.category || 'unknown';
        if (!passByCategory[cat]) passByCategory[cat] = { total: 0, valid: 0 };
        passByCategory[cat].total++;
        if (claim.status === 'VALID') passByCategory[cat].valid++;
      }
    }
    
    // Calculate pass rates
    const passRateByCategory: Record<string, number> = {};
    for (const [cat, stats] of Object.entries(passByCategory)) {
      passRateByCategory[cat] = stats.total > 0 ? stats.valid / stats.total : 0;
    }
    
    const passRateByTier: Record<ValidationTier, number> = {
      L1_LOCAL: passByTier.L1_LOCAL.total > 0 ? passByTier.L1_LOCAL.valid / passByTier.L1_LOCAL.total : 0,
      L1_5_WOLFRAM: passByTier.L1_5_WOLFRAM.total > 0 ? passByTier.L1_5_WOLFRAM.valid / passByTier.L1_5_WOLFRAM.total : 0,
      L2_SEMANTIC: passByTier.L2_SEMANTIC.total > 0 ? passByTier.L2_SEMANTIC.valid / passByTier.L2_SEMANTIC.total : 0,
      HUMAN_REVIEW: passByTier.HUMAN_REVIEW.total > 0 ? passByTier.HUMAN_REVIEW.valid / passByTier.HUMAN_REVIEW.total : 0,
    };
    
    // Convergence metrics
    const convergenceInPeriod = this.convergenceStates.filter(s => {
      const lastHistory = s.history[s.history.length - 1];
      return lastHistory && new Date(lastHistory.timestamp) >= startTime;
    });
    
    const converged = convergenceInPeriod.filter(s => s.converged);
    
    return {
      period,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalValidations: reports.length,
      totalClaims,
      uniqueSources: reports.length, // Simplified
      overallPassRate: totalClaims > 0 ? validClaims / totalClaims : 0,
      passRateByCategory,
      passRateByTier,
      claimsByTier,
      escalationRate: totalClaims > 0 ? claimsByTier.L1_5_WOLFRAM / totalClaims : 0,
      humanReviewRate: totalClaims > 0 ? claimsByTier.HUMAN_REVIEW / totalClaims : 0,
      latencyMs: this.calculateLatencyStats(latencies),
      latencyByTier: {
        L1_LOCAL: this.calculateLatencyStats(latenciesByTier.L1_LOCAL),
        L1_5_WOLFRAM: this.calculateLatencyStats(latenciesByTier.L1_5_WOLFRAM),
        L2_SEMANTIC: this.calculateLatencyStats(latenciesByTier.L2_SEMANTIC),
        HUMAN_REVIEW: this.calculateLatencyStats(latenciesByTier.HUMAN_REVIEW),
      },
      wolframCalls,
      wolframCacheHits: cacheHits,
      wolframCacheHitRate: wolframCalls > 0 ? cacheHits / (wolframCalls + cacheHits) : 0,
      wolframErrors,
      wolframErrorRate: wolframCalls > 0 ? wolframErrors / wolframCalls : 0,
      estimatedCostUsd: wolframCalls * 0.01,
      costPerClaim: totalClaims > 0 ? (wolframCalls * 0.01) / totalClaims : 0,
      budgetUsedPercent: (wolframCalls / 2000) * 100,
      convergenceAttempts: convergenceInPeriod.length,
      convergenceSuccessRate: convergenceInPeriod.length > 0 ? converged.length / convergenceInPeriod.length : 0,
      avgIterationsToConverge: converged.length > 0 
        ? converged.reduce((sum, s) => sum + s.iteration, 0) / converged.length 
        : 0,
    };
  }

  private calculateLatencyStats(values: number[]): LatencyStats {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
    }
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    
    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
    };
  }
}

// ============================================
// SINGLETON
// ============================================

let defaultCollector: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!defaultCollector) {
    defaultCollector = new MetricsCollector();
  }
  return defaultCollector;
}

// ============================================
// EXPORTS
// ============================================

export default MetricsCollector;
