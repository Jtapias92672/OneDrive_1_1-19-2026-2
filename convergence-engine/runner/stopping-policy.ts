/**
 * FORGE Stopping Policy
 * 
 * @epic 04 - Convergence Engine
 * @task 4.1 - Stopping Conditions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Evaluates stopping conditions for the convergence loop.
 */

import {
  ConvergenceConfig,
  ConvergenceSession,
  ConvergenceStatus,
  StoppingCondition,
  StoppingPolicyResult,
} from '../types';

// ============================================
// STOPPING POLICY
// ============================================

export class StoppingPolicy {
  private config: ConvergenceConfig;
  private stagnationCount = 0;
  private lastScore = 0;

  constructor(config: ConvergenceConfig) {
    this.config = config;
  }

  /**
   * Evaluate all stopping conditions
   */
  evaluate(session: ConvergenceSession, previousScore: number): StoppingPolicyResult {
    const conditions: StoppingCondition[] = [];
    
    // 1. Max iterations
    const maxIterationsMet = session.iterations.length >= this.config.maxIterations;
    conditions.push({
      name: 'maxIterations',
      met: maxIterationsMet,
      description: 'Maximum iterations reached',
      currentValue: session.iterations.length,
      thresholdValue: this.config.maxIterations,
    });
    
    if (maxIterationsMet) {
      return {
        shouldStop: true,
        reason: `Maximum iterations (${this.config.maxIterations}) reached`,
        conditions,
        finalStatus: 'failed',
      };
    }
    
    // 2. Target score achieved
    const currentScore = session.iterations.length > 0 
      ? session.iterations[session.iterations.length - 1].score 
      : 0;
    const targetScoreMet = currentScore >= this.config.targetScore;
    conditions.push({
      name: 'targetScore',
      met: targetScoreMet,
      description: 'Target score achieved',
      currentValue: currentScore,
      thresholdValue: this.config.targetScore,
    });
    
    // Note: targetScore alone doesn't stop - we need allPassed too
    // This is handled in the engine
    
    // 3. Stagnation detection
    if (session.iterations.length > 0) {
      const scoreDelta = currentScore - previousScore;
      
      if (scoreDelta < this.config.minScoreImprovement) {
        this.stagnationCount++;
      } else {
        this.stagnationCount = 0;
      }
      
      const stagnationMet = this.stagnationCount >= this.config.stagnationThreshold;
      conditions.push({
        name: 'stagnation',
        met: stagnationMet,
        description: 'Score improvement stagnated',
        currentValue: this.stagnationCount,
        thresholdValue: this.config.stagnationThreshold,
      });
      
      if (stagnationMet) {
        return {
          shouldStop: true,
          reason: `Stagnation detected: no improvement for ${this.stagnationCount} iterations`,
          conditions,
          finalStatus: 'failed',
        };
      }
    }
    
    // 4. Budget limits
    if (this.config.budget) {
      const budget = this.config.budget;
      
      // API calls
      if (budget.maxApiCalls !== undefined) {
        const apiCalls = this.countApiCalls(session);
        const apiLimitMet = apiCalls >= budget.maxApiCalls;
        conditions.push({
          name: 'apiCallBudget',
          met: apiLimitMet,
          description: 'API call budget exceeded',
          currentValue: apiCalls,
          thresholdValue: budget.maxApiCalls,
        });
        
        if (apiLimitMet) {
          return {
            shouldStop: true,
            reason: `API call budget (${budget.maxApiCalls}) exceeded`,
            conditions,
            finalStatus: 'aborted',
          };
        }
      }
      
      // Cost
      if (budget.maxCost !== undefined) {
        const cost = this.estimateCost(session);
        const costLimitMet = cost >= budget.maxCost;
        conditions.push({
          name: 'costBudget',
          met: costLimitMet,
          description: 'Cost budget exceeded',
          currentValue: cost,
          thresholdValue: budget.maxCost,
        });
        
        if (costLimitMet) {
          return {
            shouldStop: true,
            reason: `Cost budget ($${budget.maxCost}) exceeded`,
            conditions,
            finalStatus: 'aborted',
          };
        }
      }
    }
    
    // 5. All validators passed
    if (session.iterations.length > 0) {
      const lastIteration = session.iterations[session.iterations.length - 1];
      const allPassedMet = lastIteration.allPassed && currentScore >= this.config.targetScore;
      conditions.push({
        name: 'allValidatorsPassed',
        met: allPassedMet,
        description: 'All validators passed with target score',
        currentValue: lastIteration.allPassed,
        thresholdValue: true,
      });
      
      if (allPassedMet) {
        return {
          shouldStop: true,
          reason: 'Convergence achieved: all validators passed',
          conditions,
          finalStatus: 'converged',
        };
      }
    }
    
    this.lastScore = currentScore;
    
    // Continue iterating
    return {
      shouldStop: false,
      reason: 'Continuing iteration',
      conditions,
      finalStatus: 'running',
    };
  }

  /**
   * Count API calls made in the session
   */
  private countApiCalls(session: ConvergenceSession): number {
    let count = 0;
    
    for (const iteration of session.iterations) {
      for (const validation of iteration.validations) {
        // Count validators that likely make API calls
        if (validation.validatorType === 'llm_judge' ||
            validation.validatorType === 'computational' ||
            validation.tier === 'L2') {
          count++;
        }
      }
    }
    
    return count;
  }

  /**
   * Estimate cost incurred in the session
   */
  private estimateCost(session: ConvergenceSession): number {
    let cost = 0;
    
    for (const iteration of session.iterations) {
      for (const validation of iteration.validations) {
        // Rough cost estimates
        switch (validation.validatorType) {
          case 'llm_judge':
            cost += 0.01; // $0.01 per LLM call
            break;
          case 'computational':
            if (validation.tier === 'L2') {
              cost += 0.001; // $0.001 per Wolfram call
            }
            break;
        }
      }
    }
    
    return cost;
  }

  /**
   * Reset policy state
   */
  reset(): void {
    this.stagnationCount = 0;
    this.lastScore = 0;
  }
}

// ============================================
// EXPORTS
// ============================================

export default StoppingPolicy;
