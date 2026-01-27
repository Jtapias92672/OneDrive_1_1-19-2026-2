/**
 * CARS Assessor
 * Performs risk assessment using the CARS framework
 */

import {
  CARSContext,
  CARSAction,
  CARSAssessment,
  CARSRisk,
  CARSSafeguards,
  RiskLevel,
  UserFailureHistory,
} from './types';
import { calculateAllRiskFactors, calculateRiskScore } from './risk-factors';

/**
 * In-memory store for user failure history
 * In production, this would be backed by a database
 */
const userHistoryStore = new Map<string, UserFailureHistory>();

export class CARSAssessor {
  /**
   * Perform a CARS assessment
   */
  assess(
    context: CARSContext,
    action: CARSAction,
    userHistory?: UserFailureHistory
  ): CARSAssessment {
    // Use provided history or look up from store
    const history = userHistory ?? userHistoryStore.get(context.userId);

    const factors = calculateAllRiskFactors(context, action, history);
    const score = calculateRiskScore(factors);
    const level = this.determineRiskLevel(score);
    const safeguards = this.determineSafeguards(level, context, action);

    return {
      id: this.generateId(),
      context,
      action,
      risk: { level, score, factors },
      safeguards,
      assessedAt: new Date(),
    };
  }

  /**
   * Determine risk level from score
   * 0-25: low, 26-50: medium, 51-75: high, 76-100: critical
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  }

  /**
   * Determine required safeguards based on risk level
   */
  private determineSafeguards(
    level: RiskLevel,
    context: CARSContext,
    action: CARSAction
  ): CARSSafeguards {
    const safeguards: CARSSafeguards = {
      testsRequired: false,
      reviewRequired: false,
      approvalRequired: false,
      rollbackPlan: false,
      additionalChecks: [],
    };

    // Low risk: minimal safeguards
    if (level === 'low') {
      return safeguards;
    }

    // Medium risk: require tests
    if (level === 'medium') {
      safeguards.testsRequired = true;
      return safeguards;
    }

    // High risk: require tests, review, approval
    if (level === 'high') {
      safeguards.testsRequired = true;
      safeguards.reviewRequired = true;
      safeguards.approvalRequired = true;

      if (!action.reversible) {
        safeguards.rollbackPlan = true;
        safeguards.additionalChecks.push('Prepare rollback procedure');
      }

      return safeguards;
    }

    // Critical risk: all safeguards + additional checks
    safeguards.testsRequired = true;
    safeguards.reviewRequired = true;
    safeguards.approvalRequired = true;
    safeguards.rollbackPlan = true;

    safeguards.additionalChecks.push('Prepare rollback procedure');
    safeguards.additionalChecks.push('Notify stakeholders before execution');

    if (context.environment === 'production') {
      safeguards.additionalChecks.push('Schedule maintenance window');
    }

    if (context.dataClassification === 4) {
      safeguards.additionalChecks.push('Data protection review required');
    }

    if (context.scope === 'system-wide') {
      safeguards.additionalChecks.push('Impact analysis documentation');
    }

    return safeguards;
  }

  /**
   * Generate unique assessment ID
   */
  private generateId(): string {
    return `cars-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record user operation result for failure tracking
   */
  recordOperationResult(userId: string, success: boolean): void {
    const existing = userHistoryStore.get(userId) ?? {
      userId,
      recentFailures: 0,
      totalOperations: 0,
    };

    existing.totalOperations++;
    if (!success) {
      existing.recentFailures++;
    }

    userHistoryStore.set(userId, existing);
  }

  /**
   * Get user failure history
   */
  getUserHistory(userId: string): UserFailureHistory | undefined {
    return userHistoryStore.get(userId);
  }

  /**
   * Clear user history (for testing)
   */
  clearUserHistory(userId?: string): void {
    if (userId) {
      userHistoryStore.delete(userId);
    } else {
      userHistoryStore.clear();
    }
  }
}

// Singleton instance
export const carsAssessor = new CARSAssessor();
