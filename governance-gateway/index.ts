/**
 * FORGE Governance Gateway Package
 * 
 * @epic 13 - Governance Gateway (Agentic SDLC)
 * @owner joe@arcfoundry.ai
 * @created 2026-01-20
 * 
 * @description
 *   Multi-agent orchestration with policy enforcement, audit logging,
 *   and human review gates. Integrates all FORGE packages into a
 *   cohesive pipeline.
 * 
 * @features
 *   - Lead Agent orchestration
 *   - Worker Agent specialization
 *   - CARS risk assessment
 *   - Policy-based access control
 *   - Blockchain-style audit trails
 *   - Human approval gates
 *   - Circuit breaker protection
 *   - Token budget enforcement
 */

// ============================================
// CORE EXPORTS
// ============================================

export {
  // Types
  AgentRole,
  AgentStatus,
  AgentDefinition,
  AgentState,
  AgentMetrics,
  RetryPolicy,
  Task,
  TaskType,
  TaskStatus,
  TaskPriority,
  TaskError,
  TaskResult,
  Workflow,
  WorkflowType,
  WorkflowStatus,
  WorkflowStage,
  WorkflowContext,
  Policy,
  PolicyCondition,
  PolicyAction,
  PolicyScope,
  PolicyEvaluation,
  CARSAssessment,
  RiskLevel,
  AuditEvent,
  AuditEventType,
  AuditTrail,
  AuditActor,
  AuditIntegrity,
  ApprovalRequest,
  ApprovalStatus,
  ApprovalDecision,
  ApprovalContext,
  ApprovalArtifact,
  GovernanceConfig,
  ApprovalConfig,
  AuditConfig,
  AgentPoolConfig,
  CircuitBreakerConfig,
  BudgetConfig,
  DEFAULT_RETRY_POLICY,
  DEFAULT_GOVERNANCE_CONFIG,
} from './core/types';

export { LeadAgent } from './core/lead-agent';

// ============================================
// AGENT EXPORTS
// ============================================

export {
  WorkerAgent,
  FigmaParserAgent,
  ReactGeneratorAgent,
  ValidatorAgent,
  MendixSDKAgent,
  EvidenceGeneratorAgent,
  TestGeneratorAgent,
} from './agents/worker-agent';

// ============================================
// POLICY EXPORTS
// ============================================

export { PolicyEngine, DEFAULT_POLICIES } from './policy/policy-engine';

// ============================================
// AUDIT EXPORTS
// ============================================

export { AuditLogger } from './audit/audit-logger';

// ============================================
// GATES EXPORTS
// ============================================

export { ApprovalGate } from './gates/approval-gate';

// ============================================
// WORKFLOW EXPORTS
// ============================================

export {
  IntegrationPipeline,
  createPipeline,
  PackageRegistry,
  PipelineResult,
  PipelineOutput,
  StageResult,
  FigmaToReactOptions,
  FigmaToMendixOptions,
  GenerationOptions,
  ValidationOptions,
} from './workflows/integration-pipeline';

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

import { IntegrationPipeline, PackageRegistry } from './workflows/integration-pipeline';
import { GovernanceConfig } from './core/types';

let defaultPipeline: IntegrationPipeline | null = null;

/**
 * Get or create the default pipeline
 */
export function getDefaultPipeline(): IntegrationPipeline {
  if (!defaultPipeline) {
    defaultPipeline = new IntegrationPipeline();
  }
  return defaultPipeline;
}

/**
 * Create a new pipeline with configuration
 */
export function createGovernancePipeline(
  config?: Partial<GovernanceConfig>,
  packages?: PackageRegistry
): IntegrationPipeline {
  const pipeline = new IntegrationPipeline(config);
  if (packages) {
    pipeline.wirePackages(packages);
  }
  return pipeline;
}

/**
 * Quick Figma to React conversion
 */
export async function figmaToReact(
  figmaFileKey: string,
  options?: { accessToken?: string; outputFormat?: string }
) {
  return getDefaultPipeline().figmaToReact(figmaFileKey, options);
}

/**
 * Quick Figma to Mendix conversion
 */
export async function figmaToMendix(
  figmaFileKey: string,
  options?: { accessToken?: string; moduleName?: string }
) {
  return getDefaultPipeline().figmaToMendix(figmaFileKey, options);
}

/**
 * Quick validation
 */
export async function validate(output: any, contract?: any) {
  return getDefaultPipeline().validate(output, contract);
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

/**
 * Development configuration - relaxed policies
 */
export const DEVELOPMENT_CONFIG: Partial<GovernanceConfig> = {
  enabled: true,
  policies: [],
  approvals: {
    defaultTimeoutMs: 60000, // 1 minute
    autoEscalate: false,
    escalationChain: [],
    bypassLowRisk: true,
  },
  circuitBreaker: {
    errorThreshold: 10,
    windowMs: 60000,
    cooldownMs: 5000,
    halfOpenRequests: 5,
  },
};

/**
 * Production configuration - strict policies
 */
export const PRODUCTION_CONFIG: Partial<GovernanceConfig> = {
  enabled: true,
  approvals: {
    defaultTimeoutMs: 86400000, // 24 hours
    autoEscalate: true,
    escalationChain: ['team-lead', 'security-reviewer', 'executive'],
    bypassLowRisk: false,
  },
  audit: {
    enabled: true,
    hashAlgorithm: 'sha512',
    retentionDays: 365,
    exportFormats: ['json', 'csv', 'xml'],
  },
  circuitBreaker: {
    errorThreshold: 3,
    windowMs: 60000,
    cooldownMs: 60000,
    halfOpenRequests: 1,
  },
  budgets: {
    maxTokensPerTask: 25000,
    maxTokensPerWorkflow: 250000,
    maxDailyCost: 50,
    alertThreshold: 0.7,
  },
};

/**
 * Compliance configuration - maximum audit
 */
export const COMPLIANCE_CONFIG: Partial<GovernanceConfig> = {
  enabled: true,
  approvals: {
    defaultTimeoutMs: 86400000,
    autoEscalate: true,
    escalationChain: ['compliance-officer', 'legal', 'ciso'],
    bypassLowRisk: false,
  },
  audit: {
    enabled: true,
    hashAlgorithm: 'sha512',
    retentionDays: 2555, // 7 years
    exportFormats: ['json', 'csv', 'xml'],
  },
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default IntegrationPipeline;
