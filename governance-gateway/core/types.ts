/**
 * FORGE Governance Gateway - Core Types
 * 
 * @epic 13 - Governance Gateway (Agentic SDLC)
 * @task 1.1 - Type Definitions
 * @owner joe@arcfoundry.ai
 * @created 2026-01-20
 * 
 * @description
 *   Type definitions for multi-agent orchestration, policy enforcement,
 *   audit logging, and human review gates.
 */

// ============================================
// AGENT TYPES
// ============================================

export type AgentRole = 
  | 'lead'
  | 'figma-parser'
  | 'react-generator'
  | 'test-generator'
  | 'validator'
  | 'mendix-sdk'
  | 'evidence-generator';

export type AgentStatus = 
  | 'idle'
  | 'busy'
  | 'waiting'
  | 'error'
  | 'offline';

export interface AgentDefinition {
  id: string;
  role: AgentRole;
  name: string;
  description: string;
  capabilities: string[];
  maxConcurrency: number;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
}

export interface AgentState {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  currentTask?: string;
  taskQueue: string[];
  completedTasks: number;
  failedTasks: number;
  lastActivity: Date;
  metrics: AgentMetrics;
}

export interface AgentMetrics {
  totalTasks: number;
  successRate: number;
  avgDurationMs: number;
  tokensUsed: number;
  errorCount: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

// ============================================
// TASK TYPES
// ============================================

export type TaskStatus = 
  | 'pending'
  | 'assigned'
  | 'running'
  | 'waiting-approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'escalated';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedAgent?: string;
  input: any;
  output?: any;
  error?: TaskError;
  parentTask?: string;
  childTasks: string[];
  dependencies: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  timeoutMs: number;
  metadata: Record<string, any>;
}

export type TaskType =
  | 'parse-figma'
  | 'extract-tokens'
  | 'generate-react'
  | 'generate-tests'
  | 'validate-output'
  | 'run-convergence'
  | 'generate-mendix'
  | 'create-evidence'
  | 'human-review'
  | 'composite';

export interface TaskError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: Date;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: any;
  error?: TaskError;
  durationMs: number;
  tokensUsed: number;
  attempts: number;
}

// ============================================
// WORKFLOW TYPES
// ============================================

export type WorkflowStatus =
  | 'created'
  | 'running'
  | 'paused'
  | 'waiting-approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Workflow {
  id: string;
  name: string;
  type: WorkflowType;
  status: WorkflowStatus;
  stages: WorkflowStage[];
  currentStage: number;
  input: any;
  output?: any;
  context: WorkflowContext;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: TaskError;
}

export type WorkflowType =
  | 'figma-to-react'
  | 'figma-to-mendix'
  | 'contract-generation'
  | 'validation-only'
  | 'repair-loop'
  | 'custom';

export interface WorkflowStage {
  id: string;
  name: string;
  taskType: TaskType;
  status: TaskStatus;
  agentRole: AgentRole;
  requiresApproval: boolean;
  input?: any;
  output?: any;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowContext {
  workflowId: string;
  sessionId: string;
  contractId?: string;
  figmaFileKey?: string;
  userId?: string;
  orgId?: string;
  environment: 'development' | 'staging' | 'production';
  tags: string[];
  variables: Record<string, any>;
}

// ============================================
// POLICY TYPES
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  scope: PolicyScope;
}

export interface PolicyCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'matches';
  value: any;
}

export interface PolicyAction {
  type: 'allow' | 'deny' | 'require-approval' | 'log' | 'alert' | 'throttle';
  params?: Record<string, any>;
}

export interface PolicyScope {
  workflows?: WorkflowType[];
  taskTypes?: TaskType[];
  agentRoles?: AgentRole[];
  environments?: string[];
}

export interface PolicyEvaluation {
  policyId: string;
  policyName: string;
  matched: boolean;
  action: PolicyAction;
  reason?: string;
  timestamp: Date;
}

export interface CARSAssessment {
  riskLevel: RiskLevel;
  autonomyLevel: 'full' | 'supervised' | 'approval-required' | 'manual-only';
  safeguards: string[];
  approvers?: string[];
  justification: string;
}

// ============================================
// AUDIT TYPES
// ============================================

export type AuditEventType =
  | 'workflow-started'
  | 'workflow-completed'
  | 'workflow-failed'
  | 'task-assigned'
  | 'task-started'
  | 'task-completed'
  | 'task-failed'
  | 'task-retried'
  | 'approval-requested'
  | 'approval-granted'
  | 'approval-denied'
  | 'policy-evaluated'
  | 'escalation-triggered'
  | 'agent-state-changed'
  | 'error-occurred';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: Date;
  workflowId?: string;
  taskId?: string;
  agentId?: string;
  actor: AuditActor;
  action: string;
  target?: string;
  details: Record<string, any>;
  inputHash?: string;
  outputHash?: string;
  previousEventId?: string;
  eventHash: string;
}

export interface AuditActor {
  type: 'system' | 'agent' | 'human';
  id: string;
  name: string;
  role?: string;
}

export interface AuditTrail {
  workflowId: string;
  events: AuditEvent[];
  startTime: Date;
  endTime?: Date;
  eventCount: number;
  integrity: AuditIntegrity;
}

export interface AuditIntegrity {
  verified: boolean;
  hashChainValid: boolean;
  lastVerified: Date;
  errors?: string[];
}

// ============================================
// APPROVAL TYPES
// ============================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'escalated';

export interface ApprovalRequest {
  id: string;
  taskId: string;
  workflowId: string;
  type: 'task-output' | 'workflow-stage' | 'policy-override' | 'escalation';
  status: ApprovalStatus;
  riskLevel: RiskLevel;
  requiredApprovers: string[];
  currentApprovers: ApprovalDecision[];
  requiredCount: number;
  deadline?: Date;
  context: ApprovalContext;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ApprovalDecision {
  approverId: string;
  approverName: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  timestamp: Date;
}

export interface ApprovalContext {
  summary: string;
  details: Record<string, any>;
  artifacts?: ApprovalArtifact[];
  previousAttempts?: number;
}

export interface ApprovalArtifact {
  name: string;
  type: string;
  url?: string;
  content?: string;
  hash: string;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface GovernanceConfig {
  /** Enable governance gateway */
  enabled: boolean;
  
  /** Default policies */
  policies: Policy[];
  
  /** Approval settings */
  approvals: ApprovalConfig;
  
  /** Audit settings */
  audit: AuditConfig;
  
  /** Agent pool configuration */
  agents: AgentPoolConfig;
  
  /** Circuit breaker settings */
  circuitBreaker: CircuitBreakerConfig;
  
  /** Token budget limits */
  budgets: BudgetConfig;
}

export interface ApprovalConfig {
  /** Default timeout for approvals */
  defaultTimeoutMs: number;
  
  /** Auto-escalate after timeout */
  autoEscalate: boolean;
  
  /** Escalation chain */
  escalationChain: string[];
  
  /** Bypass approvals for low-risk items */
  bypassLowRisk: boolean;
}

export interface AuditConfig {
  /** Enable audit logging */
  enabled: boolean;
  
  /** Hash algorithm */
  hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  
  /** Retention period in days */
  retentionDays: number;
  
  /** Export formats */
  exportFormats: ('json' | 'csv' | 'xml')[];
}

export interface AgentPoolConfig {
  /** Maximum concurrent agents */
  maxConcurrency: number;
  
  /** Default timeout per task */
  defaultTimeoutMs: number;
  
  /** Default retry policy */
  defaultRetryPolicy: RetryPolicy;
}

export interface CircuitBreakerConfig {
  /** Error threshold to trip circuit */
  errorThreshold: number;
  
  /** Time window for errors */
  windowMs: number;
  
  /** Cooldown period after trip */
  cooldownMs: number;
  
  /** Half-open test requests */
  halfOpenRequests: number;
}

export interface BudgetConfig {
  /** Max tokens per task */
  maxTokensPerTask: number;
  
  /** Max tokens per workflow */
  maxTokensPerWorkflow: number;
  
  /** Max cost per day (USD) */
  maxDailyCost: number;
  
  /** Alert threshold (percentage) */
  alertThreshold: number;
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 30000,
};

export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  enabled: true,
  policies: [],
  approvals: {
    defaultTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
    autoEscalate: true,
    escalationChain: [],
    bypassLowRisk: true,
  },
  audit: {
    enabled: true,
    hashAlgorithm: 'sha256',
    retentionDays: 90,
    exportFormats: ['json', 'csv'],
  },
  agents: {
    maxConcurrency: 10,
    defaultTimeoutMs: 300000, // 5 minutes
    defaultRetryPolicy: DEFAULT_RETRY_POLICY,
  },
  circuitBreaker: {
    errorThreshold: 5,
    windowMs: 60000,
    cooldownMs: 30000,
    halfOpenRequests: 3,
  },
  budgets: {
    maxTokensPerTask: 50000,
    maxTokensPerWorkflow: 500000,
    maxDailyCost: 100,
    alertThreshold: 0.8,
  },
};

// ============================================
// EXPORTS
// ============================================

export default GovernanceConfig;
