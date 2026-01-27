// ============================================================================
// GOVERNANCE GATEWAY - TYPE DEFINITIONS
// Epic 13: Governance Gateway
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// POLICY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PolicyOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'matches';

export type PolicyActionType = 'allow' | 'block' | 'require-approval' | 'log' | 'notify';

export interface PolicyCondition {
  field: string;
  operator: PolicyOperator;
  value: unknown;
}

export interface PolicyAction {
  type: PolicyActionType;
  params?: Record<string, unknown>;
}

export interface PolicyScope {
  workflowTypes?: string[];
  userRoles?: string[];
  environments?: string[];
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number; // Higher = evaluated first
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  scope: PolicyScope;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyEvaluation {
  allowed: boolean;
  requiresApproval: boolean;
  matchedPolicies: Policy[];
  actions: PolicyAction[];
  reason?: string;
  evaluatedAt: Date;
}

export interface PolicyContext {
  workflowType?: string;
  userRole?: string;
  environment?: string;
  riskLevel?: RiskLevel;
  dataClassification?: number;
  tokenUsagePercent?: number;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK ASSESSMENT TYPES (CARS Framework)
// ─────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type Environment = 'development' | 'staging' | 'production';

export type DataClassification = 1 | 2 | 3 | 4; // 1=Public, 2=Internal, 3=Confidential, 4=Restricted

export type ChangeScope = 'single-file' | 'multiple-files' | 'system-wide';

export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface CARSContext {
  environment: Environment;
  dataClassification: DataClassification;
  scope: ChangeScope;
}

export interface CARSAction {
  type: string;
  target: string;
  reversible: boolean;
}

export interface CARSRisk {
  level: RiskLevel;
  score: number; // 0-100
  factors: RiskFactor[];
}

export interface CARSSafeguards {
  testsRequired: boolean;
  reviewRequired: boolean;
  approvalRequired: boolean;
  rollbackPlan: boolean;
}

export interface CARSAssessment {
  id: string;
  context: CARSContext;
  action: CARSAction;
  risk: CARSRisk;
  safeguards: CARSSafeguards;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPROVAL TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type DecisionType = 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  workflowId?: string;
  status: ApprovalStatus;
  riskLevel: RiskLevel;
  summary: string;
  artifacts?: Record<string, unknown>;
  requiredApprovals: number;
  receivedApprovals: number;
  deadline?: Date;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ApprovalDecision {
  id: string;
  requestId: string;
  approverId: string;
  decision: DecisionType;
  comments?: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AuditActorType = 'user' | 'agent' | 'system';

export type AuditEventType =
  | 'policy_created'
  | 'policy_updated'
  | 'policy_deleted'
  | 'policy_evaluated'
  | 'workflow_started'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_cancelled'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'
  | 'approval_expired'
  | 'risk_assessed'
  | 'token_budget_exceeded';

export interface AuditActor {
  type: AuditActorType;
  id: string;
  name?: string;
}

export interface AuditResource {
  type: string;
  id: string;
}

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  actor: AuditActor;
  action: string;
  resource?: AuditResource;
  details: Record<string, unknown>;
  riskLevel?: RiskLevel;
  previousHash: string;
  eventHash: string;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowType = 'figma-to-code' | 'ticket-to-pr' | 'dependency-upgrade';

export type WorkflowStatus = 'pending' | 'running' | 'awaiting-approval' | 'completed' | 'failed' | 'cancelled';

export interface Workflow {
  id: string;
  type: WorkflowType;
  status: WorkflowStatus;
  userId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  currentStage?: string;
  tokenBudget?: number;
  tokensConsumed: number;
  riskAssessment?: CARSAssessment;
  createdAt: Date;
  completedAt?: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// API TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  scope?: PolicyScope;
}

export interface UpdatePolicyRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  conditions?: PolicyCondition[];
  actions?: PolicyAction[];
  scope?: PolicyScope;
}

export interface EvaluatePoliciesRequest {
  context: PolicyContext;
}

export interface EvaluatePoliciesResponse {
  evaluation: PolicyEvaluation;
  auditEventId: string;
}
