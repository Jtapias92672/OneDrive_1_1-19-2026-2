/**
 * FORGE Convergence Strategies
 * 
 * @epic 04 - Convergence Engine
 * @task 3.1 - Strategies
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Different strategies for driving convergence:
 *   - Iterative: Simple loop until convergence
 *   - Hill-climbing: Focus on highest-impact repairs
 *   - Binary-search: Parameter optimization
 *   - Genetic: Evolution-based for complex cases
 */

import {
  IterationResult,
  ValidationResult,
  RepairAction,
  ValidationError,
  ConvergenceStrategyType,
} from '../types';

// ============================================
// BASE STRATEGY
// ============================================

export interface ConvergenceStrategy {
  /** Strategy name */
  name: string;
  
  /** Generate repair actions based on iteration history */
  generateRepairActions(
    currentIteration: IterationResult,
    history: IterationResult[]
  ): RepairAction[];
  
  /** Select next output to try (for strategies that maintain population) */
  selectNextCandidate?(
    candidates: unknown[],
    scores: number[]
  ): unknown;
  
  /** Should the strategy continue? */
  shouldContinue(history: IterationResult[]): boolean;
}

// ============================================
// ITERATIVE STRATEGY
// ============================================

/**
 * Simple iterative strategy - generates repairs for all errors
 */
export class IterativeStrategy implements ConvergenceStrategy {
  name = 'iterative';

  generateRepairActions(
    currentIteration: IterationResult,
    history: IterationResult[]
  ): RepairAction[] {
    const actions: RepairAction[] = [];
    let priority = 1;
    
    for (const validation of currentIteration.validations) {
      if (!validation.passed) {
        for (const error of validation.errors) {
          actions.push(this.errorToAction(error, validation, priority++));
        }
      }
    }
    
    return actions;
  }

  shouldContinue(history: IterationResult[]): boolean {
    if (history.length === 0) return true;
    const last = history[history.length - 1];
    return !last.allPassed;
  }

  private errorToAction(
    error: ValidationError,
    validation: ValidationResult,
    priority: number
  ): RepairAction {
    return {
      id: `action_${Date.now()}_${priority}`,
      type: 'modify',
      targetPath: error.path,
      description: error.message,
      suggestedValue: error.expected,
      priority,
      estimatedImpact: 1 / priority,
      sourceValidator: validation.validatorId,
      sourceError: error,
    };
  }
}

// ============================================
// HILL CLIMBING STRATEGY
// ============================================

/**
 * Hill-climbing strategy - focuses on highest-impact repairs first
 */
export class HillClimbingStrategy implements ConvergenceStrategy {
  name = 'hill-climbing';
  private maxActionsPerIteration: number;

  constructor(options?: { maxActionsPerIteration?: number }) {
    this.maxActionsPerIteration = options?.maxActionsPerIteration ?? 3;
  }

  generateRepairActions(
    currentIteration: IterationResult,
    history: IterationResult[]
  ): RepairAction[] {
    const allErrors: Array<{
      error: ValidationError;
      validation: ValidationResult;
      impact: number;
    }> = [];
    
    // Collect all errors with estimated impact
    for (const validation of currentIteration.validations) {
      if (!validation.passed) {
        for (const error of validation.errors) {
          const impact = this.estimateImpact(error, validation, history);
          allErrors.push({ error, validation, impact });
        }
      }
    }
    
    // Sort by impact (highest first)
    allErrors.sort((a, b) => b.impact - a.impact);
    
    // Take top N actions
    const topErrors = allErrors.slice(0, this.maxActionsPerIteration);
    
    return topErrors.map((item, index) => ({
      id: `hc_action_${Date.now()}_${index}`,
      type: 'modify' as const,
      targetPath: item.error.path,
      description: item.error.message,
      suggestedValue: item.error.expected,
      priority: index + 1,
      estimatedImpact: item.impact,
      sourceValidator: item.validation.validatorId,
      sourceError: item.error,
    }));
  }

  shouldContinue(history: IterationResult[]): boolean {
    if (history.length < 2) return true;
    
    const recent = history.slice(-3);
    const scores = recent.map(r => r.score);
    
    // Check if making progress
    const improving = scores.length >= 2 && 
      scores[scores.length - 1] > scores[scores.length - 2];
    
    // Check if near convergence
    const nearConvergence = scores[scores.length - 1] > 0.9;
    
    return !history[history.length - 1].allPassed && (improving || nearConvergence);
  }

  private estimateImpact(
    error: ValidationError,
    validation: ValidationResult,
    history: IterationResult[]
  ): number {
    let impact = 0.5; // Base impact
    
    // Higher impact for critical errors
    if (error.severity === 'critical') {
      impact += 0.3;
    }
    
    // Higher impact for validators with lower confidence
    impact += (1 - validation.confidence) * 0.2;
    
    // Check if this error appeared in previous iterations
    const persistentError = history.some(iter => 
      iter.validations.some(v => 
        v.errors.some(e => e.code === error.code && e.path === error.path)
      )
    );
    
    if (persistentError) {
      impact += 0.2; // Persistent errors are higher priority
    }
    
    return Math.min(1, impact);
  }
}

// ============================================
// BINARY SEARCH STRATEGY
// ============================================

/**
 * Binary search strategy - for numeric parameter optimization
 */
export class BinarySearchStrategy implements ConvergenceStrategy {
  name = 'binary-search';
  private parameterRanges: Map<string, { min: number; max: number; current: number }>;

  constructor(options?: { parameterRanges?: Record<string, { min: number; max: number }> }) {
    this.parameterRanges = new Map();
    
    if (options?.parameterRanges) {
      for (const [key, range] of Object.entries(options.parameterRanges)) {
        this.parameterRanges.set(key, {
          min: range.min,
          max: range.max,
          current: (range.min + range.max) / 2,
        });
      }
    }
  }

  generateRepairActions(
    currentIteration: IterationResult,
    history: IterationResult[]
  ): RepairAction[] {
    const actions: RepairAction[] = [];
    
    for (const validation of currentIteration.validations) {
      if (!validation.passed) {
        for (const error of validation.errors) {
          // Check if this is a numeric error with bounds
          if (error.expected !== undefined && typeof error.expected === 'number' &&
              error.actual !== undefined && typeof error.actual === 'number') {
            
            const path = error.path || 'unknown';
            let range = this.parameterRanges.get(path);
            
            if (!range) {
              // Initialize range based on error
              const expected = error.expected as number;
              const actual = error.actual as number;
              range = {
                min: Math.min(expected, actual) * 0.5,
                max: Math.max(expected, actual) * 1.5,
                current: actual,
              };
              this.parameterRanges.set(path, range);
            }
            
            // Binary search: move toward expected value
            const expected = error.expected as number;
            if (range.current < expected) {
              range.min = range.current;
            } else {
              range.max = range.current;
            }
            range.current = (range.min + range.max) / 2;
            
            actions.push({
              id: `bs_action_${Date.now()}_${path}`,
              type: 'modify',
              targetPath: path,
              description: `Binary search: adjusting ${path} from ${error.actual} toward ${expected}`,
              suggestedValue: range.current,
              priority: 1,
              estimatedImpact: 0.5,
              sourceValidator: validation.validatorId,
              sourceError: error,
            });
          }
        }
      }
    }
    
    return actions;
  }

  shouldContinue(history: IterationResult[]): boolean {
    if (history.length === 0) return true;
    
    // Check if ranges have converged
    for (const range of this.parameterRanges.values()) {
      if (range.max - range.min > 0.001) {
        return true; // Still has room to search
      }
    }
    
    return !history[history.length - 1].allPassed;
  }
}

// ============================================
// GENETIC STRATEGY
// ============================================

/**
 * Genetic strategy - evolution-based for complex optimization
 */
export class GeneticStrategy implements ConvergenceStrategy {
  name = 'genetic';
  private populationSize: number;
  private mutationRate: number;
  private population: unknown[] = [];
  private fitness: number[] = [];

  constructor(options?: { populationSize?: number; mutationRate?: number }) {
    this.populationSize = options?.populationSize ?? 10;
    this.mutationRate = options?.mutationRate ?? 0.1;
  }

  generateRepairActions(
    currentIteration: IterationResult,
    history: IterationResult[]
  ): RepairAction[] {
    const actions: RepairAction[] = [];
    
    // For genetic strategy, we suggest mutations based on errors
    for (const validation of currentIteration.validations) {
      if (!validation.passed) {
        for (const error of validation.errors) {
          // Generate mutation suggestions
          if (Math.random() < this.mutationRate || error.severity === 'critical') {
            actions.push({
              id: `gen_action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              type: 'regenerate',
              targetPath: error.path,
              description: `Genetic mutation: regenerate ${error.path}`,
              regenerationPrompt: this.buildMutationPrompt(error, currentIteration.output),
              priority: error.severity === 'critical' ? 1 : 2,
              estimatedImpact: 0.3 + Math.random() * 0.4,
              sourceValidator: validation.validatorId,
              sourceError: error,
            });
          }
        }
      }
    }
    
    return actions;
  }

  selectNextCandidate(candidates: unknown[], scores: number[]): unknown {
    // Tournament selection
    const tournamentSize = Math.min(3, candidates.length);
    let bestIdx = Math.floor(Math.random() * candidates.length);
    let bestScore = scores[bestIdx];
    
    for (let i = 1; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * candidates.length);
      if (scores[idx] > bestScore) {
        bestIdx = idx;
        bestScore = scores[idx];
      }
    }
    
    return candidates[bestIdx];
  }

  shouldContinue(history: IterationResult[]): boolean {
    if (history.length === 0) return true;
    if (history[history.length - 1].allPassed) return false;
    
    // Check for stagnation (no improvement in last 5 generations)
    if (history.length >= 5) {
      const recentScores = history.slice(-5).map(r => r.score);
      const maxRecent = Math.max(...recentScores);
      const minRecent = Math.min(...recentScores);
      
      if (maxRecent - minRecent < 0.01) {
        return false; // Stagnated
      }
    }
    
    return true;
  }

  private buildMutationPrompt(error: ValidationError, output: unknown): string {
    return `Fix the following error in the output:
Error: ${error.message}
Path: ${error.path || 'root'}
Expected: ${JSON.stringify(error.expected)}
Actual: ${JSON.stringify(error.actual)}

Current output section:
${JSON.stringify(output, null, 2).slice(0, 500)}

Provide only the corrected value, no explanation.`;
  }
}

// ============================================
// MONTE CARLO STRATEGY
// ============================================

/**
 * Monte Carlo strategy - random sampling with best selection
 */
export class MonteCarloStrategy implements ConvergenceStrategy {
  name = 'monte-carlo';
  private sampleSize: number;
  private samples: Array<{ output: unknown; score: number }> = [];

  constructor(options?: { sampleSize?: number }) {
    this.sampleSize = options?.sampleSize ?? 5;
  }

  generateRepairActions(
    currentIteration: IterationResult,
    history: IterationResult[]
  ): RepairAction[] {
    const actions: RepairAction[] = [];
    
    // Generate random variations for failed validators
    for (const validation of currentIteration.validations) {
      if (!validation.passed && validation.errors.length > 0) {
        const error = validation.errors[0]; // Focus on first error
        
        actions.push({
          id: `mc_action_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'regenerate',
          targetPath: error.path,
          description: `Monte Carlo: random variation for ${error.path}`,
          regenerationPrompt: `Generate a valid value for ${error.path}. Requirements: ${error.message}`,
          priority: 1,
          estimatedImpact: 0.5,
          sourceValidator: validation.validatorId,
          sourceError: error,
        });
      }
    }
    
    return actions;
  }

  selectNextCandidate(candidates: unknown[], scores: number[]): unknown {
    // Select best from samples
    let bestIdx = 0;
    let bestScore = scores[0];
    
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > bestScore) {
        bestIdx = i;
        bestScore = scores[i];
      }
    }
    
    return candidates[bestIdx];
  }

  shouldContinue(history: IterationResult[]): boolean {
    if (history.length === 0) return true;
    return !history[history.length - 1].allPassed;
  }
}

// ============================================
// STRATEGY FACTORY
// ============================================

export class StrategyFactory {
  static create(
    type: ConvergenceStrategyType,
    options?: Record<string, unknown>
  ): ConvergenceStrategy {
    switch (type) {
      case 'iterative':
        return new IterativeStrategy();
      
      case 'hill-climbing':
        return new HillClimbingStrategy(options as any);
      
      case 'binary-search':
        return new BinarySearchStrategy(options as any);
      
      case 'genetic':
        return new GeneticStrategy(options as any);
      
      case 'monte-carlo':
        return new MonteCarloStrategy(options as any);
      
      case 'custom':
        throw new Error('Custom strategy requires explicit implementation');
      
      default:
        return new HillClimbingStrategy(); // Default
    }
  }
}

// ============================================
// EXPORTS
// ============================================

export default StrategyFactory;
