/**
 * MCP Security Gateway - Sanitization Module
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.12 - Gateway Sanitization Integration
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Input sanitization module exports.
 *   Provides comprehensive injection attack prevention.
 */

// ============================================
// PATTERNS
// ============================================

export {
  INJECTION_PATTERNS,
  SQL_INJECTION_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  XSS_PATTERNS,
  getAllPatterns,
  getPatternsByType,
  getPatternsBySeverity,
  matchesAnyPattern,
  findAllMatches,
  type InjectionPattern,
  type InjectionType,
  type PatternMatch,
} from './patterns.js';

// ============================================
// SANITIZER
// ============================================

export {
  InputSanitizer,
  InjectionDetectedError,
  type SanitizationContext,
  type SanitizationResult,
  type ThreatDetection,
  type SanitizerConfig,
} from './sanitizer.js';

// ============================================
// POLICIES
// ============================================

export {
  PolicyEngine,
  TOOL_POLICIES,
  type ParameterPolicy,
  type ToolSanitizationPolicy,
  type PolicyEvaluationResult,
  type PolicyViolation,
} from './policies.js';

// ============================================
// OUTPUT SANITIZATION
// ============================================

export {
  OutputSanitizer,
  getDefaultOutputSanitizer,
  sanitizeOutput,
  containsSensitiveData,
  type OutputSanitizationOptions,
  type RedactionPattern,
  type OutputSanitizationResult,
  type RedactionRecord,
} from './output.js';

// ============================================
// DEFAULT EXPORT
// ============================================

export { InputSanitizer as default } from './sanitizer.js';
