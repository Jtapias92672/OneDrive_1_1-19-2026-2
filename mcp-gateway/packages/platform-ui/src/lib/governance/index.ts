// Governance Gateway exports
// Note: Using explicit exports to avoid type conflicts between modules

// Policy types and engine
export * from './policy';

// CARS Assessment (separate namespace to avoid conflicts)
export { carsAssessor, CARSAssessor } from './cars';
export type {
  CARSContext,
  CARSAction,
  CARSRisk,
  CARSAssessment,
  CARSSafeguards,
  RiskFactor,
  UserFailureHistory,
  Environment,
  DataClassification,
  Scope,
  RiskLevel,
  ImpactLevel,
} from './cars';

// Approval workflow
export { approvalService, ApprovalService, approvalStore } from './approval';
export type {
  ApprovalRequest,
  ApprovalDecision,
  ApprovalArtifact,
  ApprovalStats,
  CreateApprovalRequest,
  ApprovalStatus,
  ArtifactType,
  DecisionType,
} from './approval';

// Governance Gateway integration
export { governanceGateway, GovernanceGateway } from './gateway';
export type { GovernanceDecision, GovernanceEvaluationInput } from './gateway';

// Audit Trail
export { auditLogger, AuditLogger, auditStore, hashChain, HashChain } from './audit';
export type {
  AuditEvent,
  AuditEventType,
  AuditActor,
  AuditQuery,
  AuditExport,
  AuditStats,
  HashChainVerification,
} from './audit';

// Workflow Engine
export { workflowEngine, WorkflowEngine, workflowStore } from './workflow';
export { figmaToCodeWorkflow, ticketToPRWorkflow } from './workflow';
export type {
  Workflow,
  WorkflowType,
  WorkflowStatus,
  WorkflowDefinition,
  WorkflowStage,
  StageResult,
  WorkflowContext,
} from './workflow';

// Organization Policy
export { organizationStore } from './organization';
export type {
  OrganizationPolicy,
  PolicyException,
  ComplianceFramework,
  PolicyStatus,
  ExceptionStatus,
  CreateExceptionRequest,
} from './organization';
