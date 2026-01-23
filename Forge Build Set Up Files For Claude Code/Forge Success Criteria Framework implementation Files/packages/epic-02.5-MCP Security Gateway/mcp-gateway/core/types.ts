/**
 * MCP Security Gateway - Core Types
 * 
 * @epic 2.5 - MCP Security Gateway
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Zero Trust MCP Gateway types implementing security controls
 *   from FORGE-MCP-DEEP-DIVE-ANALYSIS.md
 */

// ============================================
// CONFIGURATION
// ============================================

export interface MCPGatewayConfig {
  /** Gateway name */
  name: string;
  
  /** Enable/disable gateway */
  enabled: boolean;
  
  /** Security configuration */
  security: SecurityConfig;
  
  /** Approval gate configuration */
  approval: ApprovalConfig;
  
  /** Sandbox configuration */
  sandbox: SandboxConfig;
  
  /** Privacy configuration */
  privacy: PrivacyConfig;
  
  /** Monitoring configuration */
  monitoring: MonitoringConfig;
  
  /** Tool registry configuration */
  toolRegistry: ToolRegistryConfig;
  
  /** Rate limiting */
  rateLimiting: RateLimitConfig;
  
  /** Tenant isolation */
  tenantIsolation: TenantIsolationConfig;
}

export interface SecurityConfig {
  /** Enable OAuth 2.1 with PKCE */
  oauth: {
    enabled: boolean;
    issuer?: string;
    clientId?: string;
    scopes?: string[];
    pkceRequired: boolean;
  };
  
  /** Input sanitization */
  inputSanitization: {
    enabled: boolean;
    maxInputSize: number;
    allowedContentTypes: string[];
    blockPatterns: string[];
  };
  
  /** Tool description integrity */
  toolIntegrity: {
    enabled: boolean;
    hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
    requireSignature: boolean;
    trustedSigners: string[];
  };
  
  /** Supply chain verification */
  supplyChain: {
    enabled: boolean;
    allowedRegistries: string[];
    requireSBOM: boolean;
    vulnerabilityScan: boolean;
  };
}

export interface ApprovalConfig {
  /** Enable human approval gates */
  enabled: boolean;
  
  /** Default approval mode */
  defaultMode: ApprovalMode;
  
  /** Tools requiring approval */
  requireApproval: string[];
  
  /** Tools auto-approved */
  autoApprove: string[];
  
  /** Approval timeout in ms */
  timeoutMs: number;
  
  /** Approval callback URL */
  callbackUrl?: string;
  
  /** CARS integration */
  carsIntegration: {
    enabled: boolean;
    riskThreshold: number;
  };
}

export type ApprovalMode = 
  | 'always'      // Always require approval
  | 'first-use'   // Approve on first use, remember
  | 'risk-based'  // Use CARS framework
  | 'never';      // Auto-approve (dangerous)

export interface SandboxConfig {
  /** Enable sandbox execution */
  enabled: boolean;
  
  /** Sandbox runtime */
  runtime: 'deno' | 'docker' | 'wasm' | 'none';
  
  /** Resource limits */
  limits: {
    maxCpuMs: number;
    maxMemoryMb: number;
    maxDiskMb: number;
    maxNetworkConnections: number;
    executionTimeoutMs: number;
  };
  
  /** Network policy */
  network: {
    allowEgress: boolean;
    allowedHosts: string[];
    blockedHosts: string[];
  };
  
  /** Filesystem policy */
  filesystem: {
    readOnly: string[];
    writable: string[];
    blocked: string[];
  };
}

export interface PrivacyConfig {
  /** Enable PII tokenization */
  enabled: boolean;
  
  /** PII patterns to detect */
  patterns: PIIPattern[];
  
  /** Tokenization format */
  tokenFormat: string;
  
  /** Token TTL in ms */
  tokenTtlMs: number;
  
  /** Fields to always tokenize */
  alwaysTokenize: string[];
  
  /** Fields to never tokenize */
  neverTokenize: string[];
}

export interface PIIPattern {
  name: string;
  pattern: string;
  replacement: string;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MonitoringConfig {
  /** Enable monitoring */
  enabled: boolean;
  
  /** Audit logging */
  audit: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    includePayloads: boolean;
    retentionDays: number;
  };
  
  /** Anomaly detection */
  anomalyDetection: {
    enabled: boolean;
    baseline: number;
    alertThreshold: number;
  };
  
  /** Tool behavior monitoring */
  toolBehavior: {
    enabled: boolean;
    trackDescriptionChanges: boolean;
    alertOnChange: boolean;
  };
  
  /** Metrics collection */
  metrics: {
    enabled: boolean;
    exportInterval: number;
    exportEndpoint?: string;
  };
}

export interface ToolRegistryConfig {
  /** Enable tool allowlisting */
  allowlistEnabled: boolean;
  
  /** Allowed tools */
  allowedTools: string[];
  
  /** Blocked tools */
  blockedTools: string[];
  
  /** Tool discovery mode */
  discoveryMode: 'static' | 'progressive' | 'dynamic';
  
  /** Registry sources */
  sources: ToolRegistrySource[];
}

export interface ToolRegistrySource {
  name: string;
  type: 'local' | 'npm' | 'url';
  location: string;
  trusted: boolean;
}

export interface RateLimitConfig {
  /** Enable rate limiting */
  enabled: boolean;
  
  /** Requests per window */
  requestsPerWindow: number;
  
  /** Window size in ms */
  windowMs: number;
  
  /** Per-tool limits */
  perToolLimits: Record<string, number>;
  
  /** Per-tenant limits */
  perTenantLimits: Record<string, number>;
}

export interface TenantIsolationConfig {
  /** Enable tenant isolation */
  enabled: boolean;
  
  /** Isolation mode */
  mode: 'namespace' | 'container' | 'process';
  
  /** Tenant ID header */
  tenantIdHeader: string;
  
  /** Cross-tenant access rules */
  crossTenantRules: CrossTenantRule[];
}

export interface CrossTenantRule {
  sourceTenant: string;
  targetTenant: string;
  allowedTools: string[];
  allowedOperations: string[];
}

// ============================================
// TOOL TYPES
// ============================================

export interface MCPTool {
  /** Tool name */
  name: string;
  
  /** Tool description (MUST be integrity-checked) */
  description: string;
  
  /** Tool version */
  version: string;
  
  /** Input schema */
  inputSchema: Record<string, unknown>;
  
  /** Output schema */
  outputSchema?: Record<string, unknown>;
  
  /** Tool metadata */
  metadata: ToolMetadata;
  
  /** Integrity hash */
  integrityHash?: string;
  
  /** Signature */
  signature?: string;
}

export interface ToolMetadata {
  /** Tool author */
  author: string;
  
  /** Tool source */
  source: string;
  
  /** Required permissions */
  permissions: ToolPermission[];
  
  /** Risk level (CARS) */
  riskLevel: RiskLevel;
  
  /** Last verified timestamp */
  lastVerified?: string;
  
  /** Verification status */
  verificationStatus: VerificationStatus;
}

export type ToolPermission = 
  | 'network:read'
  | 'network:write'
  | 'filesystem:read'
  | 'filesystem:write'
  | 'database:read'
  | 'database:write'
  | 'secrets:read'
  | 'llm:invoke'
  | 'external:api';

export type RiskLevel = 
  | 'minimal'    // No side effects
  | 'low'        // Read-only operations
  | 'medium'     // Limited write operations
  | 'high'       // Significant side effects
  | 'critical';  // System-level access

export type VerificationStatus = 
  | 'verified'
  | 'pending'
  | 'failed'
  | 'expired'
  | 'unknown';

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface MCPRequest {
  /** Request ID */
  id: string;
  
  /** Tool name */
  tool: string;
  
  /** Tool parameters */
  params: Record<string, unknown>;
  
  /** Request context */
  context: RequestContext;
  
  /** Request timestamp */
  timestamp: string;
}

export interface RequestContext {
  /** Tenant ID */
  tenantId: string;
  
  /** User ID */
  userId?: string;
  
  /** Session ID */
  sessionId?: string;
  
  /** Source (claude, api, etc) */
  source: string;
  
  /** OAuth token */
  authToken?: string;
  
  /** Request metadata */
  metadata?: Record<string, unknown>;
}

export interface MCPResponse {
  /** Request ID */
  requestId: string;
  
  /** Success status */
  success: boolean;
  
  /** Response data */
  data?: unknown;
  
  /** Error info */
  error?: MCPError;
  
  /** Response metadata */
  metadata: ResponseMetadata;
}

export interface MCPError {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}

export interface ResponseMetadata {
  /** Processing time in ms */
  durationMs: number;
  
  /** Tokens used (if applicable) */
  tokensUsed?: number;
  
  /** Approval info */
  approval?: ApprovalInfo;
  
  /** Sandbox info */
  sandbox?: SandboxInfo;
  
  /** Privacy info */
  privacy?: PrivacyInfo;
}

export interface ApprovalInfo {
  required: boolean;
  status: 'approved' | 'denied' | 'pending' | 'timeout';
  approvedBy?: string;
  approvedAt?: string;
  reason?: string;
}

export interface SandboxInfo {
  used: boolean;
  runtime?: string;
  resourceUsage?: {
    cpuMs: number;
    memoryMb: number;
    networkBytes: number;
  };
}

export interface PrivacyInfo {
  tokenized: boolean;
  fieldsTokenized: string[];
  piiDetected: string[];
}

// ============================================
// AUDIT TYPES
// ============================================

export interface AuditEntry {
  /** Entry ID */
  id: string;
  
  /** Timestamp */
  timestamp: string;
  
  /** Event type */
  eventType: AuditEventType;
  
  /** Tool name */
  tool: string;
  
  /** Tenant ID */
  tenantId: string;
  
  /** User ID */
  userId?: string;
  
  /** Request ID */
  requestId: string;
  
  /** Event details */
  details: Record<string, unknown>;
  
  /** Risk level */
  riskLevel: RiskLevel;
  
  /** Outcome */
  outcome: 'success' | 'failure' | 'blocked' | 'pending';
}

export type AuditEventType = 
  | 'tool:invoked'
  | 'tool:completed'
  | 'tool:failed'
  | 'tool:blocked'
  | 'approval:requested'
  | 'approval:granted'
  | 'approval:denied'
  | 'approval:timeout'
  | 'security:violation'
  | 'security:warning'
  | 'privacy:tokenized'
  | 'privacy:detokenized'
  | 'rate:limited'
  | 'sandbox:executed'
  | 'sandbox:timeout'
  | 'tool:description_changed'
  | 'tool:registered'
  | 'tool:removed';

// ============================================
// CARS INTEGRATION
// ============================================

export interface CARSAssessment {
  /** Tool being assessed */
  tool: string;
  
  /** Risk level */
  riskLevel: RiskLevel;
  
  /** Autonomy level */
  autonomyLevel: AutonomyLevel;
  
  /** Required safeguards */
  safeguards: Safeguard[];
  
  /** Assessment score (0-1) */
  score: number;
  
  /** Recommendation */
  recommendation: 'proceed' | 'approve' | 'escalate' | 'block';
}

export type AutonomyLevel = 
  | 'full'        // No human oversight needed
  | 'supervised'  // Human notified
  | 'assisted'    // Human approves
  | 'manual';     // Human executes

export interface Safeguard {
  type: string;
  description: string;
  required: boolean;
  implemented: boolean;
}

// ============================================
// EXPORTS
// ============================================

export default MCPGatewayConfig;
