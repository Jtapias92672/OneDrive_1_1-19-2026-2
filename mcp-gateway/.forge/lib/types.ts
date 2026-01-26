/**
 * FORGE Agent Orchestration - Shared Types
 * Pattern: Mayor-Worker (Gas Town)
 */

// =============================================================================
// Task Types
// =============================================================================

export type TaskType = 'translate' | 'validate' | 'remediate';

export type TaskStatus =
  | 'PENDING'      // Created, not yet assigned
  | 'READY'        // Dependencies met, can be dispatched
  | 'IN_PROGRESS'  // Worker executing
  | 'COMPLETE'     // Successfully finished
  | 'FAILED'       // Execution failed
  | 'BLOCKED';     // Waiting on dependencies

export interface Task {
  id: string;                    // Hash-based: "task-a1b2c3d4"
  type: TaskType;
  convoyId?: string;             // Parent convoy if part of bundle

  input: TaskInput;
  expectedOutput?: TaskOutputSchema;

  status: TaskStatus;
  assignedWorker?: string;       // Worker ID when in progress

  // Dependencies (Beads-style)
  blockedBy: string[];           // Task IDs that must complete first
  blocks: string[];              // Task IDs waiting on this task
  discoveredFrom?: string;       // Parent task if found during work

  // Timing
  created: string;               // ISO timestamp
  updated: string;               // Last modification
  timeout?: string;              // ISO deadline

  // Attempt tracking
  attempts: number;
  maxAttempts: number;

  // V&V tracking (Epic 7.5)
  vnv?: TaskVnV;
  workItemId?: string;             // Link to work item with CheckerSpec
}

export interface TaskInput {
  componentId?: string;          // For translator
  mpkPath?: string;              // For validator/remediator
  validationReport?: ValidationReport;  // For remediator
}

export interface TaskOutputSchema {
  type: string;
  requiredFields?: string[];
}

// =============================================================================
// Hook Types (Git-backed task persistence)
// =============================================================================

export type HookStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';

export interface Hook {
  id: string;                    // "translator-001"
  workerId: string;              // Worker instance ID
  role: WorkerRole;

  task: Task;
  context: MinimumViableContext;
  status: HookStatus;

  // Timing
  assigned: string;              // ISO timestamp
  started?: string;              // When IN_PROGRESS began
  completed?: string;            // When COMPLETE/FAILED

  // Handoff support
  handoffReason?: 'context_limit' | 'timeout' | 'error';
  resumePoint?: string;
}

export interface HookResult {
  taskId: string;
  hookId: string;
  status: 'COMPLETE' | 'FAILED';

  output?: TaskOutput;
  error?: TaskError;

  evidence: Evidence;
  discoveredTasks?: DiscoveredTask[];
}

export interface TaskOutput {
  mpkPath?: string;              // Translator output
  validationReport?: ValidationReport;  // Validator output
  fixesApplied?: number;         // Remediator output
  fixesSummary?: FixSummary[];
}

export interface TaskError {
  code: string;
  message: string;
  recoverable: boolean;
  remainingIssues?: Issue[];
}

export interface Evidence {
  inputHash: string;             // SHA-256 of input
  outputHash: string;            // SHA-256 of output
  timestamp: string;             // ISO completion time
  diffImage?: string;            // Path to visual diff
  patchHash?: string;            // Hash of applied patch
}

export interface DiscoveredTask {
  componentName: string;
  componentId: string;
  discoveredFrom: string;        // Parent task ID
  reason: string;
}

// =============================================================================
// Convoy Types (Work bundling)
// =============================================================================

export type ConvoyStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'BLOCKED';

export interface Convoy {
  id: string;                    // Hash-based: "convoy-a1b2"
  name: string;                  // Human-readable name
  figmaFileKey: string;          // Source Figma file
  frameId?: string;              // Optional: specific frame

  tasks: string[];               // Task IDs in this convoy
  status: ConvoyStatus;

  // Timing
  created: string;
  updated: string;

  // Progress tracking
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  blockedTasks: number;
  inProgressTasks: number;
}

export interface ConvoyProgress {
  total: number;
  complete: number;
  inProgress: number;
  ready: number;
  blocked: number;
  failed: number;
  percentComplete: number;
}

// =============================================================================
// Minimum Viable Context (MVC)
// =============================================================================

export type WorkerRole = 'translator' | 'validator' | 'remediator';

export interface MinimumViableContext {
  task: {
    id: string;
    type: TaskType;
    componentId?: string;
    mpkPath?: string;
  };

  // Task-specific context (only what's needed)
  component?: FigmaComponent;        // For translator
  expectedVisual?: string;           // For validator
  schema?: TaskOutputSchema;         // For validator
  validationReport?: ValidationReport;  // For remediator
  previousAttempts?: number;         // For remediator
  maxAttempts?: number;              // For remediator
  thresholds?: ValidationThresholds; // For validator

  // Output location
  outputPath?: string;

  // Allowed tools (3-5 max)
  tools: string[];

  // V&V context (Epic 7.5)
  checkerSpec?: CheckerSpec;       // For validator: V&V requirements
  workItemId?: string;             // Link to work item
}

// =============================================================================
// Figma Types
// =============================================================================

export interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  styles?: Record<string, unknown>;
  children?: FigmaComponent[];
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationReport {
  passed: boolean;
  visual: VisualValidation;
  structural: StructuralValidation;
}

export interface VisualValidation {
  passed: boolean;
  pixelDiff: number;
  percentDiff: number;
  diffRegions?: DiffRegion[];
}

export interface StructuralValidation {
  passed: boolean;
  matchPercent: number;
  errors?: string[];
}

export interface DiffRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  severity: 'low' | 'medium' | 'high';
}

export interface ValidationThresholds {
  pixelDiffPercent: number;
  structuralMatchPercent: number;
}

export interface Issue {
  type: 'color' | 'spacing' | 'size' | 'position' | 'font' | 'border' | 'effect';
  region?: DiffRegion;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix?: string;
}

export interface FixSummary {
  type: string;
  from: string;
  to: string;
}

// =============================================================================
// Ledger Event Types
// =============================================================================

export type EventType =
  | 'task_created'
  | 'task_dispatched'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'task_blocked'
  | 'convoy_created'
  | 'convoy_completed'
  | 'convoy_blocked'
  | 'escalation'
  // V&V Events (Epic 7.5)
  | 'gate_evaluated'
  | 'gate_authorized'
  | 'gate_denied'
  | 'vnv_evaluated'
  | 'vnv_passed'
  | 'vnv_failed'
  | 'checker_spec_loaded'
  | 'checker_spec_invalid';

export interface LedgerEvent {
  id: string;                    // Hash-based event ID
  type: EventType;
  timestamp: string;             // ISO timestamp

  taskId?: string;
  convoyId?: string;
  workerId?: string;

  data?: Record<string, unknown>;
  error?: TaskError;
}

// =============================================================================
// Sling (Task Dispatch)
// =============================================================================

export interface SlingRequest {
  taskId: string;
  rig: WorkerRole;               // Target worker role
  priority?: number;             // Higher = more urgent
}

export interface SlingResult {
  success: boolean;
  hookId?: string;
  error?: string;
  gateDecision?: GateDecision;
}

// =============================================================================
// V&V Types (Epic 7.5 - Verification & Validation)
// =============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ChangeSurface = 'isolated' | 'module' | 'cross-module' | 'system-wide';
export type CheckPriority = 'must' | 'should' | 'could';
export type VnVStatus = 'pending' | 'passed' | 'failed';
export type GateName = 'pr' | 'pre_merge' | 'release_candidate' | 'release' | 'pre_dispatch';
export type GateStatus = 'AUTHORIZED' | 'DENIED';

/**
 * CheckerSpec: V&V contract for work items
 * Defines verification (technical) and validation (business) checks
 */
export interface CheckerSpec {
  version: string;
  workItem: WorkItemMeta;
  intent: Intent;
  risk?: RiskAssessment;
  verification: CheckBlock;
  validation: CheckBlock;
  testSuites: SuiteRequirements;
  evidence: EvidenceRequirements;
  definitionOfDone: string[];
  nonGoals?: string[];
  externalLinks?: ExternalLinks;
}

export interface WorkItemMeta {
  id: string;                      // e.g., "FORGE-123"
  title: string;
  type: 'feature' | 'bug' | 'refactor' | 'spike' | 'chore';
  storyPoints?: number;
  touchedModules?: string[];
}

export interface Intent {
  summary: string;
  acceptanceCriteria: string[];
  context?: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  changeSurface?: ChangeSurface;
  factors?: string[];
  mitigations?: string[];
}

export interface CheckBlock {
  checks: Check[];
  notes?: string;
}

export interface Check {
  id: string;                      // V-N for verification, B-N for validation
  description: string;
  priority: CheckPriority;
  automated?: boolean;
  testIds?: string[];
  evidenceType?: 'test-result' | 'code-review' | 'manual-verification' | 'screenshot' | 'log';
}

export interface SuiteRequirements {
  membership: Array<'smoke' | 'sanity' | 'regression'>;
  tags?: string[];
  targetedTests?: string[];
}

export interface EvidenceRequirements {
  required: Array<'test-results' | 'coverage-report' | 'visual-diff' | 'schema-validation' | 'lint-results' | 'build-log' | 'manual-sign-off'>;
  optional?: string[];
  artifacts?: EvidenceArtifact[];
}

export interface EvidenceArtifact {
  name: string;
  path: string;
  description?: string;
}

export interface ExternalLinks {
  ticket?: string;
  design?: string;
  documentation?: string;
  figma?: string;
}

/**
 * VnVResult: Result of V&V evaluation against evidence
 */
export interface VnVResult {
  checkerSpecId: string;
  workItemId: string;
  evaluatedAt: string;

  verification: VnVBlockResult;
  validation: VnVBlockResult;

  overallStatus: 'PASS' | 'FAIL';
  summary: string;
}

export interface VnVBlockResult {
  mustPass: string[];              // Check IDs that must pass
  passed: string[];                // Check IDs that passed
  failed: string[];                // Check IDs that failed
  skipped: string[];               // Check IDs not evaluated
  status: VnVStatus;
}

/**
 * GateDecision: Result of gate evaluation
 */
export interface GateDecision {
  gate: GateName;
  status: GateStatus;
  reasons: string[];
  warnings?: string[];
  requiredActions?: string[];
  evaluatedAt: string;
  context?: GateContext;
}

export interface GateContext {
  workItemId?: string;
  checkerSpecId?: string;
  suiteResults: Record<string, SuiteResult>;
  targetedTestsPassed: boolean;
  coveragePercent?: number;
  coverageDelta?: number;
  riskLevel?: RiskLevel;
  approved?: boolean;
  approvers?: string[];
}

export interface SuiteResult {
  passed: boolean;
  total: number;
  failed: number;
  skipped: number;
  duration: number;                // milliseconds
  withinBudget: boolean;
}

/**
 * TaskVnV: V&V status fields for Task entries
 */
export interface TaskVnV {
  checkerSpecId: string;
  verificationStatus: VnVStatus;
  validationStatus: VnVStatus;
  gatesPassed: GateName[];
  gatesFailed: GateName[];
  lastEvaluated: string;
}

/**
 * TestEvidence: Evidence for Receipt Pack
 */
export interface TestEvidence {
  runs: TestRun[];
  summary: TestSummary;
}

export interface TestRun {
  suite: string;
  runner: string;
  status: 'pass' | 'fail' | 'error';
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  startedAt: string;
  completedAt: string;
  artifacts?: string[];
  failures?: TestFailure[];
}

export interface TestFailure {
  testId: string;
  testName: string;
  message: string;
  location?: string;
  stack?: string;
}

export interface TestSummary {
  overallStatus: 'pass' | 'fail';
  suites: string[];
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  coveragePercent?: number;
}

/**
 * VnVSummary: V&V summary for Receipt Pack
 */
export interface VnVSummary {
  verification: VnVBlockSummary;
  validation: VnVBlockSummary;
  gatesEvaluated: GateSummary[];
  overallStatus: 'PASS' | 'FAIL';
}

export interface VnVBlockSummary {
  status: VnVStatus;
  totalChecks: number;
  mustChecks: number;
  mustPassed: number;
  mustFailed: number;
  passedIds: string[];
  failedIds: string[];
}

export interface GateSummary {
  gate: GateName;
  status: GateStatus;
  evaluatedAt: string;
}
