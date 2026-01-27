/**
 * CARS Framework Types
 * Context - Action - Risk - Safeguards
 */

export type Environment = 'development' | 'staging' | 'production';
export type DataClassification = 1 | 2 | 3 | 4; // 1=public, 4=restricted
export type Scope = 'single-file' | 'multiple-files' | 'system-wide';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ImpactLevel = 'low' | 'medium' | 'high';

export interface CARSContext {
  environment: Environment;
  dataClassification: DataClassification;
  scope: Scope;
  userId: string;
  workflowType: string;
}

export interface CARSAction {
  type: string; // 'code-generation', 'deployment', 'data-access'
  target: string; // What's being modified
  reversible: boolean;
  estimatedImpact: ImpactLevel;
}

export interface RiskFactor {
  name: string;
  weight: number; // 0-1
  value: number; // 0-100
  reason: string;
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
  additionalChecks: string[];
}

export interface CARSAssessment {
  id: string;
  context: CARSContext;
  action: CARSAction;
  risk: CARSRisk;
  safeguards: CARSSafeguards;
  assessedAt: Date;
}

export interface UserFailureHistory {
  userId: string;
  recentFailures: number; // failures in last 30 days
  totalOperations: number;
}
