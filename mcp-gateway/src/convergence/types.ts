/**
 * FORGE MCP Gateway - Convergence Engine Types
 *
 * @epic Epic 04 - Convergence Engine
 * @description Type definitions for multi-agent convergence and coordination
 */

// ============================================
// ENUMS
// ============================================

export enum ConvergenceState {
  INITIALIZING = 'initializing',
  COORDINATING = 'coordinating',
  EXECUTING = 'executing',
  SYNCHRONIZING = 'synchronizing',
  CONVERGING = 'converging',
  CONVERGED = 'converged',
  DIVERGED = 'diverged',
  FAILED = 'failed',
}

export enum CoordinationPattern {
  /** Single leader coordinates all agents */
  LEADER_FOLLOWER = 'leader-follower',
  /** Agents reach consensus through voting */
  CONSENSUS = 'consensus',
  /** Agents work in sequential pipeline */
  PIPELINE = 'pipeline',
  /** Agents work in parallel, results merged */
  PARALLEL_MERGE = 'parallel-merge',
  /** Agents compete, best result wins */
  COMPETITIVE = 'competitive',
  /** Hierarchical delegation tree */
  HIERARCHICAL = 'hierarchical',
  /** Event-driven reactive coordination */
  REACTIVE = 'reactive',
}

export enum ConflictType {
  /** Multiple agents claim same resource */
  RESOURCE_CONTENTION = 'resource-contention',
  /** Agents produce contradictory outputs */
  OUTPUT_CONFLICT = 'output-conflict',
  /** Agents in incompatible states */
  STATE_MISMATCH = 'state-mismatch',
  /** Agent priority disputes */
  PRIORITY_CONFLICT = 'priority-conflict',
  /** Task assignment overlap */
  TASK_OVERLAP = 'task-overlap',
  /** Deadline conflicts */
  TIMING_CONFLICT = 'timing-conflict',
}

export enum ConflictResolutionStrategy {
  /** Higher priority wins */
  PRIORITY_BASED = 'priority-based',
  /** First to claim wins */
  FIRST_COME = 'first-come',
  /** Most recent wins */
  LAST_WRITE = 'last-write',
  /** Merge conflicting outputs */
  MERGE = 'merge',
  /** External arbiter decides */
  ARBITRATION = 'arbitration',
  /** Roll back to safe state */
  ROLLBACK = 'rollback',
  /** Consensus voting */
  VOTING = 'voting',
}

export enum HandoffReason {
  /** Task requires different capability */
  CAPABILITY_MISMATCH = 'capability-mismatch',
  /** Current agent overloaded */
  LOAD_BALANCING = 'load-balancing',
  /** Task escalation needed */
  ESCALATION = 'escalation',
  /** Agent error/failure */
  FAILURE_RECOVERY = 'failure-recovery',
  /** Sequential pipeline step */
  PIPELINE_STEP = 'pipeline-step',
  /** Explicit delegation */
  DELEGATION = 'delegation',
  /** Timeout exceeded */
  TIMEOUT = 'timeout',
}

export enum SyncStrategy {
  /** Full state replication */
  FULL_SYNC = 'full-sync',
  /** Only changed values */
  DELTA_SYNC = 'delta-sync',
  /** Event-sourced sync */
  EVENT_SYNC = 'event-sync',
  /** Conflict-free replicated data types */
  CRDT = 'crdt',
  /** Version vectors for causality */
  VECTOR_CLOCK = 'vector-clock',
}

// ============================================
// INTERFACES
// ============================================

export interface ConvergenceSession {
  id: string;
  name: string;
  pattern: CoordinationPattern;
  state: ConvergenceState;
  agents: string[];
  leaderId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  goal: ConvergenceGoal;
  currentPhase: number;
  totalPhases: number;
  stateVersion: number;
  metadata?: Record<string, unknown>;
}

export interface ConvergenceGoal {
  description: string;
  successCriteria: SuccessCriterion[];
  timeout?: number;
  maxIterations?: number;
  convergenceThreshold?: number;
}

export interface SuccessCriterion {
  name: string;
  condition: string;
  weight: number;
  required: boolean;
}

export interface AgentState {
  agentId: string;
  sessionId: string;
  state: Record<string, unknown>;
  version: number;
  vectorClock: Record<string, number>;
  lastUpdated: Date;
  checksum: string;
}

export interface StateUpdate {
  sessionId: string;
  agentId: string;
  updates: StateDelta[];
  version: number;
  vectorClock: Record<string, number>;
  timestamp: Date;
}

export interface StateDelta {
  path: string;
  operation: 'set' | 'delete' | 'increment' | 'append' | 'merge';
  value?: unknown;
  previousValue?: unknown;
}

export interface Conflict {
  id: string;
  sessionId: string;
  type: ConflictType;
  agents: string[];
  description: string;
  details: Record<string, unknown>;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: ConflictResolution;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  winnerId?: string;
  mergedValue?: unknown;
  rollbackPoint?: string;
  arbiterId?: string;
  votes?: Record<string, number>;
  explanation: string;
}

export interface HandoffRequest {
  id: string;
  sessionId: string;
  sourceAgentId: string;
  targetAgentId?: string;
  targetCapabilities?: string[];
  reason: HandoffReason;
  taskContext: TaskContext;
  stateSnapshot: Record<string, unknown>;
  priority: number;
  createdAt: Date;
  deadline?: Date;
}

export interface HandoffResult {
  requestId: string;
  accepted: boolean;
  targetAgentId: string;
  handoffTime: Date;
  stateTransferred: boolean;
  continuationToken?: string;
  error?: string;
}

export interface TaskContext {
  taskId: string;
  taskType: string;
  progress: number;
  remainingWork: string[];
  dependencies: string[];
  artifacts: string[];
  metadata?: Record<string, unknown>;
}

export interface ConvergenceMetrics {
  sessionId: string;
  iterationCount: number;
  convergenceScore: number;
  agentAgreement: number;
  conflictCount: number;
  handoffCount: number;
  syncLatencyMs: number;
  throughput: number;
  timestamp: Date;
}

export interface CoordinationMessage {
  id: string;
  sessionId: string;
  type: MessageType;
  senderId: string;
  recipientIds: string[] | 'broadcast';
  payload: unknown;
  timestamp: Date;
  requiresAck: boolean;
  ttl?: number;
}

export type MessageType =
  | 'state_update'
  | 'sync_request'
  | 'sync_response'
  | 'handoff_request'
  | 'handoff_accept'
  | 'handoff_reject'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'vote_request'
  | 'vote_response'
  | 'leader_election'
  | 'heartbeat'
  | 'phase_complete'
  | 'convergence_check'
  | 'shutdown';

export interface ConvergenceConfig {
  defaultPattern: CoordinationPattern;
  defaultSyncStrategy: SyncStrategy;
  defaultConflictStrategy: ConflictResolutionStrategy;
  heartbeatIntervalMs: number;
  syncIntervalMs: number;
  convergenceCheckIntervalMs: number;
  maxConflictRetries: number;
  handoffTimeoutMs: number;
  sessionTimeoutMs: number;
  enableAuditLogging: boolean;
  enableCARSIntegration: boolean;
  enableBehavioralVerification: boolean;
}

// ============================================
// CALLBACK TYPES
// ============================================

export type StateUpdateHandler = (update: StateUpdate) => Promise<void>;
export type ConflictHandler = (conflict: Conflict) => Promise<ConflictResolution>;
export type HandoffHandler = (request: HandoffRequest) => Promise<HandoffResult>;
export type ConvergenceHandler = (session: ConvergenceSession, metrics: ConvergenceMetrics) => Promise<boolean>;
export type MessageHandler = (message: CoordinationMessage) => Promise<void>;
