/**
 * Approval Workflow Types
 */

import { CARSAssessment, RiskLevel } from '../cars/types';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type ArtifactType = 'code' | 'config' | 'data' | 'document';
export type DecisionType = 'approved' | 'rejected';

export interface ApprovalArtifact {
  type: ArtifactType;
  name: string;
  url?: string;
  preview?: string;
}

export interface ApprovalDecision {
  id: string;
  requestId: string;
  approverId: string;
  approverName?: string;
  decision: DecisionType;
  comments?: string;
  createdAt: Date;
}

export interface ApprovalRequest {
  id: string;
  workflowId?: string;
  status: ApprovalStatus;
  riskLevel: RiskLevel;
  summary: string;
  details: string;
  artifacts: ApprovalArtifact[];
  carsAssessment: CARSAssessment;
  requiredApprovals: number;
  receivedApprovals: number;
  decisions: ApprovalDecision[];
  deadline: Date;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface CreateApprovalRequest {
  carsAssessment: CARSAssessment;
  summary: string;
  details?: string;
  artifacts?: ApprovalArtifact[];
  workflowId?: string;
}

export interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  averageDecisionTime: number; // in milliseconds
}
