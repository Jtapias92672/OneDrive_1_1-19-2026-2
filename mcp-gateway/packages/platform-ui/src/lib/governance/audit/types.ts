/**
 * Audit Trail Types
 */

import { RiskLevel } from '../cars/types';

export type AuditEventType =
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.cancelled'
  | 'stage.started'
  | 'stage.completed'
  | 'stage.failed'
  | 'policy.evaluated'
  | 'cars.assessed'
  | 'approval.requested'
  | 'approval.decided'
  | 'approval.expired'
  | 'token.budget.warning'
  | 'token.budget.exceeded'
  | 'error.occurred';

export type ActorType = 'user' | 'agent' | 'system';

export interface AuditActor {
  type: ActorType;
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
  workflowId?: string;
  previousHash: string;
  eventHash: string;
  createdAt: Date;
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  actorId?: string;
  actorType?: ActorType;
  eventType?: AuditEventType;
  workflowId?: string;
  riskLevel?: RiskLevel;
  limit?: number;
  offset?: number;
}

export interface AuditExport {
  format: 'csv' | 'json';
  events: AuditEvent[];
  exportedAt: Date;
  query: AuditQuery;
  integrityVerified: boolean;
}

export interface HashChainVerification {
  valid: boolean;
  brokenAt?: number;
  message: string;
}

export interface AuditStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByRiskLevel: Record<string, number>;
  recentEvents: number; // last 24 hours
}

export interface LogOptions {
  resource?: AuditResource;
  details?: Record<string, unknown>;
  riskLevel?: RiskLevel;
  workflowId?: string;
}
