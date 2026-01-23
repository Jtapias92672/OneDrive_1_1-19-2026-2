/**
 * FORGE Platform UI - Governance Types
 * @epic 10d - Governance Console
 */

export type PolicyStatus = 'draft' | 'review' | 'active' | 'deprecated' | 'archived';
export type RiskTier = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  status: PolicyStatus;
  
  // Scope
  scope: {
    environments: ('dev' | 'staging' | 'prod')[];
    repos?: string[];
    contracts?: string[];
    teams?: string[];
  };
  
  // Risk
  riskTier: RiskTier;
  
  // Rules
  rules: PolicyRule[];
  
  // Approvals
  requiresApproval: boolean;
  approvers?: string[];
  minApprovers?: number;
  
  // Redaction
  redactionRules: RedactionRule[];
  
  // Metadata
  owner: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  deprecatedAt?: string;
  
  // Audit
  changeLog: PolicyChange[];
}

export interface PolicyRule {
  id: string;
  type: 'allow' | 'deny' | 'require_approval';
  category: 'tool' | 'repo' | 'path' | 'environment' | 'cost' | 'time' | 'custom';
  
  // Matching
  pattern: string;
  patternType: 'exact' | 'glob' | 'regex';
  
  // Conditions
  conditions?: {
    maxCost?: number;
    maxIterations?: number;
    maxDuration?: number;
    timeWindow?: { start: string; end: string };
    requireMfa?: boolean;
  };
  
  // Action
  action: string;
  message?: string;
  
  // Priority (lower = higher priority)
  priority: number;
  enabled: boolean;
}

export interface RedactionRule {
  id: string;
  name: string;
  type: 'pii' | 'secrets' | 'financial' | 'health' | 'custom';
  
  // Matching
  patterns: string[];
  fields?: string[];
  
  // Action
  replacement: 'mask' | 'hash' | 'remove';
  maskChar?: string;
  
  enabled: boolean;
}

export interface PolicyChange {
  id: string;
  policyId: string;
  version: string;
  action: 'created' | 'updated' | 'activated' | 'deprecated' | 'archived';
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface ApprovalRequest {
  id: string;
  type: 'run' | 'policy_change' | 'exception' | 'deployment';
  status: ApprovalStatus;
  
  // Request details
  requestedBy: string;
  requestedAt: string;
  
  // Context
  runId?: string;
  policyId?: string;
  exceptionId?: string;
  
  // Risk
  riskTier: RiskTier;
  riskFactors: string[];
  
  // Approval chain
  requiredApprovers: string[];
  minApprovals: number;
  approvals: Approval[];
  
  // Timing
  expiresAt: string;
  resolvedAt?: string;
  
  // Details
  title: string;
  description: string;
  diff?: any;
  
  // SLA
  slaDeadline?: string;
  slaBreached?: boolean;
}

export interface Approval {
  id: string;
  requestId: string;
  approver: string;
  decision: 'approved' | 'rejected';
  comment?: string;
  decidedAt: string;
}

export interface PolicyException {
  id: string;
  policyId: string;
  policyName: string;
  ruleId?: string;
  
  // Scope
  scope: {
    runId?: string;
    contractId?: string;
    repo?: string;
    user?: string;
  };
  
  // Exception details
  reason: string;
  justification: string;
  
  // Timing
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt: string;
  
  // Status
  status: 'pending' | 'active' | 'expired' | 'revoked';
  
  // Audit
  usageCount: number;
  lastUsedAt?: string;
}

export interface KillSwitch {
  id: string;
  scope: 'global' | 'environment' | 'repo' | 'contract' | 'run';
  scopeValue?: string;
  
  // Status
  active: boolean;
  
  // Details
  reason: string;
  activatedBy: string;
  activatedAt: string;
  deactivatedBy?: string;
  deactivatedAt?: string;
  
  // Auto-deactivation
  autoDeactivateAt?: string;
  
  // Impact
  affectedRuns: number;
  killedRuns: string[];
}

export interface PolicySimulation {
  policyId: string;
  input: {
    tool?: string;
    repo?: string;
    path?: string;
    environment?: string;
    cost?: number;
    user?: string;
  };
  result: {
    allowed: boolean;
    matchedRules: {
      ruleId: string;
      ruleName: string;
      action: 'allow' | 'deny' | 'require_approval';
    }[];
    requiresApproval: boolean;
    redactedFields: string[];
  };
}

export interface GovernanceFilters {
  status?: PolicyStatus[];
  riskTier?: RiskTier[];
  environment?: string[];
  owner?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApprovalFilters {
  status?: ApprovalStatus[];
  type?: ApprovalRequest['type'][];
  riskTier?: RiskTier[];
  requestedBy?: string;
  dateFrom?: string;
  dateTo?: string;
}
