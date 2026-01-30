/**
 * FORGE MCP Gateway - Convergence Metrics
 *
 * @epic Epic 04 - Convergence Engine
 * @description Prometheus metrics for convergence monitoring and performance tracking.
 */

import * as client from 'prom-client';
import { ConvergenceState, CoordinationPattern, ConflictType, HandoffReason } from './types.js';

// ============================================
// SESSION METRICS
// ============================================

export const convergenceSessionsTotal = new client.Counter({
  name: 'forge_convergence_sessions_total',
  help: 'Total number of convergence sessions created',
  labelNames: ['pattern'],
});

export const convergenceSessionsActive = new client.Gauge({
  name: 'forge_convergence_sessions_active',
  help: 'Number of currently active convergence sessions',
  labelNames: ['pattern', 'state'],
});

export const convergenceSessionDuration = new client.Histogram({
  name: 'forge_convergence_session_duration_seconds',
  help: 'Duration of convergence sessions in seconds',
  labelNames: ['pattern', 'outcome'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800],
});

export const convergenceScore = new client.Gauge({
  name: 'forge_convergence_score',
  help: 'Current convergence score (0-100)',
  labelNames: ['session_id'],
});

// ============================================
// AGENT COORDINATION METRICS
// ============================================

export const convergenceAgentsPerSession = new client.Histogram({
  name: 'forge_convergence_agents_per_session',
  help: 'Number of agents participating in convergence sessions',
  labelNames: ['pattern'],
  buckets: [1, 2, 3, 5, 7, 10, 15, 20],
});

export const convergenceAgentAgreement = new client.Gauge({
  name: 'forge_convergence_agent_agreement',
  help: 'Percentage of agents in agreement',
  labelNames: ['session_id'],
});

export const convergenceIterations = new client.Histogram({
  name: 'forge_convergence_iterations',
  help: 'Number of iterations to reach convergence',
  labelNames: ['pattern'],
  buckets: [1, 2, 3, 5, 10, 15, 20, 30, 50],
});

// ============================================
// SYNCHRONIZATION METRICS
// ============================================

export const syncOperationsTotal = new client.Counter({
  name: 'forge_convergence_sync_operations_total',
  help: 'Total number of state synchronization operations',
  labelNames: ['type', 'result'],
});

export const syncLatencyMs = new client.Histogram({
  name: 'forge_convergence_sync_latency_ms',
  help: 'State synchronization latency in milliseconds',
  labelNames: ['type'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
});

export const stateUpdatesTotal = new client.Counter({
  name: 'forge_convergence_state_updates_total',
  help: 'Total number of state updates',
  labelNames: ['session_id', 'agent_id'],
});

export const stateVersion = new client.Gauge({
  name: 'forge_convergence_state_version',
  help: 'Current state version',
  labelNames: ['session_id', 'agent_id'],
});

// ============================================
// CONFLICT METRICS
// ============================================

export const conflictsDetectedTotal = new client.Counter({
  name: 'forge_convergence_conflicts_detected_total',
  help: 'Total number of conflicts detected',
  labelNames: ['type', 'severity'],
});

export const conflictsResolvedTotal = new client.Counter({
  name: 'forge_convergence_conflicts_resolved_total',
  help: 'Total number of conflicts resolved',
  labelNames: ['type', 'strategy'],
});

export const conflictResolutionDuration = new client.Histogram({
  name: 'forge_convergence_conflict_resolution_duration_ms',
  help: 'Time to resolve conflicts in milliseconds',
  labelNames: ['type', 'strategy'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
});

export const conflictsPendingGauge = new client.Gauge({
  name: 'forge_convergence_conflicts_pending',
  help: 'Number of unresolved conflicts',
  labelNames: ['session_id'],
});

// ============================================
// HANDOFF METRICS
// ============================================

export const handoffsRequestedTotal = new client.Counter({
  name: 'forge_convergence_handoffs_requested_total',
  help: 'Total number of handoff requests',
  labelNames: ['reason'],
});

export const handoffsCompletedTotal = new client.Counter({
  name: 'forge_convergence_handoffs_completed_total',
  help: 'Total number of completed handoffs',
  labelNames: ['reason', 'result'],
});

export const handoffDurationMs = new client.Histogram({
  name: 'forge_convergence_handoff_duration_ms',
  help: 'Handoff execution time in milliseconds',
  labelNames: ['reason'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

export const handoffsPendingGauge = new client.Gauge({
  name: 'forge_convergence_handoffs_pending',
  help: 'Number of pending handoff requests',
});

// ============================================
// PATTERN METRICS
// ============================================

export const patternExecutionsTotal = new client.Counter({
  name: 'forge_convergence_pattern_executions_total',
  help: 'Total pattern executions',
  labelNames: ['pattern', 'result'],
});

export const patternDurationMs = new client.Histogram({
  name: 'forge_convergence_pattern_duration_ms',
  help: 'Pattern execution duration in milliseconds',
  labelNames: ['pattern'],
  buckets: [100, 500, 1000, 2500, 5000, 10000, 30000, 60000],
});

export const patternMessagesTotal = new client.Counter({
  name: 'forge_convergence_pattern_messages_total',
  help: 'Total messages exchanged in pattern execution',
  labelNames: ['pattern', 'type'],
});

// ============================================
// METRIC RECORDING HELPERS
// ============================================

/**
 * Record session creation
 */
export function recordSessionCreated(pattern: CoordinationPattern): void {
  convergenceSessionsTotal.inc({ pattern });
}

/**
 * Record session state change
 */
export function recordSessionState(
  pattern: CoordinationPattern,
  state: ConvergenceState,
  delta: number = 1
): void {
  if (delta > 0) {
    convergenceSessionsActive.inc({ pattern, state }, delta);
  } else {
    convergenceSessionsActive.dec({ pattern, state }, Math.abs(delta));
  }
}

/**
 * Record session completion
 */
export function recordSessionCompleted(
  pattern: CoordinationPattern,
  outcome: 'converged' | 'failed' | 'diverged',
  durationMs: number,
  agentCount: number,
  iterations: number
): void {
  convergenceSessionDuration.observe({ pattern, outcome }, durationMs / 1000);
  convergenceAgentsPerSession.observe({ pattern }, agentCount);
  convergenceIterations.observe({ pattern }, iterations);
}

/**
 * Record convergence metrics
 */
export function recordConvergenceMetrics(
  sessionId: string,
  score: number,
  agreement: number
): void {
  convergenceScore.set({ session_id: sessionId }, score);
  convergenceAgentAgreement.set({ session_id: sessionId }, agreement);
}

/**
 * Record state sync operation
 */
export function recordSyncOperation(
  type: 'full' | 'delta' | 'event',
  result: 'success' | 'failure',
  latencyMs: number
): void {
  syncOperationsTotal.inc({ type, result });
  if (result === 'success') {
    syncLatencyMs.observe({ type }, latencyMs);
  }
}

/**
 * Record state update
 */
export function recordStateUpdate(sessionId: string, agentId: string, version: number): void {
  stateUpdatesTotal.inc({ session_id: sessionId, agent_id: agentId });
  stateVersion.set({ session_id: sessionId, agent_id: agentId }, version);
}

/**
 * Record conflict detected
 */
export function recordConflictDetected(type: ConflictType, severity: string): void {
  conflictsDetectedTotal.inc({ type, severity });
}

/**
 * Record conflict resolved
 */
export function recordConflictResolved(
  type: ConflictType,
  strategy: string,
  durationMs: number
): void {
  conflictsResolvedTotal.inc({ type, strategy });
  conflictResolutionDuration.observe({ type, strategy }, durationMs);
}

/**
 * Record handoff requested
 */
export function recordHandoffRequested(reason: HandoffReason): void {
  handoffsRequestedTotal.inc({ reason });
}

/**
 * Record handoff completed
 */
export function recordHandoffCompleted(
  reason: HandoffReason,
  result: 'accepted' | 'rejected',
  durationMs: number
): void {
  handoffsCompletedTotal.inc({ reason, result });
  handoffDurationMs.observe({ reason }, durationMs);
}

/**
 * Record pattern execution
 */
export function recordPatternExecution(
  pattern: CoordinationPattern,
  result: 'success' | 'failure',
  durationMs: number,
  messageCount: number
): void {
  patternExecutionsTotal.inc({ pattern, result });
  patternDurationMs.observe({ pattern }, durationMs);
  patternMessagesTotal.inc({ pattern, type: 'total' }, messageCount);
}

/**
 * Update pending gauges
 */
export function updatePendingGauges(
  sessionId: string,
  pendingConflicts: number,
  pendingHandoffs: number
): void {
  conflictsPendingGauge.set({ session_id: sessionId }, pendingConflicts);
  handoffsPendingGauge.set(pendingHandoffs);
}

/**
 * Get metrics summary for API response
 */
export function getConvergenceMetricsSummary(): {
  sessions: { total: number; active: number; converged: number; failed: number };
  conflicts: { detected: number; resolved: number; pending: number };
  handoffs: { requested: number; completed: number; pending: number };
  averageConvergenceScore: number;
} {
  return {
    sessions: {
      total: 0, // Would be populated from actual metrics
      active: 0,
      converged: 0,
      failed: 0,
    },
    conflicts: {
      detected: 0,
      resolved: 0,
      pending: 0,
    },
    handoffs: {
      requested: 0,
      completed: 0,
      pending: 0,
    },
    averageConvergenceScore: 0,
  };
}
