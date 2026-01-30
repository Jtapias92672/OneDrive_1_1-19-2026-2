/**
 * MCP Security Gateway - Tenant Module
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.8 - Gateway Tenant Integration
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Tenant isolation module exports.
 *   Provides multi-tenant security controls for MCP Gateway.
 */

// ============================================
// CONTEXT EXTRACTOR
// ============================================

export {
  TenantContextExtractor,
  TenantNotFoundError,
  InvalidTenantIdError,
  type TenantRequest,
  type TenantContext,
  type TenantJWTClaims,
  type UserTenantMapping,
  type TenantExtractionOptions,
} from './context-extractor';

// ============================================
// ISOLATION ENGINE
// ============================================

export {
  TenantIsolationEngine,
  TenantAccessDeniedError,
  CrossTenantViolationError,
  type TenantToolRequest,
  type ResourceOwnership,
  type TenantIsolationConfig,
  type IsolationResult,
  type TenantAccess,
} from './isolation-engine';

// ============================================
// LEAK DETECTOR
// ============================================

export {
  CrossTenantLeakDetector,
  type LeakScanResult,
  type LeakDetection,
  type LeakAlert,
  type LeakDetectorConfig,
} from './leak-detector';

// ============================================
// LIMITS
// ============================================

export {
  TenantRateLimiter,
  TenantQuotaManager,
  TenantLimitsManager,
  type RateLimitConfig,
  type TenantQuota,
  type TenantLimits,
  type RateLimitResult,
  type QuotaCheckResult,
  type QuotaViolation,
  type QuotaUsage,
} from './limits';

// ============================================
// DEFAULT EXPORT
// ============================================

export { TenantIsolationEngine as default } from './isolation-engine';
