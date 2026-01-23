/**
 * FORGE MCP Gateway - Agents Module
 *
 * Agent tracking, registry, metrics, and types.
 */

// Types
export {
  AgentType,
  AgentStatus,
  TaskStatus,
  type AgentInfo,
  type AgentTask,
  type AgentMetadata,
  type AgentStats,
  type AgentListOptions,
  type AgentListResult,
  type RegisterAgentRequest,
  type UpdateAgentRequest,
  type AgentTaskResult,
} from './types.js';

// Registry
export { AgentRegistry } from './agent-registry.js';

// Metrics
export {
  agentsCreatedTotal,
  agentsCompletedTotal,
  agentsFailedTotal,
  agentsActive,
  agentLifetimeSeconds,
  agentTasksTotal,
  agentTasksActive,
  agentTaskDurationSeconds,
  agentsTotalGauge,
  agentsRunningGauge,
  agentTasksCompletedTotal,
  agentTasksFailedTotal,
  recordAgentCreated,
  recordAgentStarted,
  recordAgentCompleted,
  recordTaskStarted,
  recordTaskCompleted,
  recordAgentTask,
  updateActiveGauges,
  getAgentMetricsSummary,
  startMetricsCollection,
} from './agent-metrics.js';
