/**
 * FORGE Convergence Engine
 * 
 * @epic 04 - Convergence Engine
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   The core convergence engine that orchestrates iterative validation
 *   and repair loops to ensure AI outputs meet contract specifications.
 * 
 *   Governing Principle:
 *   Success = (P(Right) × V(Right)) ÷ C(Wrong)
 */

// ============================================
// MAIN ENGINE
// ============================================

export {
  ConvergenceEngine,
  createConvergenceEngine,
  getDefaultEngine,
} from './engine';

// ============================================
// STRATEGIES
// ============================================

export {
  ConvergenceStrategy,
  StrategyFactory,
  IterativeStrategy,
  HillClimbingStrategy,
  BinarySearchStrategy,
  GeneticStrategy,
  MonteCarloStrategy,
} from './strategies/strategy';

// ============================================
// RUNNER
// ============================================

export { StoppingPolicy } from './runner/stopping-policy';

// ============================================
// FEEDBACK
// ============================================

export { FeedbackGenerator } from './feedback/feedback-generator';

// ============================================
// METRICS
// ============================================

export {
  MetricsCollector,
  MetricsAggregator,
  AggregatedMetrics,
} from './metrics/metrics-collector';

// ============================================
// TYPES
// ============================================

export type {
  ConvergenceStatus,
  ValidationTier,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  IterationResult,
  RepairAction,
  ConvergenceFeedback,
  ConvergenceSession,
  ConvergenceConfig,
  ConvergenceStrategyType,
  StoppingCondition,
  StoppingPolicyResult,
  ConvergenceMetrics,
  ConvergenceEventType,
  ConvergenceEvent,
  ConvergenceEventHandler,
  ConvergenceEngineOptions,
  ValidatorFactory,
  ConvergenceResult,
  ConvergenceCallback,
} from './types';

export { DEFAULT_CONVERGENCE_CONFIG } from './types';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { ConvergenceEngine, createConvergenceEngine } from './engine';
import { ConvergenceConfig, ValidationResult, ConvergenceResult } from './types';

/**
 * Quick convergence - run a simple convergence loop
 */
export async function converge(
  output: unknown,
  contractId: string,
  validators: Array<{
    id: string;
    type: string;
    config: unknown;
    validate: (output: unknown) => Promise<ValidationResult>;
  }>,
  config?: Partial<ConvergenceConfig>
): Promise<ConvergenceResult> {
  const engine = createConvergenceEngine();
  return engine.converge(output, contractId, validators, config);
}

/**
 * Validate once without convergence loop
 */
export async function validateOnce(
  output: unknown,
  validators: Array<{
    id: string;
    type: string;
    config: unknown;
    validate: (output: unknown) => Promise<ValidationResult>;
  }>
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  for (const validator of validators) {
    const result = await validator.validate(output);
    result.validatorId = validator.id;
    result.validatorType = validator.type;
    results.push(result);
  }
  
  return results;
}

/**
 * Calculate overall score from validation results
 */
export function calculateScore(validations: ValidationResult[]): number {
  if (validations.length === 0) return 0;
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const v of validations) {
    const weight = v.confidence > 0 ? v.confidence : 0.5;
    const score = v.passed ? 1 : 0;
    weightedSum += score * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default ConvergenceEngine;
