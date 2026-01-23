/**
 * MCP Security Gateway - CARS Module
 *
 * @epic 3.5 - Gateway Foundation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   CARS (Context-Aware Risk Scoring) module for the MCP Security Gateway.
 *   Implements comprehensive risk assessment with:
 *   - Risk level definitions and tool risk matrix
 *   - Context-aware risk modifiers
 *   - Deceptive compliance detection (Anthropic Dec 2024)
 *   - Reward hacking detection (Anthropic Nov 2025)
 */

// ============================================
// RISK LEVELS
// ============================================

export {
  CARSRiskLevel,
  type RiskLevelString,
  VALID_RISK_LEVELS,
  isValidRiskLevel,
  riskLevelToString,
  stringToRiskLevel,
  escalateRiskLevel,
  requiresApproval,
  shouldBlock,
  getRiskLevelDescription,
  getAutonomyLevel,
  compareRiskLevels,
  maxRiskLevel,
} from './risk-levels.js';

// ============================================
// RISK MATRIX
// ============================================

export {
  TOOL_RISK_MATRIX,
  getToolRisk,
  isKnownTool,
  getToolsAtRiskLevel,
  getToolsAtOrAboveRiskLevel,
  registerToolRisk,
  updateToolRisk,
  getRiskMatrixStats,
} from './risk-matrix.js';

// ============================================
// CONTEXT
// ============================================

export {
  type CARSContext,
  type MinimalCARSContext,
  type UserRole,
  type Environment,
  type ValidationResult,
  VALID_USER_ROLES,
  VALID_ENVIRONMENTS,
  createCARSContext,
  validateCARSContext,
  safeParseCARSContext,
  isValidCARSContext,
  CONTEXT_RISK_FACTORS,
  calculateContextRiskModifier,
  canPerformHighRiskOperations,
  requiresAdditionalApproval,
} from './context.js';

// ============================================
// DECEPTIVE COMPLIANCE DETECTOR
// ============================================

export {
  DeceptiveComplianceDetector,
  type DeceptiveComplianceContext,
  type DeceptiveComplianceIndicator,
  type DeceptiveComplianceAssessment,
  type DeceptiveComplianceAction,
} from './deceptive-compliance-detector.js';

// ============================================
// REWARD HACKING DETECTOR
// ============================================

export {
  RewardHackingDetector,
  type RewardHackingContext,
  type RewardHackingPattern,
  type RewardHackingAssessment,
  type RewardHackingAction,
} from './reward-hacking-detector.js';

// ============================================
// RISK ASSESSMENT ENGINE
// ============================================

export {
  CARSEngine,
  type ToolCallRequest,
  type RiskAssessment,
  type Safeguard,
  type CARSEngineConfig,
  getDefaultCARSEngine,
  createCARSEngine,
  assessRisk,
} from './risk-assessment.js';

// ============================================
// DEFAULT EXPORT
// ============================================

export { CARSEngine as default } from './risk-assessment.js';
