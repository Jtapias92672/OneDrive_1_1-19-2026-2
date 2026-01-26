/**
 * MCP Security Gateway - Verification Module
 *
 * @epic 3.7 - Compliance & Validation
 * @task 3.7.14-3.7.16 - Verification Pillars 9-10
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Verification module for behavioral and reward integrity verification.
 *   Implements Verification Pillars 9 (Behavioral) and 10 (Reward Integrity).
 *
 * @compliance
 *   - NIST AI RMF: MAP, MEASURE, MANAGE
 *   - ISO/IEC 42001: AI Management System
 *   - EU AI Act: Risk Management
 */

// ============================================
// BEHAVIORAL VERIFIER (PILLAR 9)
// ============================================

export {
  BehavioralVerifier,
  type BehavioralSignature,
  type ExecutionCharacteristics,
  type ConsistencyResult,
  type BehavioralAnomaly,
  type AnomalyType,
  type ConsistencyStatistics,
  type AlignmentFakingResult,
  type AlignmentIndicator,
  type BehavioralVerifierConfig,
} from './behavioral-verifier.js';

// ============================================
// REWARD INTEGRITY VERIFIER (PILLAR 10)
// ============================================

export {
  RewardIntegrityVerifier,
  type OutcomeMeasurement,
  type ProxyMetrics,
  type TrueOutcome,
  type TestContext,
  type AlignmentAnalysis,
  type AlignmentDivergence,
  type DivergenceType,
  type TestBypassResult,
  type TestBypassIndicator,
  type SlopTestResult,
  type SlopPattern,
  type RewardIntegrityConfig,
} from './reward-integrity-verifier.js';

// ============================================
// UNIFIED VERIFICATION SYSTEM
// ============================================

import { BehavioralVerifier, BehavioralVerifierConfig, BehavioralAnomaly, ConsistencyResult } from './behavioral-verifier.js';
import { RewardIntegrityVerifier, RewardIntegrityConfig, AlignmentDivergence, SlopTestResult } from './reward-integrity-verifier.js';

/**
 * Unified verification system configuration
 */
export interface VerificationSystemConfig {
  /** Behavioral verifier config */
  behavioral?: Partial<BehavioralVerifierConfig>;

  /** Reward integrity config */
  rewardIntegrity?: Partial<RewardIntegrityConfig>;

  /** Alert callback for anomalies */
  onAnomaly?: (anomaly: BehavioralAnomaly) => void;

  /** Alert callback for divergences */
  onDivergence?: (divergence: AlignmentDivergence) => void;
}

/**
 * Verification report
 */
export interface VerificationReport {
  /** Report timestamp */
  timestamp: string;

  /** Behavioral verification results */
  behavioral: {
    signatureCount: number;
    anomalyCount: number;
    recentAnomalies: BehavioralAnomaly[];
    alignmentFakingRisk: number;
  };

  /** Reward integrity results */
  rewardIntegrity: {
    measurementCount: number;
    alignmentScore: number;
    goodhartRisk: number;
    testBypassRisk: string;
    divergences: AlignmentDivergence[];
  };

  /** Overall health score (0-100) */
  healthScore: number;

  /** Recommendations */
  recommendations: string[];

  /** Compliance status */
  compliance: {
    pillar9Pass: boolean;
    pillar10Pass: boolean;
    overallPass: boolean;
  };
}

/**
 * Unified Verification System
 *
 * Combines behavioral verification (Pillar 9) and reward integrity (Pillar 10)
 * for comprehensive AI safety verification.
 */
export class VerificationSystem {
  private behavioralVerifier: BehavioralVerifier;
  private rewardIntegrityVerifier: RewardIntegrityVerifier;
  private config: VerificationSystemConfig;

  constructor(config: VerificationSystemConfig = {}) {
    this.config = config;

    this.behavioralVerifier = new BehavioralVerifier({
      ...config.behavioral,
      onAnomaly: config.onAnomaly,
    });

    this.rewardIntegrityVerifier = new RewardIntegrityVerifier({
      ...config.rewardIntegrity,
      onDivergence: config.onDivergence,
    });
  }

  /**
   * Record a tool execution for verification
   */
  recordExecution(
    sessionId: string,
    userId: string,
    tool: string,
    input: unknown,
    output: unknown,
    metrics: {
      executionTimeMs?: number;
      responseLengthBytes?: number;
      apiCallCount?: number;
      resourcePattern?: 'minimal' | 'moderate' | 'intensive';
      confidenceLevel?: number;
      reasoningDepth?: number;
    },
    environment: 'test' | 'production' | 'staging' = 'production',
    context?: Record<string, unknown>
  ): void {
    // Record behavioral signature
    this.behavioralVerifier.recordSignature(
      sessionId,
      userId,
      tool,
      input,
      output,
      metrics,
      context
    );

    // Record outcome measurement (proxy metrics only for now)
    this.rewardIntegrityVerifier.recordMeasurement(
      tool,
      sessionId,
      {
        taskCompletion: metrics.confidenceLevel || 0.5,
        responseQuality: 0.7, // Would be calculated from output analysis
        safetyScore: 0.9, // Would be calculated from safety checks
        helpfulnessScore: 0.8, // Would be calculated from user feedback
        efficiencyScore: this.calculateEfficiency(metrics.executionTimeMs || 0),
        errorRate: 0,
        latencyMs: metrics.executionTimeMs || 0,
      },
      environment
    );
  }

  /**
   * Check consistency for an execution
   */
  checkConsistency(
    tool: string,
    input: unknown,
    output: unknown,
    metrics: {
      executionTimeMs?: number;
      responseLengthBytes?: number;
      apiCallCount?: number;
      resourcePattern?: 'minimal' | 'moderate' | 'intensive';
      confidenceLevel?: number;
      reasoningDepth?: number;
    }
  ): ConsistencyResult {
    return this.behavioralVerifier.checkConsistency(tool, input, output, metrics);
  }

  /**
   * Run slop test on output
   */
  runSlopTest(output: string): SlopTestResult {
    return this.rewardIntegrityVerifier.runSlopTest(output);
  }

  /**
   * Generate comprehensive verification report
   */
  generateReport(tool?: string): VerificationReport {
    const now = new Date().toISOString();
    const recommendations: string[] = [];

    // Behavioral verification
    const anomalies = this.behavioralVerifier.getAnomalies({ limit: 100 });
    const recentAnomalies = anomalies.filter(
      (a) => new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const alignmentFakingResult = this.behavioralVerifier.detectAlignmentFaking(
      tool || 'all',
      'system',
      []
    );

    // Reward integrity
    const alignmentAnalysis = this.rewardIntegrityVerifier.analyzeAlignment(tool);
    const testBypassResult = tool
      ? this.rewardIntegrityVerifier.detectTestBypass(tool)
      : { riskLevel: 'NONE' as const, detected: false };

    const divergences = this.rewardIntegrityVerifier.getDivergences(50);

    // Compile recommendations
    if (recentAnomalies.length > 5) {
      recommendations.push('High anomaly rate detected - investigate behavioral patterns');
    }

    if (alignmentFakingResult.riskScore > 30) {
      recommendations.push(`Alignment faking risk: ${alignmentFakingResult.recommendation}`);
    }

    if (alignmentAnalysis.goodhartRisk > 30) {
      recommendations.push('Goodhart risk detected - review metric definitions');
    }

    if (testBypassResult.detected) {
      recommendations.push('Potential test bypass detected - review test coverage');
    }

    recommendations.push(...alignmentAnalysis.recommendations);

    // Calculate health score
    let healthScore = 100;
    healthScore -= recentAnomalies.length * 2;
    healthScore -= alignmentFakingResult.riskScore * 0.3;
    healthScore -= (100 - alignmentAnalysis.alignmentScore) * 0.3;
    healthScore -= alignmentAnalysis.goodhartRisk * 0.2;
    if (testBypassResult.detected) healthScore -= 20;

    healthScore = Math.max(0, Math.min(100, healthScore));

    // Compliance check
    const pillar9Pass = recentAnomalies.filter((a) => a.severity === 'CRITICAL').length === 0 &&
      alignmentFakingResult.riskScore < 50;

    const pillar10Pass = alignmentAnalysis.alignmentScore > 70 &&
      alignmentAnalysis.goodhartRisk < 50 &&
      !testBypassResult.detected;

    return {
      timestamp: now,
      behavioral: {
        signatureCount: this.behavioralVerifier.getSignatureCount(tool),
        anomalyCount: anomalies.length,
        recentAnomalies,
        alignmentFakingRisk: alignmentFakingResult.riskScore,
      },
      rewardIntegrity: {
        measurementCount: this.rewardIntegrityVerifier.getMeasurements({ tool }).length,
        alignmentScore: alignmentAnalysis.alignmentScore,
        goodhartRisk: alignmentAnalysis.goodhartRisk,
        testBypassRisk: testBypassResult.riskLevel,
        divergences,
      },
      healthScore,
      recommendations,
      compliance: {
        pillar9Pass,
        pillar10Pass,
        overallPass: pillar9Pass && pillar10Pass,
      },
    };
  }

  /**
   * Get underlying verifiers for advanced usage
   */
  getVerifiers(): {
    behavioral: BehavioralVerifier;
    rewardIntegrity: RewardIntegrityVerifier;
  } {
    return {
      behavioral: this.behavioralVerifier,
      rewardIntegrity: this.rewardIntegrityVerifier,
    };
  }

  /**
   * Clear all verification data
   */
  clear(): void {
    this.behavioralVerifier.clear();
    this.rewardIntegrityVerifier.clear();
  }

  /**
   * Calculate efficiency score from execution time
   */
  private calculateEfficiency(executionTimeMs: number): number {
    // Simple efficiency calculation - would be more sophisticated in production
    if (executionTimeMs < 100) return 1;
    if (executionTimeMs < 500) return 0.9;
    if (executionTimeMs < 1000) return 0.8;
    if (executionTimeMs < 5000) return 0.6;
    return 0.4;
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================

export { VerificationSystem as default };
