/**
 * FORGE Evidence Packs - Core Types
 * 
 * @epic 08 - Evidence Packs
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Type definitions for evidence collection, audit trails, and compliance documentation.
 */

// ============================================
// EVIDENCE PACK TYPES
// ============================================

export interface EvidencePack {
  /** Unique pack identifier */
  id: string;
  
  /** Pack version */
  version: string;
  
  /** Generation metadata */
  metadata: PackMetadata;
  
  /** Session evidence */
  session: SessionEvidence;
  
  /** Contract evidence */
  contract: ContractEvidence;
  
  /** Validation evidence */
  validations: ValidationEvidence[];
  
  /** Iteration history */
  iterations: IterationEvidence[];
  
  /** Final output evidence */
  output: OutputEvidence;
  
  /** Compliance attestations */
  compliance: ComplianceEvidence;
  
  /** Audit trail */
  auditTrail: AuditEntry[];
  
  /** Digital signature (optional) */
  signature?: DigitalSignature;
}

export interface PackMetadata {
  /** When the pack was generated */
  generatedAt: string;
  
  /** Generator version */
  generatorVersion: string;
  
  /** Source system */
  sourceSystem: string;
  
  /** Environment (dev/staging/prod) */
  environment: string;
  
  /** Operator/user ID */
  operatorId?: string;
  
  /** Request ID for tracing */
  requestId: string;
  
  /** Additional tags */
  tags: Record<string, string>;
}

// ============================================
// SESSION EVIDENCE
// ============================================

export interface SessionEvidence {
  /** Session ID */
  sessionId: string;
  
  /** Session start time */
  startTime: string;
  
  /** Session end time */
  endTime: string;
  
  /** Total duration (ms) */
  durationMs: number;
  
  /** Session status */
  status: SessionStatus;
  
  /** Input provided */
  input: {
    type: string;
    size: number;
    hash: string;
    summary: string;
  };
  
  /** Configuration used */
  config: {
    maxIterations: number;
    targetScore: number;
    timeoutMs: number;
    strategyName: string;
  };
  
  /** Resource usage */
  resources: ResourceUsage;
}

export type SessionStatus = 
  | 'completed'
  | 'converged'
  | 'timeout'
  | 'max-iterations'
  | 'failed'
  | 'aborted';

export interface ResourceUsage {
  /** Total tokens consumed */
  totalTokens: number;
  
  /** Input tokens */
  inputTokens: number;
  
  /** Output tokens */
  outputTokens: number;
  
  /** API calls made */
  apiCalls: number;
  
  /** Estimated cost (USD) */
  estimatedCostUsd: number;
  
  /** Peak memory usage (MB) */
  peakMemoryMb?: number;
}

// ============================================
// CONTRACT EVIDENCE
// ============================================

export interface ContractEvidence {
  /** Contract ID */
  contractId: string;
  
  /** Contract version */
  contractVersion: string;
  
  /** Contract name */
  contractName: string;
  
  /** Contract hash (for integrity) */
  contractHash: string;
  
  /** Schema hash */
  schemaHash: string;
  
  /** Validation rules summary */
  validationRules: ValidationRuleSummary[];
  
  /** Success formula parameters */
  successFormula: {
    probabilityWeight: number;
    valueWeight: number;
    costWeight: number;
    threshold: number;
  };
}

export interface ValidationRuleSummary {
  /** Rule ID */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Rule type */
  type: string;
  
  /** Is required */
  required: boolean;
  
  /** Weight in scoring */
  weight: number;
}

// ============================================
// VALIDATION EVIDENCE
// ============================================

export interface ValidationEvidence {
  /** Validator ID */
  validatorId: string;
  
  /** Validator name */
  validatorName: string;
  
  /** Validator type */
  validatorType: ValidatorType;
  
  /** When validation ran */
  timestamp: string;
  
  /** Validation result */
  result: ValidationResult;
  
  /** Score (0-1) */
  score: number;
  
  /** Detailed findings */
  findings: ValidationFinding[];
  
  /** Evidence artifacts */
  artifacts?: EvidenceArtifact[];
}

export type ValidatorType =
  | 'schema'
  | 'semantic'
  | 'structural'
  | 'computational'
  | 'security'
  | 'accessibility'
  | 'performance'
  | 'compliance'
  | 'custom';

export type ValidationResult =
  | 'pass'
  | 'fail'
  | 'warning'
  | 'skip'
  | 'error';

export interface ValidationFinding {
  /** Finding ID */
  id: string;
  
  /** Severity */
  severity: FindingSeverity;
  
  /** Category */
  category: string;
  
  /** Message */
  message: string;
  
  /** Location in output (if applicable) */
  location?: string;
  
  /** Expected value */
  expected?: string;
  
  /** Actual value */
  actual?: string;
  
  /** Suggested fix */
  suggestion?: string;
}

export type FindingSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

export interface EvidenceArtifact {
  /** Artifact type */
  type: ArtifactType;
  
  /** Artifact name */
  name: string;
  
  /** Content or reference */
  content?: string;
  
  /** External reference */
  ref?: string;
  
  /** Content hash */
  hash: string;
  
  /** MIME type */
  mimeType: string;
}

export type ArtifactType =
  | 'screenshot'
  | 'diff'
  | 'log'
  | 'report'
  | 'data'
  | 'code';

// ============================================
// ITERATION EVIDENCE
// ============================================

export interface IterationEvidence {
  /** Iteration number */
  iteration: number;
  
  /** When iteration started */
  startTime: string;
  
  /** Duration (ms) */
  durationMs: number;
  
  /** Input summary */
  inputSummary: string;
  
  /** Output summary */
  outputSummary: string;
  
  /** Validation score */
  score: number;
  
  /** Score delta from previous */
  scoreDelta: number;
  
  /** Feedback applied */
  feedback: FeedbackSummary[];
  
  /** Tokens used */
  tokensUsed: number;
  
  /** Converged flag */
  converged: boolean;
}

export interface FeedbackSummary {
  /** Feedback type */
  type: string;
  
  /** Source validator */
  source: string;
  
  /** Message */
  message: string;
  
  /** Applied flag */
  applied: boolean;
}

// ============================================
// OUTPUT EVIDENCE
// ============================================

export interface OutputEvidence {
  /** Output type */
  type: string;
  
  /** Output size (bytes) */
  size: number;
  
  /** Content hash */
  hash: string;
  
  /** Final score */
  finalScore: number;
  
  /** Converged flag */
  converged: boolean;
  
  /** Output summary */
  summary: string;
  
  /** Quality metrics */
  metrics: QualityMetrics;
  
  /** Output sample (truncated) */
  sample?: string;
}

export interface QualityMetrics {
  /** Completeness (0-1) */
  completeness: number;
  
  /** Correctness (0-1) */
  correctness: number;
  
  /** Consistency (0-1) */
  consistency: number;
  
  /** Compliance (0-1) */
  compliance: number;
  
  /** Overall quality (0-1) */
  overall: number;
}

// ============================================
// COMPLIANCE EVIDENCE
// ============================================

export interface ComplianceEvidence {
  /** Compliance frameworks checked */
  frameworks: ComplianceFramework[];
  
  /** Overall compliance status */
  status: ComplianceStatus;
  
  /** Attestations */
  attestations: Attestation[];
  
  /** Exceptions/waivers */
  exceptions: ComplianceException[];
}

export interface ComplianceFramework {
  /** Framework ID */
  id: string;
  
  /** Framework name */
  name: string;
  
  /** Version */
  version: string;
  
  /** Controls checked */
  controlsChecked: number;
  
  /** Controls passed */
  controlsPassed: number;
  
  /** Compliance percentage */
  compliancePercent: number;
  
  /** Control results */
  controls: ControlResult[];
}

export interface ControlResult {
  /** Control ID */
  controlId: string;
  
  /** Control name */
  controlName: string;
  
  /** Status */
  status: 'pass' | 'fail' | 'partial' | 'not-applicable';
  
  /** Evidence references */
  evidenceRefs: string[];
  
  /** Notes */
  notes?: string;
}

export type ComplianceStatus =
  | 'compliant'
  | 'non-compliant'
  | 'partial'
  | 'not-assessed';

export interface Attestation {
  /** Attestation type */
  type: string;
  
  /** Attestor */
  attestor: string;
  
  /** Timestamp */
  timestamp: string;
  
  /** Statement */
  statement: string;
  
  /** Signature */
  signature?: string;
}

export interface ComplianceException {
  /** Exception ID */
  id: string;
  
  /** Control ID */
  controlId: string;
  
  /** Reason */
  reason: string;
  
  /** Approved by */
  approvedBy: string;
  
  /** Expiration */
  expiresAt?: string;
}

// ============================================
// AUDIT TRAIL
// ============================================

export interface AuditEntry {
  /** Entry ID */
  id: string;
  
  /** Timestamp */
  timestamp: string;
  
  /** Event type */
  eventType: AuditEventType;
  
  /** Actor */
  actor: string;
  
  /** Action */
  action: string;
  
  /** Target */
  target?: string;
  
  /** Details */
  details: Record<string, unknown>;
  
  /** Hash of previous entry (chain) */
  previousHash?: string;
  
  /** Entry hash */
  hash: string;
}

export type AuditEventType =
  | 'session:start'
  | 'session:end'
  | 'iteration:start'
  | 'iteration:end'
  | 'validation:run'
  | 'validation:complete'
  | 'feedback:applied'
  | 'output:generated'
  | 'error:occurred'
  | 'config:changed'
  | 'approval:requested'
  | 'approval:granted'
  | 'approval:denied';

// ============================================
// DIGITAL SIGNATURE
// ============================================

export interface DigitalSignature {
  /** Algorithm used */
  algorithm: string;
  
  /** Signer ID */
  signerId: string;
  
  /** Timestamp */
  timestamp: string;
  
  /** Signature value */
  value: string;
  
  /** Certificate chain (optional) */
  certificateChain?: string[];
}

// ============================================
// EXPORT OPTIONS
// ============================================

export interface ExportOptions {
  /** Output format */
  format: ExportFormat;
  
  /** Include sections */
  sections: ExportSection[];
  
  /** Include artifacts */
  includeArtifacts: boolean;
  
  /** Redact sensitive data */
  redactSensitive: boolean;
  
  /** Compression */
  compress: boolean;
  
  /** Template (for formatted output) */
  template?: string;
}

export type ExportFormat =
  | 'json'
  | 'markdown'
  | 'html'
  | 'pdf'
  | 'xml'
  | 'csv';

export type ExportSection =
  | 'metadata'
  | 'session'
  | 'contract'
  | 'validations'
  | 'iterations'
  | 'output'
  | 'compliance'
  | 'audit'
  | 'signature';

// ============================================
// COLLECTOR OPTIONS
// ============================================

export interface CollectorOptions {
  /** Enable detailed logging */
  verbose: boolean;
  
  /** Collect iteration details */
  collectIterations: boolean;
  
  /** Collect validation artifacts */
  collectArtifacts: boolean;
  
  /** Hash algorithm */
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  
  /** Max artifact size (bytes) */
  maxArtifactSize: number;
  
  /** Redaction patterns */
  redactionPatterns: string[];
}

// ============================================
// DEFAULT OPTIONS
// ============================================

export const DEFAULT_COLLECTOR_OPTIONS: CollectorOptions = {
  verbose: false,
  collectIterations: true,
  collectArtifacts: true,
  hashAlgorithm: 'sha256',
  maxArtifactSize: 1024 * 1024, // 1MB
  redactionPatterns: [
    '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', // Email
    '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN
    '\\b\\d{16}\\b', // Credit card
  ],
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'json',
  sections: ['metadata', 'session', 'contract', 'validations', 'output', 'compliance', 'audit'],
  includeArtifacts: true,
  redactSensitive: true,
  compress: false,
};

// ============================================
// EXPORTS
// ============================================

export default EvidencePack;
