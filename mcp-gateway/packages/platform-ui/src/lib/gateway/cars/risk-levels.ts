/**
 * MCP Security Gateway - CARS Risk Levels
 *
 * @epic 3.5 - Gateway Foundation
 * @task 3.5.2.1 - Define CARS risk levels and matrix
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Risk level definitions for the CARS (Context-Aware Risk Scoring) framework.
 *   Implements the risk classification system from FORGE-MCP-DEEP-DIVE-ANALYSIS.md
 */

// ============================================
// RISK LEVEL ENUM
// ============================================

/**
 * Numeric risk levels for CARS framework calculations
 */
export enum CARSRiskLevel {
  /** No side effects, read-only metadata */
  MINIMAL = 0,

  /** Read-only operations, no state changes */
  LOW = 1,

  /** Limited write operations, reversible */
  MEDIUM = 2,

  /** Significant side effects, may be irreversible */
  HIGH = 3,

  /** System-level access, critical operations */
  CRITICAL = 4,
}

/**
 * String-based risk level type (for compatibility with existing code)
 */
export type RiskLevelString =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

/**
 * Valid risk level strings
 */
export const VALID_RISK_LEVELS: RiskLevelString[] = [
  'minimal',
  'low',
  'medium',
  'high',
  'critical',
];

/**
 * Validate risk level string
 */
export function isValidRiskLevel(level: string): level is RiskLevelString {
  return VALID_RISK_LEVELS.includes(level as RiskLevelString);
}

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Convert numeric risk level to string
 */
export function riskLevelToString(level: CARSRiskLevel): RiskLevelString {
  const mapping: Record<CARSRiskLevel, RiskLevelString> = {
    [CARSRiskLevel.MINIMAL]: 'minimal',
    [CARSRiskLevel.LOW]: 'low',
    [CARSRiskLevel.MEDIUM]: 'medium',
    [CARSRiskLevel.HIGH]: 'high',
    [CARSRiskLevel.CRITICAL]: 'critical',
  };
  return mapping[level];
}

/**
 * Convert string risk level to numeric
 */
export function stringToRiskLevel(level: RiskLevelString): CARSRiskLevel {
  const mapping: Record<RiskLevelString, CARSRiskLevel> = {
    minimal: CARSRiskLevel.MINIMAL,
    low: CARSRiskLevel.LOW,
    medium: CARSRiskLevel.MEDIUM,
    high: CARSRiskLevel.HIGH,
    critical: CARSRiskLevel.CRITICAL,
  };
  return mapping[level];
}

/**
 * Escalate risk level by a given amount (capped at CRITICAL)
 */
export function escalateRiskLevel(
  current: CARSRiskLevel,
  amount: number
): CARSRiskLevel {
  const newLevel = current + Math.ceil(amount);
  return Math.min(newLevel, CARSRiskLevel.CRITICAL) as CARSRiskLevel;
}

/**
 * Check if risk level requires human approval
 */
export function requiresApproval(level: CARSRiskLevel): boolean {
  return level >= CARSRiskLevel.MEDIUM;
}

/**
 * Check if risk level should block execution
 */
export function shouldBlock(level: CARSRiskLevel): boolean {
  return level >= CARSRiskLevel.CRITICAL;
}

/**
 * Get human-readable description for risk level
 */
export function getRiskLevelDescription(level: CARSRiskLevel): string {
  const descriptions: Record<CARSRiskLevel, string> = {
    [CARSRiskLevel.MINIMAL]: 'No side effects - safe for autonomous execution',
    [CARSRiskLevel.LOW]: 'Read-only operations - minimal oversight needed',
    [CARSRiskLevel.MEDIUM]: 'Limited writes - human notification recommended',
    [CARSRiskLevel.HIGH]: 'Significant impact - human approval required',
    [CARSRiskLevel.CRITICAL]: 'System-level access - manual execution only',
  };
  return descriptions[level];
}

/**
 * Get recommended autonomy level for risk
 */
export function getAutonomyLevel(
  level: CARSRiskLevel
): 'full' | 'supervised' | 'assisted' | 'manual' {
  if (level <= CARSRiskLevel.MINIMAL) return 'full';
  if (level <= CARSRiskLevel.LOW) return 'supervised';
  if (level <= CARSRiskLevel.HIGH) return 'assisted';
  return 'manual';
}

// ============================================
// RISK LEVEL COMPARISONS
// ============================================

/**
 * Compare two risk levels
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareRiskLevels(
  a: CARSRiskLevel,
  b: CARSRiskLevel
): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Get the maximum of two risk levels
 */
export function maxRiskLevel(
  a: CARSRiskLevel,
  b: CARSRiskLevel
): CARSRiskLevel {
  return Math.max(a, b) as CARSRiskLevel;
}

// ============================================
// EXPORTS
// ============================================

export default CARSRiskLevel;
