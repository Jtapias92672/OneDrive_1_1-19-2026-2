/**
 * FORGE B-D Platform - Computational Accuracy Types
 * Epic 14.1: Core type definitions for computational validation
 * 
 * Governing Principle: Success = (P(Right) × V(Right)) ÷ C(Wrong)
 */

// =============================================================================
// VALIDATION TIERS
// =============================================================================

export type ValidationTier = 'L1' | 'L1.5' | 'L2';

export interface TierConfig {
  tier: ValidationTier;
  name: string;
  description: string;
  costPerQuery: number;
  latencyMs: number;
  confidenceThreshold: number;
}

export const TIER_CONFIGS: Record<ValidationTier, TierConfig> = {
  L1: {
    tier: 'L1',
    name: 'Local Deterministic',
    description: 'Fast local validation using deterministic code',
    costPerQuery: 0,
    latencyMs: 10,
    confidenceThreshold: 0.95,
  },
  'L1.5': {
    tier: 'L1.5',
    name: 'Wolfram Alpha',
    description: 'External validation via Wolfram Alpha API',
    costPerQuery: 0.01,
    latencyMs: 500,
    confidenceThreshold: 0.99,
  },
  L2: {
    tier: 'L2',
    name: 'Expert Review',
    description: 'Human expert validation for edge cases',
    costPerQuery: 50.0,
    latencyMs: 86400000, // 24 hours
    confidenceThreshold: 1.0,
  },
};

// =============================================================================
// CLAIM DETECTION
// =============================================================================

export type ClaimCategory =
  | 'evm'           // Earned Value Management
  | 'defense'       // Defense contract calculations
  | 'financial'     // Financial calculations
  | 'statistical'   // Statistical claims
  | 'temporal'      // Date/time calculations
  | 'percentage'    // Percentage calculations
  | 'unit'          // Unit conversions
  | 'mathematical'  // General math
  | 'scientific';   // Scientific constants/formulas

export interface ClaimPattern {
  id: string;
  category: ClaimCategory;
  pattern: RegExp;
  description: string;
  formula?: string;
  extractVariables: (match: RegExpMatchArray) => Record<string, string | number>;
  priority: number; // Higher = check first
}

export interface DetectedClaim {
  id: string;
  text: string;
  category: ClaimCategory;
  patternId: string;
  variables: Record<string, string | number>;
  position: {
    start: number;
    end: number;
  };
  confidence: number;
  extractedAt: string;
}

// =============================================================================
// VALIDATION RESULTS
// =============================================================================

export type ValidationStatus = 'valid' | 'invalid' | 'uncertain' | 'error' | 'skipped';

export interface ValidationResult {
  claimId: string;
  status: ValidationStatus;
  tier: ValidationTier;
  confidence: number;
  expectedValue?: string | number;
  actualValue?: string | number;
  deviation?: number;
  deviationPercent?: number;
  toleranceUsed?: number;
  reasoning?: string;
  errorMessage?: string;
  validatedAt: string;
  latencyMs: number;
  cached: boolean;
}

export interface L1ValidationResult extends ValidationResult {
  tier: 'L1';
  computationMethod: string;
  formula?: string;
}

export interface WolframValidationResult extends ValidationResult {
  tier: 'L1.5';
  wolframQuery: string;
  wolframResponse?: WolframResponse;
  queryId?: string;
}

// =============================================================================
// WOLFRAM INTEGRATION
// =============================================================================

export interface WolframConfig {
  appId: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  dailyBudgetUsd: number;
  costPerQuery: number;
  cacheTtlSeconds: number;
}

export interface WolframQuery {
  input: string;
  format?: 'plaintext' | 'mathml' | 'image';
  podFilter?: string[];
  assumption?: string[];
}

export interface WolframPod {
  title: string;
  scanner: string;
  id: string;
  subpods: Array<{
    title: string;
    plaintext?: string;
    img?: {
      src: string;
      alt: string;
    };
  }>;
}

export interface WolframResponse {
  success: boolean;
  error: boolean;
  errorMessage?: string;
  numpods: number;
  pods: WolframPod[];
  timing: number;
  recalculate?: string;
}

// =============================================================================
// BUDGET TRACKING
// =============================================================================

export interface BudgetState {
  dailyLimitUsd: number;
  usedTodayUsd: number;
  remainingUsd: number;
  queryCount: number;
  lastResetDate: string;
  alertThresholds: number[]; // e.g., [0.5, 0.75, 0.9]
  alertsSent: number[];
}

export interface CostRecord {
  timestamp: string;
  tier: ValidationTier;
  claimId: string;
  costUsd: number;
  cached: boolean;
}

// =============================================================================
// EVIDENCE PACKS (Task 2.2)
// =============================================================================

export interface EvidencePackSummary {
  totalClaims: number;
  validClaims: number;
  invalidClaims: number;
  uncertainClaims: number;
  errorClaims: number;
  skippedClaims: number;
  l1PassRate: number;
  l1_5PassRate: number;
  overallPassRate: number;
  wolframInvocations: number;
  averageConfidence: number;
}

export interface EvidencePackCost {
  totalQueries: number;
  l1Queries: number;
  wolframQueries: number;
  estimatedCostUsd: number;
  budgetUsedPercent: number;
  budgetRemainingUsd: number;
}

export interface ClaimEvidence {
  claim: DetectedClaim;
  validationChain: ValidationResult[];
  finalStatus: ValidationStatus;
  finalConfidence: number;
  repairAttempts?: RepairAttempt[];
  auditTrail: AuditEntry[];
}

export interface RepairAttempt {
  attemptNumber: number;
  timestamp: string;
  originalValue: string | number;
  suggestedValue: string | number;
  repairReason: string;
  accepted: boolean;
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  tier?: ValidationTier;
  details: Record<string, unknown>;
}

export interface EvidencePack {
  id: string;
  version: string;
  createdAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'failed';
  
  // Source context
  sourceId: string;
  sourceType: 'agent_output' | 'document' | 'api_response';
  sourceHash: string;
  
  // Validation results
  summary: EvidencePackSummary;
  claims: ClaimEvidence[];
  
  // Cost tracking
  cost: EvidencePackCost;
  
  // Metadata
  validatorVersion: string;
  configSnapshot: {
    tolerances: Record<ClaimCategory, number>;
    tierConfig: Record<ValidationTier, TierConfig>;
  };
}

// =============================================================================
// REPAIR LOOP (Task 2.3)
// =============================================================================

export interface RepairFeedback {
  claimId: string;
  originalText: string;
  invalidReason: string;
  suggestedCorrection: string;
  confidence: number;
  category: ClaimCategory;
  severity: 'critical' | 'major' | 'minor';
}

export interface ConvergenceState {
  iteration: number;
  maxIterations: number;
  currentPassRate: number;
  targetPassRate: number;
  converged: boolean;
  exitReason?: 'target_reached' | 'max_iterations' | 'no_improvement' | 'budget_exhausted';
  history: Array<{
    iteration: number;
    passRate: number;
    claimsRepaired: number;
    timestamp: string;
  }>;
}

// =============================================================================
// METRICS (Task 2.4)
// =============================================================================

export interface ValidationMetrics {
  timestamp: string;
  period: 'hourly' | 'daily' | 'weekly';
  
  // Volume metrics
  totalValidations: number;
  claimsProcessed: number;
  
  // Accuracy metrics
  passRate: number;
  passRateByCategory: Record<ClaimCategory, number>;
  passRateByTier: Record<ValidationTier, number>;
  
  // Performance metrics
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  
  // Cost metrics
  totalCostUsd: number;
  costByTier: Record<ValidationTier, number>;
  cacheHitRate: number;
  
  // Efficiency metrics
  l1PassRate: number;
  wolframEscalationRate: number;
  humanEscalationRate: number;
}
