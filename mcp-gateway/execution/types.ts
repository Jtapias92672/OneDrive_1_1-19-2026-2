/**
 * MCP Gateway - Code Execution Types
 *
 * @epic 3.75 - Code Execution
 * @task 3.75.1.1 - Create code-execution package and types
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Types for secure code execution aligned with:
 *   - forge-success-criteria/09_DATA_PROTECTION.md (Input Schema)
 *   - forge-success-criteria/05_CONVERGENCE_ENGINE.md (Budget/Timeout)
 *   - forge-success-criteria/12_HUMAN_REVIEW.md (Approval Gates)
 */

// ============================================
// DATA CLASSIFICATION (09_DATA_PROTECTION)
// ============================================

export type DataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

// ============================================
// PRIVACY DETECTION
// ============================================

export interface PrivacyDetection {
  type: 'pii' | 'secret';
  category: string;  // email, phone, ssn, api_key, etc.
  token: string;     // e.g., "[REDACTED_EMAIL_1]"
  location: { start: number; end: number };
}

// ============================================
// EXECUTION OPTIONS
// ============================================

export interface ExecutionOptions {
  /** Execution timeout in ms (FROM 05_CONVERGENCE_ENGINE) */
  timeout?: number;

  /** Maximum memory in MB */
  maxMemory?: number;

  /** Allow network access */
  allowNetwork?: boolean;

  /** Allow filesystem access */
  allowFileSystem?: boolean;

  /** Working directory for execution */
  workingDirectory?: string;

  /** Data classification level (FROM 09_DATA_PROTECTION) */
  classification?: DataClassification;

  /** Session ID for audit trail */
  sessionId?: string;

  /** Tenant ID for multi-tenant isolation */
  tenantId?: string;

  /** User ID for attribution */
  userId?: string;

  /** Skip CARS risk assessment (only for pre-approved operations) */
  skipRiskAssessment?: boolean;
}

// ============================================
// EXECUTION RESULT
// ============================================

export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean;

  /** Execution output (privacy-filtered) */
  output: string;

  /** Error message if failed */
  error?: string;

  /** Execution duration in ms */
  duration: number;

  /** Memory used in MB */
  memoryUsed?: number;

  /** Privacy detections from output filtering */
  privacyDetections?: PrivacyDetection[];

  /** Exit code if applicable */
  exitCode?: number;

  /** Whether execution was terminated due to timeout */
  timedOut?: boolean;
}

// ============================================
// SAFE EXECUTION RESULT (WITH CARS)
// ============================================

export interface SafeExecutionResult extends ExecutionResult {
  /** CARS risk assessment result */
  riskAssessment: RiskAssessmentSummary;

  /** Audit trail session ID for Evidence Pack integration */
  auditTrail: string;

  /** Whether human approval was required */
  requiresApproval: boolean;

  /** Approval status if required */
  approvalStatus?: 'pending' | 'approved' | 'denied';
}

export interface RiskAssessmentSummary {
  /** Risk level */
  level: 'low' | 'medium' | 'high' | 'critical';

  /** Risk score 0.0 - 1.0 */
  score: number;

  /** Risk types detected */
  types: string[];

  /** Recommended classification */
  recommendedClassification: DataClassification;

  /** Whether approval is required */
  requiresApproval: boolean;
}

// ============================================
// SANDBOX INTERFACE
// ============================================

export interface Sandbox {
  /** Sandbox name/type */
  name: string;

  /** Execute code in sandbox */
  execute(code: string, options?: ExecutionOptions): Promise<ExecutionResult>;

  /** Dispose/cleanup sandbox */
  dispose(): Promise<void>;
}

export type SandboxType = 'deno' | 'vm' | 'docker' | 'wasm';

// ============================================
// MCP CODE-FIRST PATTERN TYPES
// ============================================

/**
 * MCP Tool Discovery Mode
 * On-demand discovery reduces token usage by ~98% (150K → 2K)
 */
export type ToolDiscoveryMode = 'upfront' | 'on-demand';

export interface MCPToolManifest {
  /** Tool name */
  name: string;

  /** Tool description (used for on-demand discovery) */
  description: string;

  /** Input schema (loaded on-demand) */
  inputSchema?: Record<string, unknown>;

  /** Server this tool belongs to */
  server: string;

  /** Tool category for grouping */
  category?: string;

  /** Estimated token cost for full schema */
  tokenCost?: number;
}

export interface MCPConnectionConfig {
  /** Server identifier */
  serverId: string;

  /** Server URL */
  url: string;

  /** Connection timeout in ms */
  connectionTimeout?: number;

  /** Whether to use connection pooling */
  usePooling?: boolean;

  /** Maximum pool connections */
  maxPoolSize?: number;

  /** Idle timeout for pooled connections */
  poolIdleTimeout?: number;
}

export interface MCPCodeFirstConfig {
  /** Tool discovery mode */
  discoveryMode: ToolDiscoveryMode;

  /** Maximum tools to load upfront (if in upfront mode) */
  maxUpfrontTools?: number;

  /** Enable pre-context data filtering */
  enablePreContextFiltering: boolean;

  /** Maximum data size before filtering (in bytes) */
  preContextFilterThreshold?: number;

  /** Enable connection pooling */
  enableConnectionPooling: boolean;

  /** Connection pool configuration */
  poolConfig?: {
    maxConnections: number;
    idleTimeoutMs: number;
    warmConnections: number;
  };
}

// ============================================
// AUDIT EVENT TYPES (06_EVIDENCE_PACK)
// ============================================

export type AuditEventType =
  | 'execution_start'
  | 'execution_end'
  | 'file_access'
  | 'network_access'
  | 'privacy_detection'
  | 'risk_assessment'
  | 'approval_request'
  | 'approval_response'
  | 'sandbox_violation'
  | 'error';

export interface AuditEvent {
  /** Timestamp ISO8601 (per Evidence Pack spec) */
  timestamp: string;

  /** Event type */
  eventType: AuditEventType;

  /** Session ID for correlation */
  sessionId: string;

  /** Event details */
  details: Record<string, unknown>;

  /** Data classification (FROM 09_DATA_PROTECTION) */
  classification?: DataClassification;

  /** Execution ID if applicable */
  executionId?: string;

  /** Risk level at time of event */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================
// VIRTUAL FILESYSTEM TYPES
// ============================================

export interface VirtualFile {
  /** File content */
  content: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last modified timestamp */
  modifiedAt: Date;

  /** Data classification */
  classification?: DataClassification;

  /** File size in bytes */
  size: number;
}

export interface VirtualFSStats {
  /** File size in bytes */
  size: number;

  /** Creation timestamp */
  createdAt: Date;

  /** Last modified timestamp */
  modifiedAt: Date;

  /** Data classification */
  classification?: DataClassification;

  /** Is directory */
  isDirectory: boolean;
}

// ============================================
// PRIVACY FILTER TYPES
// ============================================

export interface PrivacyRule {
  /** Pattern to match */
  pattern: RegExp;

  /** Replacement token */
  replacement: string;

  /** Category (email, phone, ssn, api_key, etc.) */
  category: string;

  /** Type (pii or secret) */
  type: 'pii' | 'secret';

  /** Risk score for this pattern */
  riskScore?: number;
}

export interface FilterResult {
  /** Filtered text */
  filtered: string;

  /** Detections found */
  detections: Array<{ type: 'pii' | 'secret'; category: string; count: number }>;

  /** Whether secrets were found (requires blocking) */
  blocked: boolean;

  /** Processing time in ms */
  processingTimeMs: number;
}

// ============================================
// CARS INTEGRATION TYPES
// ============================================

export interface CARSExecutionRequest {
  /** Code to execute */
  code: string;

  /** Execution options */
  options: ExecutionOptions;

  /** Session ID */
  sessionId: string;

  /** Pre-assessed risk (if available) */
  preAssessedRisk?: RiskAssessmentSummary;
}

export interface CARSApprovalRequest {
  /** Request ID */
  requestId: string;

  /** Session ID */
  sessionId: string;

  /** Execution ID */
  executionId: string;

  /** Code snippet (truncated for display) */
  codeSnippet: string;

  /** Risk assessment */
  riskAssessment: RiskAssessmentSummary;

  /** Requesting user */
  userId?: string;

  /** Request timestamp */
  timestamp: string;

  /** Approval timeout in ms */
  timeoutMs: number;
}

export interface CARSApprovalResponse {
  /** Request ID being responded to */
  requestId: string;

  /** Approval decision */
  approved: boolean;

  /** Approving user */
  approver?: string;

  /** Reason for decision */
  reason?: string;

  /** Response timestamp */
  timestamp: string;
}
