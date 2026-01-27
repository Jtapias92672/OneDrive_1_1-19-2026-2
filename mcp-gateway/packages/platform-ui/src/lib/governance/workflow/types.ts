/**
 * Workflow Types
 */

import { CARSAssessment } from '../cars/types';
import { GovernanceGateway } from '../gateway/governance-gateway';
import { AuditLogger } from '../audit/audit-logger';

export type WorkflowType = 'figma-to-code' | 'ticket-to-pr' | 'dependency-upgrade';
export type WorkflowStatus =
  | 'pending'
  | 'awaiting-approval'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface StageResult {
  stage: string;
  status: 'success' | 'failed' | 'skipped';
  output?: Record<string, unknown>;
  tokensUsed: number;
  duration: number; // ms
  error?: string;
}

export interface WorkflowContext {
  workflow: Workflow;
  currentStage: WorkflowStage;
  previousResults: Record<string, StageResult>;
  governanceGateway: GovernanceGateway;
  auditLogger: AuditLogger;
}

export interface WorkflowStage {
  name: string;
  description: string;
  handler: (context: WorkflowContext) => Promise<StageResult>;
  checkpoint: boolean; // If true, evaluate policies before proceeding
}

export interface WorkflowDefinition {
  type: WorkflowType;
  name: string;
  stages: WorkflowStage[];
  defaultTokenBudget: number;
}

export interface Workflow {
  id: string;
  type: WorkflowType;
  status: WorkflowStatus;
  userId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  currentStage: string;
  stageResults: Record<string, StageResult>;
  tokenBudget: number;
  tokensConsumed: number;
  riskAssessment: CARSAssessment;
  approvalRequestId?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface WorkflowInput {
  environment?: 'development' | 'staging' | 'production';
  dataClassification?: 1 | 2 | 3 | 4;
  target?: string;
  [key: string]: unknown;
}
