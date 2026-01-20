/**
 * FORGE Convergence Engine Types
 * 
 * @epic 04 - Convergence Engine
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Core types for the Convergence Engine - the iterative
 *   validation and repair loop that ensures AI outputs meet
 *   contract specifications.
 */

// ============================================
// CORE CONVERGENCE TYPES
// ============================================

/**
 * Convergence status
 */
export type ConvergenceStatus =
  | 'pending'      // Not yet started
  | 'running'      // Currently iterating
  | 'converged'    // Successfully met all criteria
  | 'failed'       // Exceeded max iterations without convergence
  | 'aborted'      // Manually stopped or error
  | 'timeout';     // Exceeded time limit

/**
 * Validation tier for computational claims
 */
export type ValidationTier = 'L1' | 'L1.5' | 'L2';

/**
 * Individual validation result
 */
export interface ValidationResult {
  /** Validator ID */
  validatorId: string;
  
  /** Validator type */
  validatorType: string;
  
  /** Did validation pass? */
  passed: boolean;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Specific errors */
  errors: ValidationError[];
  
  /** Warnings (non-blocking) */
  warnings: ValidationWarning[];
  
  /** Validation tier (for computational) */
  tier?: ValidationTier;
  
  /** Duration in ms */
  durationMs: number;
  
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

/**
 * Iteration result (one pass through all validators)
 */
export interface IterationResult {
  /** Iteration number (0-indexed) */
  iteration: number;
  
  /** All validation results */
  validations: ValidationResult[];
  
  /** Did all validators pass? */
  allPassed: boolean;
  
  /** Overall score (0-1) */
  score: number;
  
  /** Score improvement from previous iteration */
  scoreDelta: number;
  
  /** The output being validated */
  output: unknown;
  
  /** Timestamp */
  timestamp: string;
  
  /** Duration in ms */
  durationMs: number;
}

/**
 * Repair action suggested by the engine
 */
export interface RepairAction {
  /** Action ID */
  id: string;
  
  /** Action type */
  type: 'modify' | 'regenerate' | 'augment' | 'manual';
  
  /** Target path in the output */
  targetPath?: string;
  
  /** Description of what to fix */
  description: string;
  
  /** Suggested fix (if type is 'modify') */
  suggestedValue?: unknown;
  
  /** Prompt for regeneration (if type is 'regenerate') */
  regenerationPrompt?: string;
  
  /** Priority (1 = highest) */
  priority: number;
  
  /** Estimated impact on score (0-1) */
  estimatedImpact: number;
  
  /** Source validator */
  sourceValidator: string;
  
  /** Source error */
  sourceError: ValidationError;
}

/**
 * Feedback for the agent/LLM
 */
export interface ConvergenceFeedback {
  /** Summary of current state */
  summary: string;
  
  /** Current iteration */
  iteration: number;
  
  /** Current score */
  score: number;
  
  /** Errors to fix */
  errors: {
    path: string;
    message: string;
    suggestion?: string;
  }[];
  
  /** Repair actions */
  actions: RepairAction[];
  
  /** Guidance for next iteration */
  guidance: string;
  
  /** Should continue iterating? */
  shouldContinue: boolean;
  
  /** Reason if not continuing */
  stopReason?: string;
}

// ============================================
// CONVERGENCE SESSION
// ============================================

/**
 * A complete convergence session
 */
export interface ConvergenceSession {
  /** Session ID */
  id: string;
  
  /** Contract ID being validated against */
  contractId: string;
  
  /** Current status */
  status: ConvergenceStatus;
  
  /** All iteration results */
  iterations: IterationResult[];
  
  /** Current/final output */
  output: unknown;
  
  /** Initial output (before any repairs) */
  initialOutput: unknown;
  
  /** Session configuration */
  config: ConvergenceConfig;
  
  /** Final feedback */
  finalFeedback?: ConvergenceFeedback;
  
  /** Start time */
  startedAt: string;
  
  /** End time */
  endedAt?: string;
  
  /** Total duration in ms */
  totalDurationMs?: number;
  
  /** Evidence pack ID (if generated) */
  evidencePackId?: string;
}

/**
 * Convergence configuration
 */
export interface ConvergenceConfig {
  /** Maximum iterations before failure */
  maxIterations: number;
  
  /** Target score to achieve convergence (0-1) */
  targetScore: number;
  
  /** Timeout in ms (0 = no timeout) */
  timeoutMs: number;
  
  /** Minimum score improvement per iteration */
  minScoreImprovement: number;
  
  /** Stagnation threshold (iterations without improvement) */
  stagnationThreshold: number;
  
  /** Which convergence strategy to use */
  strategy: ConvergenceStrategyType;
  
  /** Strategy-specific options */
  strategyOptions?: Record<string, unknown>;
  
  /** Enable repair suggestions */
  enableRepairSuggestions: boolean;
  
  /** Generate evidence pack on completion */
  generateEvidencePack: boolean;
  
  /** Budget limits */
  budget?: {
    maxApiCalls?: number;
    maxTokens?: number;
    maxCost?: number;
  };
}

export type ConvergenceStrategyType =
  | 'iterative'      // Simple iteration until convergence
  | 'hill-climbing'  // Focus on highest-impact repairs
  | 'binary-search'  // Binary search on parameters
  | 'genetic'        // Genetic algorithm for complex cases
  | 'monte-carlo'    // Random sampling with best selection
  | 'custom';        // User-defined strategy

// ============================================
// STOPPING CONDITIONS
// ============================================

/**
 * Stopping condition evaluation
 */
export interface StoppingCondition {
  /** Condition name */
  name: string;
  
  /** Is condition met? */
  met: boolean;
  
  /** Description */
  description: string;
  
  /** Current value */
  currentValue: unknown;
  
  /** Threshold value */
  thresholdValue: unknown;
}

/**
 * Stopping policy result
 */
export interface StoppingPolicyResult {
  /** Should stop? */
  shouldStop: boolean;
  
  /** Reason for stopping */
  reason: string;
  
  /** All evaluated conditions */
  conditions: StoppingCondition[];
  
  /** Final status if stopping */
  finalStatus: ConvergenceStatus;
}

// ============================================
// METRICS & TRACKING
// ============================================

/**
 * Convergence metrics
 */
export interface ConvergenceMetrics {
  /** Session ID */
  sessionId: string;
  
  /** Total iterations */
  totalIterations: number;
  
  /** Final score */
  finalScore: number;
  
  /** Score progression */
  scoreProgression: number[];
  
  /** Time to convergence (ms) */
  timeToConvergence: number;
  
  /** API calls made */
  apiCalls: number;
  
  /** Tokens used */
  tokensUsed: number;
  
  /** Cost incurred */
  costIncurred: number;
  
  /** Validators that passed/failed */
  validatorStats: {
    validatorId: string;
    passCount: number;
    failCount: number;
    avgConfidence: number;
  }[];
  
  /** Most common errors */
  topErrors: {
    code: string;
    count: number;
    avgIterationToFix: number;
  }[];
  
  /** Strategy effectiveness */
  strategyEffectiveness: {
    actionsGenerated: number;
    actionsApplied: number;
    successfulActions: number;
  };
}

// ============================================
// ENGINE EVENTS
// ============================================

/**
 * Events emitted by the engine
 */
export type ConvergenceEventType =
  | 'session:start'
  | 'session:end'
  | 'iteration:start'
  | 'iteration:end'
  | 'validation:start'
  | 'validation:end'
  | 'repair:suggested'
  | 'repair:applied'
  | 'stagnation:detected'
  | 'budget:warning'
  | 'budget:exceeded'
  | 'error';

export interface ConvergenceEvent {
  type: ConvergenceEventType;
  sessionId: string;
  timestamp: string;
  data: unknown;
}

export type ConvergenceEventHandler = (event: ConvergenceEvent) => void | Promise<void>;

// ============================================
// ENGINE OPTIONS
// ============================================

/**
 * Engine initialization options
 */
export interface ConvergenceEngineOptions {
  /** Default configuration */
  defaultConfig?: Partial<ConvergenceConfig>;
  
  /** Event handlers */
  onEvent?: ConvergenceEventHandler;
  
  /** Logger */
  logger?: {
    debug: (msg: string, ...args: unknown[]) => void;
    info: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string, ...args: unknown[]) => void;
  };
  
  /** LLM client for repairs */
  llmClient?: {
    complete: (prompt: string) => Promise<string>;
  };
  
  /** Custom validators */
  customValidators?: Map<string, ValidatorFactory>;
}

export type ValidatorFactory = (config: unknown) => {
  validate: (output: unknown, context?: unknown) => Promise<ValidationResult>;
};

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_CONVERGENCE_CONFIG: ConvergenceConfig = {
  maxIterations: 10,
  targetScore: 0.95,
  timeoutMs: 300000, // 5 minutes
  minScoreImprovement: 0.01,
  stagnationThreshold: 3,
  strategy: 'hill-climbing',
  enableRepairSuggestions: true,
  generateEvidencePack: true,
};

// ============================================
// UTILITY TYPES
// ============================================

export interface ConvergenceResult {
  success: boolean;
  session: ConvergenceSession;
  metrics: ConvergenceMetrics;
  output: unknown;
  feedback: ConvergenceFeedback;
}

export type ConvergenceCallback = (
  iteration: IterationResult,
  session: ConvergenceSession
) => void | Promise<void>;

// ============================================
// EXPORTS
// ============================================

export default ConvergenceConfig;
