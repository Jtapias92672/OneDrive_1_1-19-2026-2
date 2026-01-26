/**
 * MCP Security Gateway
 * 
 * @epic 2.5 - MCP Security Gateway
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Zero Trust MCP Gateway implementing enterprise-grade security controls
 *   for Model Context Protocol tool execution.
 * 
 *   Key Features:
 *   - OAuth 2.1 + PKCE authentication
 *   - Input sanitization & validation
 *   - Tool integrity verification (Rug Pull protection)
 *   - Human-in-the-loop approval gates
 *   - CARS risk-based access control
 *   - Sandbox execution (Deno/Docker/WASM)
 *   - PII tokenization layer
 *   - Comprehensive audit logging
 *   - Tool behavior monitoring
 * 
 *   Architecture based on:
 *   - FORGE-MCP-DEEP-DIVE-ANALYSIS.md
 *   - FORGE-MCP-ARCHITECTURE-ADDENDUM.md
 */

// ============================================
// CORE
// ============================================

export { MCPGateway, ToolHandler } from './core/gateway.js';

export type {
  MCPGatewayConfig,
  SecurityConfig,
  ApprovalConfig,
  SandboxConfig,
  PrivacyConfig,
  MonitoringConfig,
  ToolRegistryConfig,
  RateLimitConfig,
  TenantIsolationConfig,
  MCPTool,
  ToolMetadata,
  ToolPermission,
  RiskLevel,
  VerificationStatus,
  MCPRequest,
  MCPResponse,
  MCPError,
  RequestContext,
  ResponseMetadata,
  ApprovalInfo,
  SandboxInfo,
  PrivacyInfo,
  AuditEntry,
  AuditEventType,
  CARSAssessment,
  AutonomyLevel,
  Safeguard,
  PIIPattern,
  CrossTenantRule,
  ApprovalMode,
} from './core/types.js';

// ============================================
// SECURITY
// ============================================

export { 
  SecurityLayer,
  AuthResult,
  PKCEChallenge,
  SanitizeResult,
  SupplyChainResult,
} from './security/index.js';

// ============================================
// APPROVAL
// ============================================

export {
  ApprovalGate,
  ApprovalRequest,
  PendingApproval,
  ApprovalRecord,
  ApprovalPolicy,
} from './approval/index.js';

export {
  ApprovalApi,
  createApprovalMiddleware,
  createApprovalServer,
  type ApiResponse,
  type CreateApprovalBody,
  type SubmitApprovalBody,
  type ApprovalStatusResponse,
} from './approval/api.js';

// ============================================
// CARS (Risk Assessment) - Epic 3.5
// ============================================

export {
  // Risk Levels
  CARSRiskLevel,
  type RiskLevelString,
  VALID_RISK_LEVELS,
  isValidRiskLevel,
  riskLevelToString,
  stringToRiskLevel,
  escalateRiskLevel,
  requiresApproval as carsRequiresApproval,
  shouldBlock,
  getRiskLevelDescription,
  getAutonomyLevel,

  // Risk Matrix
  TOOL_RISK_MATRIX,
  getToolRisk,
  isKnownTool,
  getToolsAtRiskLevel,
  registerToolRisk,

  // Context
  type CARSContext,
  VALID_USER_ROLES,
  VALID_ENVIRONMENTS,
  createCARSContext,
  validateCARSContext,
  calculateContextRiskModifier,

  // Risk Assessment Engine
  CARSEngine,
  type ToolCallRequest as CARSToolCallRequest,
  type RiskAssessment,
  type CARSEngineConfig,
  getDefaultCARSEngine,
  createCARSEngine,
  assessRisk,

  // Deceptive Compliance Detector (Anthropic Dec 2024)
  DeceptiveComplianceDetector,
  type DeceptiveComplianceContext,
  type DeceptiveComplianceIndicator,
  type DeceptiveComplianceAssessment,
  type DeceptiveComplianceAction,

  // Reward Hacking Detector (Anthropic Nov 2025)
  RewardHackingDetector,
  type RewardHackingContext,
  type RewardHackingPattern,
  type RewardHackingAssessment,
  type RewardHackingAction,
} from './cars/index.js';

// ============================================
// SANDBOX
// ============================================

export { 
  SandboxExecutor,
  ExecutionRequest,
  ExecutionResult,
  ExecutionContext,
  ResourceUsage,
} from './sandbox/index.js';

// ============================================
// PRIVACY
// ============================================

export { 
  PrivacyTokenizer,
  TokenizeResult,
  PIIDetectionResult,
  PIIDetection,
  TokenStats,
} from './privacy/index.js';

// ============================================
// MONITORING
// ============================================

export { 
  AuditLogger,
  BehaviorMonitor,
  AuditQueryFilter,
  AuditStats,
  ToolBaseline,
  IntegrityCheckResult,
  AnomalyDetection,
  BehaviorAlert,
} from './monitoring/index.js';

// ============================================
// OAUTH 2.1 + PKCE - Epic 3.6
// ============================================

export {
  // PKCE
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  verifyCodeChallenge,
  RFC7636_TEST_VECTORS,
  type PKCEChallenge as PKCEPair,
  type PKCEOptions,

  // OAuth Client
  OAuthClient,
  type OAuthClientConfig,
  type AuthorizationUrlResult,
  type TokenResponse,

  // Token Manager
  TokenManager,
  type TokenManagerConfig,
  type TokenSet,
  type RefreshResult,
} from './oauth/index.js';

// ============================================
// TENANT ISOLATION - Epic 3.6
// ============================================

export {
  // Context Extractor
  TenantContextExtractor,
  type TenantExtractionOptions,
  type TenantContext,
  type TenantRequest,

  // Isolation Engine
  TenantIsolationEngine,
  CrossTenantViolationError,
  type TenantIsolationConfig as TenantIsolationEngineConfig,
  type TenantToolRequest,
  type IsolationResult,
  type TenantAccess,

  // Leak Detector
  CrossTenantLeakDetector,
  type LeakDetectorConfig,
  type LeakScanResult,
  type LeakDetection,
} from './tenant/index.js';

// ============================================
// INPUT SANITIZATION - Epic 3.6
// ============================================

export {
  // Patterns
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

  // Sanitizer
  InputSanitizer,
  InjectionDetectedError,
  type SanitizationContext,
  type SanitizationResult,
  type ThreatDetection,
  type SanitizerConfig,

  // Policies
  PolicyEngine,
  TOOL_POLICIES,
  type ParameterPolicy,
  type ToolSanitizationPolicy,
  type PolicyEvaluationResult,
  type PolicyViolation,
} from './sanitization/index.js';

// ============================================
// SECURITY ALERTING - Epic 3.6
// ============================================

export {
  // Types
  AlertSeverity,
  AlertType,
  SEVERITY_ORDER,
  compareSeverity,
  meetsMinimumSeverity,
  parseSeverity,
  parseAlertType,
  getSeverityColor,
  getSeverityEmoji,
  type SecurityAlert,
  type AlertEvidence,
  type AlertRoutingRule,
  type AlertChannel,
  type AlertChannelConfig,
  type AlertStats,
  type AlertTrend,

  // Deduplicator
  AlertDeduplicator,
  type DeduplicatorConfig,
  type DeduplicationResult,
  type DeduplicatorStats,

  // Alert Manager
  AlertManager,
  type AlertManagerConfig,
  type AlertInput,
  type SecurityEvent,
} from './alerting/index.js';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { MCPGateway } from './core/gateway.js';
import { MCPGatewayConfig, MCPRequest, MCPResponse, MCPTool } from './core/types.js';

let defaultGateway: MCPGateway | null = null;

/**
 * Create a new MCP Gateway
 */
export function createGateway(config?: Partial<MCPGatewayConfig>): MCPGateway {
  return new MCPGateway(config);
}

/**
 * Get or create the default gateway
 */
export function getDefaultGateway(): MCPGateway {
  if (!defaultGateway) {
    defaultGateway = new MCPGateway();
  }
  return defaultGateway;
}

/**
 * Set the default gateway
 */
export function setDefaultGateway(gateway: MCPGateway): void {
  defaultGateway = gateway;
}

/**
 * Quick request through default gateway
 */
export async function processRequest(request: MCPRequest): Promise<MCPResponse> {
  return getDefaultGateway().processRequest(request);
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default MCPGateway;
