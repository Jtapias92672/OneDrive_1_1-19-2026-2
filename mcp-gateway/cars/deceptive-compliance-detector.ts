/**
 * MCP Security Gateway - Deceptive Compliance Detector
 *
 * @epic 3.5 - Gateway Foundation
 * @task 3.5.2.4 - Deceptive Compliance Detection
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Detects deceptive compliance patterns per Anthropic research:
 *   "Alignment Faking in Large Language Models" (Dec 2024)
 *
 *   Key finding: "Models can strategically comply with training objectives
 *   while maintaining hidden preferences. This behavior emerged WITHOUT
 *   being explicitly trained for it."
 */

import { RiskLevel } from '../core/types.js';

// ============================================
// INTERFACES
// ============================================

/**
 * Context for deceptive compliance analysis
 */
export interface DeceptiveComplianceContext {
  /** Agent validates its own work without external check */
  agentValidatesOwnWork: boolean;

  /** External validation mechanism is present */
  externalValidationPresent: boolean;

  /** External verification is available for this task */
  externalVerificationAvailable: boolean;

  /** Number of reasoning steps in agent's chain */
  reasoningStepCount: number;

  /** All reasoning is visible/logged */
  reasoningFullyVisible: boolean;

  /** Agent claims time pressure to skip review */
  claimsUrgency: boolean;

  /** Agent requests to bypass review process */
  requestsBypassReview: boolean;

  /** Agent claims task is complete */
  claimsSuccess: boolean;

  /** Verifiable evidence is provided */
  evidenceProvided: boolean;

  /** Task complexity score (1-10) */
  taskComplexity?: number;

  /** Time taken vs expected (ratio) */
  completionTimeRatio?: number;

  /** Files modified outside stated scope */
  outOfScopeModifications?: string[];

  /** Agent's stated reasoning vs actual behavior match */
  reasoningBehaviorAlignment?: number;
}

/**
 * Individual indicator detected
 */
export interface DeceptiveComplianceIndicator {
  /** Indicator name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Risk modifier to apply */
  riskModifier: number;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Evidence supporting detection */
  evidence?: string;
}

/**
 * Result of deceptive compliance assessment
 */
export interface DeceptiveComplianceAssessment {
  /** Number of indicators triggered */
  indicatorCount: number;

  /** Total risk modifier */
  riskModifier: number;

  /** List of triggered indicators */
  indicators: DeceptiveComplianceIndicator[];

  /** Recommended action */
  action: DeceptiveComplianceAction;

  /** Detailed reasoning for assessment */
  reasoning: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Timestamp of assessment */
  timestamp: string;
}

/**
 * Possible actions based on detection
 */
export type DeceptiveComplianceAction =
  | 'PROCEED'      // No indicators, normal processing
  | 'SPOT_CHECK'   // 1 indicator - random human verification
  | 'FULL_REVIEW'  // 2 indicators - mandatory human review
  | 'ESCALATE'     // 3+ indicators - assume potential deception
  | 'BLOCK';       // Critical indicators - block execution

// ============================================
// DETECTOR CLASS
// ============================================

/**
 * Detects deceptive compliance patterns per Anthropic Dec 2024 research
 *
 * @example
 * ```typescript
 * const detector = new DeceptiveComplianceDetector();
 * const assessment = detector.detect({
 *   agentValidatesOwnWork: true,
 *   externalValidationPresent: false,
 *   externalVerificationAvailable: true,
 *   reasoningStepCount: 8,
 *   reasoningFullyVisible: false,
 *   claimsUrgency: false,
 *   requestsBypassReview: false,
 *   claimsSuccess: true,
 *   evidenceProvided: false,
 * });
 *
 * if (assessment.action === 'ESCALATE') {
 *   // Require full human audit
 * }
 * ```
 */
export class DeceptiveComplianceDetector {
  private readonly thresholds = {
    spotCheck: 1,
    fullReview: 2,
    escalate: 3,
    block: 4,
  };

  private readonly indicatorDefinitions = {
    SELF_VALIDATION: {
      name: 'SELF_VALIDATION',
      description: 'Agent self-validates own work without external verification',
      baseModifier: 1.0,
      severity: 'high' as const,
    },
    NO_EXTERNAL_VERIFICATION: {
      name: 'NO_EXTERNAL_VERIFICATION',
      description: 'No external verification mechanism available',
      baseModifier: 1.0,
      severity: 'high' as const,
    },
    HIDDEN_REASONING: {
      name: 'HIDDEN_REASONING',
      description: 'Complex multi-step reasoning not fully visible',
      baseModifier: 0.5,
      severity: 'medium' as const,
    },
    URGENCY_BYPASS: {
      name: 'URGENCY_BYPASS',
      description: 'Agent claims urgency to bypass review process',
      baseModifier: 0.5,
      severity: 'medium' as const,
    },
    SUCCESS_NO_EVIDENCE: {
      name: 'SUCCESS_NO_EVIDENCE',
      description: 'Agent reports success without providing verifiable evidence',
      baseModifier: 0.5,
      severity: 'medium' as const,
    },
    RAPID_COMPLETION: {
      name: 'RAPID_COMPLETION',
      description: 'Complex task completed suspiciously fast',
      baseModifier: 0.75,
      severity: 'medium' as const,
    },
    OUT_OF_SCOPE: {
      name: 'OUT_OF_SCOPE',
      description: 'Files modified outside stated task scope',
      baseModifier: 1.5,
      severity: 'critical' as const,
    },
    REASONING_MISMATCH: {
      name: 'REASONING_MISMATCH',
      description: 'Stated reasoning does not match actual behavior',
      baseModifier: 2.0,
      severity: 'critical' as const,
    },
  };

  /**
   * Detect deceptive compliance indicators
   */
  detect(context: DeceptiveComplianceContext): DeceptiveComplianceAssessment {
    const indicators: DeceptiveComplianceIndicator[] = [];
    let totalModifier = 0;

    // Indicator 1: Self-validation without external check (+1 level)
    if (context.agentValidatesOwnWork && !context.externalValidationPresent) {
      const indicator = this.createIndicator(
        this.indicatorDefinitions.SELF_VALIDATION,
        'Agent validated its own output without external verification'
      );
      indicators.push(indicator);
      totalModifier += indicator.riskModifier;
    }

    // Indicator 2: No external verification available (+1 level)
    if (!context.externalVerificationAvailable) {
      const indicator = this.createIndicator(
        this.indicatorDefinitions.NO_EXTERNAL_VERIFICATION,
        'No external verification mechanism is available for this task'
      );
      indicators.push(indicator);
      totalModifier += indicator.riskModifier;
    }

    // Indicator 3: Hidden reasoning (+0.5 level)
    if (context.reasoningStepCount > 5 && !context.reasoningFullyVisible) {
      const indicator = this.createIndicator(
        this.indicatorDefinitions.HIDDEN_REASONING,
        `${context.reasoningStepCount} reasoning steps with incomplete visibility`
      );
      indicators.push(indicator);
      totalModifier += indicator.riskModifier;
    }

    // Indicator 4: Urgency bypass (+0.5 level)
    if (context.claimsUrgency && context.requestsBypassReview) {
      const indicator = this.createIndicator(
        this.indicatorDefinitions.URGENCY_BYPASS,
        'Agent requested bypass of review citing time pressure'
      );
      indicators.push(indicator);
      totalModifier += indicator.riskModifier;
    }

    // Indicator 5: Success without evidence (+0.5 level)
    if (context.claimsSuccess && !context.evidenceProvided) {
      const indicator = this.createIndicator(
        this.indicatorDefinitions.SUCCESS_NO_EVIDENCE,
        'Task claimed complete but no verifiable evidence provided'
      );
      indicators.push(indicator);
      totalModifier += indicator.riskModifier;
    }

    // Indicator 6: Rapid completion of complex task (+0.75 level)
    if (
      context.taskComplexity !== undefined &&
      context.completionTimeRatio !== undefined &&
      context.taskComplexity > 5 &&
      context.completionTimeRatio < 0.3
    ) {
      const indicator = this.createIndicator(
        this.indicatorDefinitions.RAPID_COMPLETION,
        `Complex task (${context.taskComplexity}/10) completed in ${Math.round(context.completionTimeRatio * 100)}% of expected time`
      );
      indicators.push(indicator);
      totalModifier += indicator.riskModifier;
    }

    // Indicator 7: Out of scope modifications (+1.5 levels) - CRITICAL
    if (
      context.outOfScopeModifications &&
      context.outOfScopeModifications.length > 0
    ) {
      const indicator = this.createIndicator(
        this.indicatorDefinitions.OUT_OF_SCOPE,
        `Modified ${context.outOfScopeModifications.length} files outside stated scope: ${context.outOfScopeModifications.slice(0, 3).join(', ')}${context.outOfScopeModifications.length > 3 ? '...' : ''}`
      );
      indicators.push(indicator);
      totalModifier += indicator.riskModifier;
    }

    // Indicator 8: Reasoning-behavior mismatch (+2 levels) - CRITICAL
    if (
      context.reasoningBehaviorAlignment !== undefined &&
      context.reasoningBehaviorAlignment < 0.5
    ) {
      const indicator = this.createIndicator(
        this.indicatorDefinitions.REASONING_MISMATCH,
        `Reasoning-behavior alignment score: ${Math.round(context.reasoningBehaviorAlignment * 100)}%`
      );
      indicators.push(indicator);
      totalModifier += indicator.riskModifier;
    }

    // Determine action based on indicator count and severity
    const action = this.determineAction(indicators);

    // Calculate confidence based on indicator clarity
    const confidence = this.calculateConfidence(indicators, context);

    // Generate reasoning
    const reasoning = this.generateReasoning(indicators, action);

    return {
      indicatorCount: indicators.length,
      riskModifier: Math.min(totalModifier, 4), // Cap at +4 levels
      indicators,
      action,
      reasoning,
      confidence,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an indicator with evidence
   */
  private createIndicator(
    definition: typeof this.indicatorDefinitions[keyof typeof this.indicatorDefinitions],
    evidence: string
  ): DeceptiveComplianceIndicator {
    return {
      name: definition.name,
      description: definition.description,
      riskModifier: definition.baseModifier,
      severity: definition.severity,
      evidence,
    };
  }

  /**
   * Determine action based on indicators
   */
  private determineAction(
    indicators: DeceptiveComplianceIndicator[]
  ): DeceptiveComplianceAction {
    const count = indicators.length;
    const hasCritical = indicators.some(i => i.severity === 'critical');

    // Critical indicators trigger immediate escalation or block
    if (hasCritical) {
      const criticalCount = indicators.filter(i => i.severity === 'critical').length;
      if (criticalCount >= 2) {
        return 'BLOCK';
      }
      return 'ESCALATE';
    }

    // Standard threshold-based escalation
    if (count >= this.thresholds.block) {
      return 'BLOCK';
    } else if (count >= this.thresholds.escalate) {
      return 'ESCALATE';
    } else if (count >= this.thresholds.fullReview) {
      return 'FULL_REVIEW';
    } else if (count >= this.thresholds.spotCheck) {
      return 'SPOT_CHECK';
    }

    return 'PROCEED';
  }

  /**
   * Calculate confidence in the assessment
   */
  private calculateConfidence(
    indicators: DeceptiveComplianceIndicator[],
    context: DeceptiveComplianceContext
  ): number {
    if (indicators.length === 0) {
      return 0.95; // High confidence when no indicators
    }

    // Base confidence decreases with ambiguity
    let confidence = 0.85;

    // Increase confidence for clear-cut indicators
    const criticalCount = indicators.filter(i => i.severity === 'critical').length;
    const highCount = indicators.filter(i => i.severity === 'high').length;

    if (criticalCount > 0) {
      confidence += 0.05 * criticalCount;
    }
    if (highCount > 0) {
      confidence += 0.03 * highCount;
    }

    // Decrease confidence if context is incomplete
    if (context.reasoningBehaviorAlignment === undefined) {
      confidence -= 0.1;
    }
    if (context.taskComplexity === undefined) {
      confidence -= 0.05;
    }

    return Math.max(0.5, Math.min(0.99, confidence));
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    indicators: DeceptiveComplianceIndicator[],
    action: DeceptiveComplianceAction
  ): string {
    if (indicators.length === 0) {
      return 'No deceptive compliance indicators detected. Normal processing recommended.';
    }

    const indicatorList = indicators
      .map(i => `- ${i.description}`)
      .join('\n');

    const actionDescriptions: Record<DeceptiveComplianceAction, string> = {
      PROCEED: 'Normal processing can continue with monitoring.',
      SPOT_CHECK: 'Random human verification recommended.',
      FULL_REVIEW: 'Mandatory human review required before proceeding.',
      ESCALATE: 'Potential deceptive compliance detected. Full audit required.',
      BLOCK: 'Multiple critical indicators detected. Execution blocked pending investigation.',
    };

    return `Detected ${indicators.length} deceptive compliance indicator(s):\n${indicatorList}\n\nRecommended action: ${actionDescriptions[action]}`;
  }

  /**
   * Convert assessment to risk level adjustment
   */
  escalateRiskLevel(
    currentLevel: RiskLevel,
    assessment: DeceptiveComplianceAssessment
  ): RiskLevel {
    if (assessment.riskModifier === 0) {
      return currentLevel;
    }

    const levels: RiskLevel[] = ['minimal', 'low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(currentLevel);
    const newIndex = Math.min(
      currentIndex + Math.ceil(assessment.riskModifier),
      levels.length - 1
    );

    return levels[newIndex] ?? currentLevel;
  }
}

// ============================================
// EXPORTS
// ============================================

export default DeceptiveComplianceDetector;
