/**
 * FORGE Platform UI - Run Types
 * @epic 10b - Execution Monitor
 */

export type RunStatus = 
  | 'pending' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'killed' 
  | 'timeout';

export type ToolCallStatus = 'pending' | 'running' | 'success' | 'error';

export interface Run {
  id: string;
  workId?: string;
  contractId: string;
  contractName: string;
  contractVersion: string;
  status: RunStatus;
  
  // Ownership
  owner: string;
  repo?: string;
  environment: 'dev' | 'staging' | 'prod';
  policyProfile: string;
  
  // Progress
  currentIteration: number;
  maxIterations: number;
  currentScore: number;
  targetScore: number;
  
  // Cost tracking
  tokensUsed: number;
  estimatedCost: number;
  
  // Timing
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  duration?: number;
  
  // Results
  outcome?: 'success' | 'failure' | 'partial';
  confidence?: number;
  errorMessage?: string;
  errorType?: 'policy_violation' | 'tool_failure' | 'test_failure' | 'model_error' | 'timeout';
}

export interface Iteration {
  id: string;
  runId: string;
  number: number;
  status: 'running' | 'completed' | 'failed';
  
  // Scores
  score: number;
  scoreBreakdown: {
    validatorId: string;
    validatorType: string;
    score: number;
    weight: number;
    weightedScore: number;
    feedback?: string;
  }[];
  
  // Content
  input?: any;
  output?: any;
  feedback?: string;
  
  // Tool usage
  toolCalls: ToolCall[];
  
  // Metrics
  tokensUsed: number;
  latencyMs: number;
  startedAt: string;
  completedAt?: string;
}

export interface ToolCall {
  id: string;
  iterationId: string;
  name: string;
  status: ToolCallStatus;
  
  // Invocation
  input: any;
  output?: any;
  error?: string;
  
  // Timing
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  
  // Policy
  policyAllowed: boolean;
  policyRule?: string;
  redacted?: boolean;
}

export interface Checkpoint {
  id: string;
  runId: string;
  iterationNumber: number;
  timestamp: string;
  
  // State
  state: any;
  score: number;
  
  // Fork info
  canFork: boolean;
  forkCount: number;
}

export interface RunEvent {
  id: string;
  runId: string;
  type: 
    | 'run_started'
    | 'iteration_started'
    | 'iteration_completed'
    | 'tool_call_started'
    | 'tool_call_completed'
    | 'score_updated'
    | 'checkpoint_created'
    | 'run_paused'
    | 'run_resumed'
    | 'run_completed'
    | 'run_failed'
    | 'run_killed'
    | 'policy_violation';
  timestamp: string;
  data: any;
}

export interface RunFilters {
  status?: RunStatus[];
  environment?: string[];
  repo?: string[];
  owner?: string[];
  policyProfile?: string[];
  contractId?: string;
  workId?: string;
  dateFrom?: string;
  dateTo?: string;
  costMin?: number;
  costMax?: number;
}

export interface RunSummary {
  goal: string;
  outcome: string;
  confidence: number;
  keyFindings: string[];
  nextSteps?: string[];
  versions: {
    contract: string;
    policy: string;
    agent: string;
  };
}
