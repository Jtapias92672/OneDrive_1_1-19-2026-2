/**
 * FORGE Metrics Collector
 * 
 * @epic 04 - Convergence Engine
 * @task 6.1 - Metrics Collection
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Collects and aggregates metrics from convergence sessions.
 */

import {
  ConvergenceSession,
  ConvergenceMetrics,
  IterationResult,
  ValidationResult,
} from '../types';

// ============================================
// METRICS COLLECTOR
// ============================================

export class MetricsCollector {
  private sessionMetrics = new Map<string, PartialMetrics>();

  /**
   * Start tracking a new session
   */
  startSession(sessionId: string): void {
    this.sessionMetrics.set(sessionId, {
      scoreProgression: [],
      validatorStats: new Map(),
      errorCounts: new Map(),
      actionsGenerated: 0,
      actionsApplied: 0,
      successfulActions: 0,
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
    });
  }

  /**
   * Track an iteration result
   */
  trackIteration(sessionId: string, iteration: IterationResult): void {
    let metrics = this.sessionMetrics.get(sessionId);
    
    if (!metrics) {
      this.startSession(sessionId);
      metrics = this.sessionMetrics.get(sessionId)!;
    }
    
    // Track score progression
    metrics.scoreProgression.push(iteration.score);
    
    // Track validator stats
    for (const validation of iteration.validations) {
      this.trackValidation(metrics, validation);
    }
    
    // Track errors
    for (const validation of iteration.validations) {
      for (const error of validation.errors) {
        this.trackError(metrics, error.code, iteration.iteration);
      }
    }
  }

  /**
   * Track a repair action
   */
  trackAction(
    sessionId: string,
    action: { generated: boolean; applied: boolean; successful: boolean }
  ): void {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return;
    
    if (action.generated) metrics.actionsGenerated++;
    if (action.applied) metrics.actionsApplied++;
    if (action.successful) metrics.successfulActions++;
  }

  /**
   * Track API usage
   */
  trackApiUsage(
    sessionId: string,
    usage: { calls?: number; tokens?: number; cost?: number }
  ): void {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return;
    
    if (usage.calls) metrics.apiCalls += usage.calls;
    if (usage.tokens) metrics.tokensUsed += usage.tokens;
    if (usage.cost) metrics.costIncurred += usage.cost;
  }

  /**
   * Finalize metrics for a session
   */
  finalize(session: ConvergenceSession): ConvergenceMetrics {
    const metrics = this.sessionMetrics.get(session.id);
    
    if (!metrics) {
      return this.createEmptyMetrics(session.id);
    }
    
    // Calculate final score
    const finalScore = metrics.scoreProgression.length > 0
      ? metrics.scoreProgression[metrics.scoreProgression.length - 1]
      : 0;
    
    // Build validator stats
    const validatorStats = Array.from(metrics.validatorStats.entries()).map(([id, stats]) => ({
      validatorId: id,
      passCount: stats.passCount,
      failCount: stats.failCount,
      avgConfidence: stats.totalConfidence / (stats.passCount + stats.failCount),
    }));
    
    // Build top errors
    const topErrors = Array.from(metrics.errorCounts.entries())
      .map(([code, data]) => ({
        code,
        count: data.count,
        avgIterationToFix: data.fixedAtIteration !== null
          ? data.fixedAtIteration - data.firstIteration
          : -1,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const result: ConvergenceMetrics = {
      sessionId: session.id,
      totalIterations: session.iterations.length,
      finalScore,
      scoreProgression: metrics.scoreProgression,
      timeToConvergence: session.totalDurationMs || 0,
      apiCalls: metrics.apiCalls,
      tokensUsed: metrics.tokensUsed,
      costIncurred: metrics.costIncurred,
      validatorStats,
      topErrors,
      strategyEffectiveness: {
        actionsGenerated: metrics.actionsGenerated,
        actionsApplied: metrics.actionsApplied,
        successfulActions: metrics.successfulActions,
      },
    };
    
    // Clean up
    this.sessionMetrics.delete(session.id);
    
    return result;
  }

  /**
   * Get current metrics for a session (before finalization)
   */
  getCurrentMetrics(sessionId: string): Partial<ConvergenceMetrics> | null {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return null;
    
    return {
      sessionId,
      totalIterations: metrics.scoreProgression.length,
      finalScore: metrics.scoreProgression[metrics.scoreProgression.length - 1] || 0,
      scoreProgression: [...metrics.scoreProgression],
      apiCalls: metrics.apiCalls,
      tokensUsed: metrics.tokensUsed,
      costIncurred: metrics.costIncurred,
    };
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private trackValidation(metrics: PartialMetrics, validation: ValidationResult): void {
    let stats = metrics.validatorStats.get(validation.validatorId);
    
    if (!stats) {
      stats = { passCount: 0, failCount: 0, totalConfidence: 0 };
      metrics.validatorStats.set(validation.validatorId, stats);
    }
    
    if (validation.passed) {
      stats.passCount++;
    } else {
      stats.failCount++;
    }
    
    stats.totalConfidence += validation.confidence;
    
    // Track API usage for certain validator types
    if (validation.validatorType === 'llm_judge') {
      metrics.apiCalls++;
      metrics.tokensUsed += 1000; // Estimate
      metrics.costIncurred += 0.01;
    } else if (validation.validatorType === 'computational' && validation.tier === 'L2') {
      metrics.apiCalls++;
      metrics.costIncurred += 0.001;
    }
  }

  private trackError(
    metrics: PartialMetrics,
    errorCode: string,
    iteration: number
  ): void {
    let data = metrics.errorCounts.get(errorCode);
    
    if (!data) {
      data = { count: 0, firstIteration: iteration, fixedAtIteration: null };
      metrics.errorCounts.set(errorCode, data);
    }
    
    data.count++;
  }

  private createEmptyMetrics(sessionId: string): ConvergenceMetrics {
    return {
      sessionId,
      totalIterations: 0,
      finalScore: 0,
      scoreProgression: [],
      timeToConvergence: 0,
      apiCalls: 0,
      tokensUsed: 0,
      costIncurred: 0,
      validatorStats: [],
      topErrors: [],
      strategyEffectiveness: {
        actionsGenerated: 0,
        actionsApplied: 0,
        successfulActions: 0,
      },
    };
  }
}

// ============================================
// TYPES
// ============================================

interface PartialMetrics {
  scoreProgression: number[];
  validatorStats: Map<string, {
    passCount: number;
    failCount: number;
    totalConfidence: number;
  }>;
  errorCounts: Map<string, {
    count: number;
    firstIteration: number;
    fixedAtIteration: number | null;
  }>;
  actionsGenerated: number;
  actionsApplied: number;
  successfulActions: number;
  apiCalls: number;
  tokensUsed: number;
  costIncurred: number;
}

// ============================================
// AGGREGATED METRICS
// ============================================

export interface AggregatedMetrics {
  totalSessions: number;
  successRate: number;
  avgIterationsToConverge: number;
  avgTimeToConverge: number;
  avgFinalScore: number;
  totalApiCalls: number;
  totalCost: number;
  mostCommonErrors: Array<{ code: string; count: number }>;
  bestPerformingValidators: Array<{ id: string; passRate: number }>;
}

export class MetricsAggregator {
  private metrics: ConvergenceMetrics[] = [];

  add(metrics: ConvergenceMetrics): void {
    this.metrics.push(metrics);
  }

  aggregate(): AggregatedMetrics {
    if (this.metrics.length === 0) {
      return {
        totalSessions: 0,
        successRate: 0,
        avgIterationsToConverge: 0,
        avgTimeToConverge: 0,
        avgFinalScore: 0,
        totalApiCalls: 0,
        totalCost: 0,
        mostCommonErrors: [],
        bestPerformingValidators: [],
      };
    }
    
    const successful = this.metrics.filter(m => m.finalScore >= 0.95);
    
    return {
      totalSessions: this.metrics.length,
      successRate: successful.length / this.metrics.length,
      avgIterationsToConverge: this.avg(this.metrics.map(m => m.totalIterations)),
      avgTimeToConverge: this.avg(this.metrics.map(m => m.timeToConvergence)),
      avgFinalScore: this.avg(this.metrics.map(m => m.finalScore)),
      totalApiCalls: this.sum(this.metrics.map(m => m.apiCalls)),
      totalCost: this.sum(this.metrics.map(m => m.costIncurred)),
      mostCommonErrors: this.aggregateErrors(),
      bestPerformingValidators: this.aggregateValidators(),
    };
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return this.sum(values) / values.length;
  }

  private sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
  }

  private aggregateErrors(): Array<{ code: string; count: number }> {
    const errorCounts = new Map<string, number>();
    
    for (const metrics of this.metrics) {
      for (const error of metrics.topErrors) {
        const current = errorCounts.get(error.code) || 0;
        errorCounts.set(error.code, current + error.count);
      }
    }
    
    return Array.from(errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private aggregateValidators(): Array<{ id: string; passRate: number }> {
    const validatorStats = new Map<string, { pass: number; fail: number }>();
    
    for (const metrics of this.metrics) {
      for (const stat of metrics.validatorStats) {
        const current = validatorStats.get(stat.validatorId) || { pass: 0, fail: 0 };
        current.pass += stat.passCount;
        current.fail += stat.failCount;
        validatorStats.set(stat.validatorId, current);
      }
    }
    
    return Array.from(validatorStats.entries())
      .map(([id, stats]) => ({
        id,
        passRate: stats.pass / (stats.pass + stats.fail),
      }))
      .sort((a, b) => b.passRate - a.passRate)
      .slice(0, 10);
  }
}

// ============================================
// EXPORTS
// ============================================

export default MetricsCollector;
