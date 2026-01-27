/**
 * CARS Risk Factors
 * 6 factors with weights summing to 1.0
 */

import {
  CARSContext,
  CARSAction,
  RiskFactor,
  UserFailureHistory,
} from './types';

export const RISK_FACTOR_WEIGHTS = {
  dataSensitivity: 0.25,
  environment: 0.20,
  scope: 0.15,
  reversibility: 0.15,
  impact: 0.15,
  previousFailures: 0.10,
} as const;

/**
 * Calculate data sensitivity factor
 * Tier 1=0, Tier 2=25, Tier 3=50, Tier 4=100
 */
export function calculateDataSensitivityFactor(
  dataClassification: CARSContext['dataClassification']
): RiskFactor {
  const values: Record<number, number> = { 1: 0, 2: 25, 3: 50, 4: 100 };
  const reasons: Record<number, string> = {
    1: 'Public data - minimal sensitivity',
    2: 'Internal data - low sensitivity',
    3: 'Confidential data - moderate sensitivity',
    4: 'Restricted data - maximum sensitivity',
  };

  return {
    name: 'Data Sensitivity',
    weight: RISK_FACTOR_WEIGHTS.dataSensitivity,
    value: values[dataClassification],
    reason: reasons[dataClassification],
  };
}

/**
 * Calculate environment factor
 * dev=0, staging=40, production=100
 */
export function calculateEnvironmentFactor(
  environment: CARSContext['environment']
): RiskFactor {
  const values: Record<string, number> = {
    development: 0,
    staging: 40,
    production: 100,
  };
  const reasons: Record<string, string> = {
    development: 'Development environment - isolated',
    staging: 'Staging environment - pre-production',
    production: 'Production environment - live system',
  };

  return {
    name: 'Environment',
    weight: RISK_FACTOR_WEIGHTS.environment,
    value: values[environment],
    reason: reasons[environment],
  };
}

/**
 * Calculate scope factor
 * single=20, multiple=50, system=100
 */
export function calculateScopeFactor(scope: CARSContext['scope']): RiskFactor {
  const values: Record<string, number> = {
    'single-file': 20,
    'multiple-files': 50,
    'system-wide': 100,
  };
  const reasons: Record<string, string> = {
    'single-file': 'Single file change - limited scope',
    'multiple-files': 'Multiple files affected - moderate scope',
    'system-wide': 'System-wide changes - maximum scope',
  };

  return {
    name: 'Scope',
    weight: RISK_FACTOR_WEIGHTS.scope,
    value: values[scope],
    reason: reasons[scope],
  };
}

/**
 * Calculate reversibility factor
 * reversible=0, irreversible=100
 */
export function calculateReversibilityFactor(
  reversible: CARSAction['reversible']
): RiskFactor {
  return {
    name: 'Reversibility',
    weight: RISK_FACTOR_WEIGHTS.reversibility,
    value: reversible ? 0 : 100,
    reason: reversible
      ? 'Operation can be reversed'
      : 'Operation cannot be reversed',
  };
}

/**
 * Calculate impact factor
 * low=20, medium=50, high=100
 */
export function calculateImpactFactor(
  impact: CARSAction['estimatedImpact']
): RiskFactor {
  const values: Record<string, number> = {
    low: 20,
    medium: 50,
    high: 100,
  };
  const reasons: Record<string, string> = {
    low: 'Low impact on system operations',
    medium: 'Medium impact on system operations',
    high: 'High impact on system operations',
  };

  return {
    name: 'Impact',
    weight: RISK_FACTOR_WEIGHTS.impact,
    value: values[impact],
    reason: reasons[impact],
  };
}

/**
 * Calculate previous failures factor
 * Based on user's recent failure rate
 */
export function calculatePreviousFailuresFactor(
  history: UserFailureHistory | undefined
): RiskFactor {
  if (!history || history.totalOperations === 0) {
    return {
      name: 'Previous Failures',
      weight: RISK_FACTOR_WEIGHTS.previousFailures,
      value: 0,
      reason: 'No prior operation history',
    };
  }

  const failureRate = history.recentFailures / history.totalOperations;
  // Scale: 0% failures = 0, 50%+ failures = 100
  const value = Math.min(100, Math.round(failureRate * 200));

  let reason: string;
  if (failureRate === 0) {
    reason = 'No recent failures';
  } else if (failureRate < 0.1) {
    reason = 'Low recent failure rate';
  } else if (failureRate < 0.25) {
    reason = 'Moderate recent failure rate';
  } else {
    reason = 'High recent failure rate';
  }

  return {
    name: 'Previous Failures',
    weight: RISK_FACTOR_WEIGHTS.previousFailures,
    value,
    reason,
  };
}

/**
 * Calculate all risk factors
 */
export function calculateAllRiskFactors(
  context: CARSContext,
  action: CARSAction,
  userHistory?: UserFailureHistory
): RiskFactor[] {
  return [
    calculateDataSensitivityFactor(context.dataClassification),
    calculateEnvironmentFactor(context.environment),
    calculateScopeFactor(context.scope),
    calculateReversibilityFactor(action.reversible),
    calculateImpactFactor(action.estimatedImpact),
    calculatePreviousFailuresFactor(userHistory),
  ];
}

/**
 * Calculate weighted risk score from factors
 */
export function calculateRiskScore(factors: RiskFactor[]): number {
  const weightedSum = factors.reduce(
    (sum, factor) => sum + factor.value * factor.weight,
    0
  );
  return Math.round(weightedSum);
}
