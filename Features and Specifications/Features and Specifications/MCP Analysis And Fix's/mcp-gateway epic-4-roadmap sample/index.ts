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

export { MCPGateway, ToolHandler } from './core/gateway';

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
} from './core/types';

// ============================================
// SECURITY
// ============================================

export { 
  SecurityLayer,
  AuthResult,
  PKCEChallenge,
  SanitizeResult,
  SupplyChainResult,
} from './security';

// ============================================
// APPROVAL
// ============================================

export { 
  ApprovalGate,
  ApprovalRequest,
  PendingApproval,
  ApprovalRecord,
  ApprovalPolicy,
} from './approval';

// ============================================
// SANDBOX
// ============================================

export { 
  SandboxExecutor,
  ExecutionRequest,
  ExecutionResult,
  ExecutionContext,
  ResourceUsage,
} from './sandbox';

// ============================================
// PRIVACY
// ============================================

export { 
  PrivacyTokenizer,
  TokenizeResult,
  PIIDetectionResult,
  PIIDetection,
  TokenStats,
} from './privacy';

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
} from './monitoring';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { MCPGateway } from './core/gateway';
import { MCPGatewayConfig, MCPRequest, MCPResponse, MCPTool } from './core/types';

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
// CORE INDEX
// ============================================

export { default as MCPGatewayConfig } from './core/types';

// ============================================
// DEFAULT EXPORT
// ============================================

export default MCPGateway;
