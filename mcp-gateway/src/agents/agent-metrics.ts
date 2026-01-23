/**
 * FORGE MCP Gateway - Agent Metrics
 *
 * Prometheus metrics for comprehensive agent tracking.
 */

import * as client from 'prom-client';
import { AgentRegistry } from './agent-registry.js';
import { AgentStatus, AgentType, TaskStatus } from './types.js';

// ============================================
// AGENT LIFECYCLE METRICS
// ============================================

export const agentsCreatedTotal = new client.Counter({
  name: 'forge_agents_created_total',
  help: 'Total number of agents created',
  labelNames: ['type'],
});

export const agentsCompletedTotal = new client.Counter({
  name: 'forge_agents_completed_total',
  help: 'Total number of agents that completed successfully',
  labelNames: ['type'],
});

export const agentsFailedTotal = new client.Counter({
  name: 'forge_agents_failed_total',
  help: 'Total number of agents that failed',
  labelNames: ['type'],
});

export const agentsActive = new client.Gauge({
  name: 'forge_agents_active',
  help: 'Number of currently active agents',
  labelNames: ['type', 'status'],
});

export const agentLifetimeSeconds = new client.Histogram({
  name: 'forge_agent_lifetime_seconds',
  help: 'Agent lifetime duration in seconds',
  labelNames: ['type', 'status'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200],
});

// ============================================
// AGENT TASK METRICS
// ============================================

export const agentTasksTotal = new client.Counter({
  name: 'forge_agent_tasks_total',
  help: 'Total tasks executed by agents',
  labelNames: ['agent_type', 'task_type', 'status'],
});

export const agentTasksActive = new client.Gauge({
  name: 'forge_agent_tasks_active',
  help: 'Number of currently running tasks',
  labelNames: ['agent_type', 'task_type'],
});

export const agentTaskDurationSeconds = new client.Histogram({
  name: 'forge_agent_task_duration_seconds',
  help: 'Agent task execution duration in seconds',
  labelNames: ['agent_type', 'task_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
});

// ============================================
// AGGREGATE METRICS
// ============================================

export const agentsTotalGauge = new client.Gauge({
  name: 'forge_agents_total',
  help: 'Total number of agents in registry',
});

export const agentsRunningGauge = new client.Gauge({
  name: 'forge_agents_running',
  help: 'Number of agents currently running tasks',
});

export const agentTasksCompletedTotal = new client.Counter({
  name: 'forge_agent_tasks_completed_total',
  help: 'Total tasks completed successfully',
  labelNames: ['agent_type'],
});

export const agentTasksFailedTotal = new client.Counter({
  name: 'forge_agent_tasks_failed_total',
  help: 'Total tasks that failed',
  labelNames: ['agent_type'],
});

// ============================================
// METRIC RECORDING HELPERS
// ============================================

/**
 * Record agent creation
 */
export function recordAgentCreated(type: string): void {
  agentsCreatedTotal.inc({ type });
  updateActiveGauges();
}

/**
 * Record agent started (transitioned to idle)
 */
export function recordAgentStarted(type: string): void {
  updateActiveGauges();
}

/**
 * Record agent completion
 */
export function recordAgentCompleted(
  type: string,
  status: 'completed' | 'error',
  durationMs: number
): void {
  const durationSec = durationMs / 1000;

  if (status === 'completed') {
    agentsCompletedTotal.inc({ type });
  } else {
    agentsFailedTotal.inc({ type });
  }

  agentLifetimeSeconds.observe({ type, status }, durationSec);
  updateActiveGauges();
}

/**
 * Record task started
 */
export function recordTaskStarted(agentType: string, taskType: string): void {
  agentTasksActive.inc({ agent_type: agentType, task_type: taskType });
  updateActiveGauges();
}

/**
 * Record task completion
 */
export function recordTaskCompleted(
  agentType: string,
  taskType: string,
  status: TaskStatus,
  durationMs?: number
): void {
  agentTasksTotal.inc({
    agent_type: agentType,
    task_type: taskType,
    status: status
  });

  agentTasksActive.dec({ agent_type: agentType, task_type: taskType });

  if (status === TaskStatus.COMPLETED) {
    agentTasksCompletedTotal.inc({ agent_type: agentType });
  } else if (status === TaskStatus.FAILED) {
    agentTasksFailedTotal.inc({ agent_type: agentType });
  }

  if (durationMs !== undefined) {
    agentTaskDurationSeconds.observe(
      { agent_type: agentType, task_type: taskType },
      durationMs / 1000
    );
  }

  updateActiveGauges();
}

/**
 * Record task (legacy compatibility)
 */
export function recordAgentTask(
  agentType: string,
  taskType: string,
  status: 'completed' | 'failed',
  durationMs?: number
): void {
  const taskStatus = status === 'completed' ? TaskStatus.COMPLETED : TaskStatus.FAILED;
  agentTasksTotal.inc({
    agent_type: agentType,
    task_type: taskType,
    status: taskStatus
  });

  if (status === 'completed') {
    agentTasksCompletedTotal.inc({ agent_type: agentType });
  } else {
    agentTasksFailedTotal.inc({ agent_type: agentType });
  }

  if (durationMs !== undefined) {
    agentTaskDurationSeconds.observe(
      { agent_type: agentType, task_type: taskType },
      durationMs / 1000
    );
  }
}

/**
 * Update active agents gauges from registry
 */
export function updateActiveGauges(): void {
  // Reset gauges
  agentsActive.reset();

  // Get current state from registry
  const stats = AgentRegistry.getAgentStats();

  // Update type/status breakdown
  for (const [type, counts] of Object.entries(stats.byType)) {
    if (counts.active > 0) {
      // Distribute active across statuses
      const activeAgents = AgentRegistry.getActiveAgents().filter(a => a.type === type);
      for (const agent of activeAgents) {
        agentsActive.set({ type, status: agent.status }, 1);
      }
    }
  }

  // Update aggregate gauges
  agentsTotalGauge.set(stats.totalCreated);
  agentsRunningGauge.set(AgentRegistry.getRunningAgents().length);
}

/**
 * Get agent metrics summary for API response
 */
export function getAgentMetricsSummary(): {
  totalCreated: number;
  activeCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
  taskStats: { total: number; completed: number; failed: number; byType: Record<string, number> };
} {
  const stats = AgentRegistry.getAgentStats();

  return {
    totalCreated: stats.totalCreated,
    activeCount: stats.totalActive,
    runningCount: AgentRegistry.getRunningAgents().length,
    completedCount: stats.totalCompleted,
    failedCount: stats.totalFailed,
    taskStats: stats.taskStats,
  };
}

/**
 * Initialize metrics collection interval
 */
export function startMetricsCollection(intervalMs: number = 15000): NodeJS.Timeout {
  return setInterval(() => {
    updateActiveGauges();
  }, intervalMs);
}
