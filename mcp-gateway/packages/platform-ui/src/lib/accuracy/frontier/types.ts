/**
 * Frontier Zone Types
 * Epic 14: Task types and AI capability boundaries
 */

export type TaskType =
  | 'code-generation'
  | 'code-review'
  | 'bug-fix'
  | 'refactoring'
  | 'documentation'
  | 'testing'
  | 'architecture'
  | 'data-analysis'
  | 'ui-design'
  | 'api-design'
  | 'security-review'
  | 'performance-optimization';

export type ZoneStatus = 'green' | 'yellow' | 'red';

export interface FrontierZone {
  taskType: TaskType;
  successRate: number;
  totalAttempts: number;
  successfulAttempts: number;
  averageConfidence: number;
  lastUpdated: Date;
  status: ZoneStatus;
  recommendedWorkflow: 'autonomous' | 'supervised' | 'human-required';
  riskFactors: string[];
}

export interface FrontierOutcome {
  taskType: TaskType;
  success: boolean;
  confidence: number;
  duration: number;
  factors: OutcomeFactor[];
  timestamp: Date;
}

export interface OutcomeFactor {
  name: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface FrontierStats {
  totalZones: number;
  greenZones: number;
  yellowZones: number;
  redZones: number;
  overallSuccessRate: number;
  mostReliable: TaskType[];
  leastReliable: TaskType[];
}
