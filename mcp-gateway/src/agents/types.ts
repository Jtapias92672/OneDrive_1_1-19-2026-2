/**
 * FORGE MCP Gateway - Agent Types
 *
 * Type definitions for agent tracking system.
 */

// ============================================
// ENUMS
// ============================================

export enum AgentType {
  CODE_GENERATOR = 'code-generator',
  VALIDATOR = 'validator',
  FIGMA_PARSER = 'figma-parser',
  REACT_GENERATOR = 'react-generator',
  MENDIX_INTEGRATION = 'mendix-integration',
  EVIDENCE_PACKER = 'evidence-packer',
  TEST_RUNNER = 'test-runner',
  CODE_REVIEWER = 'code-reviewer',
  SECURITY_SCANNER = 'security-scanner',
  DOCUMENTATION = 'documentation',
  GENERIC = 'generic',
}

export enum AgentStatus {
  INITIALIZING = 'initializing',
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ============================================
// INTERFACES
// ============================================

export interface AgentMetadata {
  version?: string;
  capabilities?: string[];
  maxConcurrentTasks?: number;
  priority?: number;
  tags?: string[];
  customData?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: string;
  status: TaskStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentInfo {
  id: string;
  name: string;
  type: AgentType | string;
  status: AgentStatus;
  createdAt: Date;
  startedAt?: Date;
  lastActiveAt?: Date;
  completedAt?: Date;
  taskCount: number;
  currentTask?: AgentTask;
  completedTasks: number;
  failedTasks: number;
  metadata?: AgentMetadata;
}

export interface AgentStats {
  totalCreated: number;
  totalActive: number;
  totalCompleted: number;
  totalFailed: number;
  byType: Record<string, {
    created: number;
    active: number;
    completed: number;
    failed: number;
  }>;
  byStatus: Record<AgentStatus, number>;
  taskStats: {
    total: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
  };
  averageLifetimeSeconds: number;
  averageTasksPerAgent: number;
}

export interface AgentListOptions {
  page?: number;
  limit?: number;
  type?: AgentType | string;
  status?: AgentStatus;
  sortBy?: 'createdAt' | 'lastActiveAt' | 'taskCount' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface AgentListResult {
  agents: AgentInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RegisterAgentRequest {
  name: string;
  type?: AgentType | string;
  metadata?: AgentMetadata;
}

export interface UpdateAgentRequest {
  status?: AgentStatus;
  currentTask?: {
    id?: string;
    type: string;
    metadata?: Record<string, unknown>;
  };
  metadata?: Partial<AgentMetadata>;
}

export interface AgentTaskResult {
  taskId: string;
  status: TaskStatus;
  result?: unknown;
  error?: string;
}
