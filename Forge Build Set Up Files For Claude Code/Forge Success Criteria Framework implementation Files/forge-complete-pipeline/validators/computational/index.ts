/**
 * FORGE Computational Validators
 * 
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * Exports for the Computational Accuracy Layer (Epic 14.1)
 * 
 * Phase 1: Core Infrastructure ✅
 * Phase 2: Pipeline Integration ✅
 * Phase 3: Optimization ✅
 */

// ============================================
// PHASE 1: CORE INFRASTRUCTURE
// ============================================

// Wolfram Client
export {
  WolframClient,
  getWolframClient,
  type WolframQueryResult,
  type WolframError,
  type UsageStats,
} from './wolfram-client';

// Computational Validator
export {
  ComputationalValidator,
  getComputationalValidator,
  detectComputationalClaims,
  type ComputationalClaim,
  type ValidationResult,
  type ValidationReport,
  type ValidationTier,
  type ValidationStatus,
} from './computational-validator';

// Claim Patterns
export {
  CLAIM_PATTERNS,
  EVM_PATTERNS,
  DEFENSE_PATTERNS,
  FINANCIAL_PATTERNS,
  STATISTICAL_PATTERNS,
  CONVERSION_PATTERNS,
  GENERIC_PATTERNS,
  getPatternsByCategory,
  getAllPatternsSorted,
  getPatternStats,
  parseNumber,
  type ClaimPattern,
  type ClaimCategory,
  type ExtractedClaim,
} from './claim-patterns';

// ============================================
// PHASE 2: PIPELINE INTEGRATION
// ============================================

// Enhanced Claim Detector (Task 2.1)
export {
  ClaimDetector,
  getClaimDetector,
  detectClaims,
  detectEVMClaims,
  detectDefenseClaims,
  detectFinancialClaims,
  hasComputationalClaims,
  type DetectedClaim,
  type DetectionOptions,
  type DetectionResult,
} from './claim-detector';

// Evidence Pack Builder (Task 2.2)
export {
  EvidencePackBuilder,
  createEvidencePack,
  exportToJSON,
  verifyIntegrity,
  type EvidencePack,
  type EvidencePackConfig,
  type ClaimEvidence,
  type AuditEntry,
  type EvidencePackSummary,
  type CostSummary,
} from './evidence-pack';

// Repair Loop Integration (Task 2.3)
export {
  RepairLoopEngine,
  generateRepairFeedback,
  formatFeedbackForAgent,
  type RepairFeedback,
  type ConvergenceConfig,
  type ConvergenceState,
  type RepairLoopResult,
} from './repair-loop';

// Dashboard Metrics (Task 2.4)
export {
  MetricsCollector,
  getMetricsCollector,
  type MetricPoint,
  type LatencyStats,
  type PeriodMetrics,
  type RealTimeMetrics,
  type AlertConfig,
  type Alert,
} from './metrics';

// ============================================
// PHASE 3: OPTIMIZATION
// ============================================

// Redis Cache (Task 3.1)
export {
  RedisCache,
  CachedWolframClient,
  type RedisCacheConfig,
  type CacheStats,
  type CachedResult,
} from './redis-cache';

// Circuit Breaker (Task 3.2)
export {
  CircuitBreaker,
  ProtectedWolframClient,
  type CircuitState,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
  type CircuitBreakerResult,
} from './circuit-breaker';

// Cost Alerting (Task 3.3)
export {
  CostAlertManager,
  getCostAlertManager,
  type CostAlertConfig,
  type CostAlert,
  type BudgetStatus,
  type AlertLevel,
  type AlertChannel,
} from './cost-alerting';

// Batch Validation (Task 3.4)
export {
  BatchValidator,
  validateDocumentBatch,
  type BatchConfig,
  type BatchProgress,
  type BatchResult,
  type ProgressCallback,
  type ResultCallback,
} from './batch-validation';
