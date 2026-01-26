/**
 * FORGE MCP Gateway - Agent Registry
 *
 * Singleton registry for tracking agent lifecycle, tasks, and state.
 */

import {
  AgentInfo,
  AgentTask,
  AgentStatus,
  AgentType,
  AgentStats,
  AgentMetadata,
  AgentListOptions,
  AgentListResult,
  TaskStatus,
} from './types.js';

class AgentRegistryImpl {
  private agents: Map<string, AgentInfo> = new Map();
  private tasks: Map<string, AgentTask[]> = new Map();
  private completedAgentLifetimes: number[] = [];
  private createdCount: number = 0;
  private completedCount: number = 0;
  private failedCount: number = 0;

  // ============================================
  // AGENT LIFECYCLE
  // ============================================

  /**
   * Register a new agent
   */
  registerAgent(
    id: string,
    name: string,
    type: AgentType | string = AgentType.GENERIC,
    metadata?: AgentMetadata
  ): AgentInfo {
    const now = new Date();

    const agent: AgentInfo = {
      id,
      name,
      type,
      status: AgentStatus.INITIALIZING,
      createdAt: now,
      lastActiveAt: now,
      taskCount: 0,
      completedTasks: 0,
      failedTasks: 0,
      metadata,
    };

    this.agents.set(id, agent);
    this.tasks.set(id, []);
    this.createdCount++;

    return agent;
  }

  /**
   * Start an agent (transition to IDLE state)
   */
  startAgent(id: string): AgentInfo | undefined {
    const agent = this.agents.get(id);
    if (agent && agent.status === AgentStatus.INITIALIZING) {
      agent.status = AgentStatus.IDLE;
      agent.startedAt = new Date();
      agent.lastActiveAt = new Date();
    }
    return agent;
  }

  /**
   * Unregister/complete an agent
   */
  unregisterAgent(id: string, status: 'completed' | 'error' = 'completed'): AgentInfo | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    const now = new Date();
    agent.status = status === 'completed' ? AgentStatus.COMPLETED : AgentStatus.ERROR;
    agent.completedAt = now;
    agent.lastActiveAt = now;

    // Calculate lifetime
    const startTime = agent.startedAt || agent.createdAt;
    const lifetime = (now.getTime() - startTime.getTime()) / 1000;
    this.completedAgentLifetimes.push(lifetime);

    if (status === 'completed') {
      this.completedCount++;
    } else {
      this.failedCount++;
    }

    return agent;
  }

  /**
   * Remove agent from registry entirely
   */
  removeAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    this.tasks.delete(id);
    return deleted;
  }

  // ============================================
  // AGENT QUERIES
  // ============================================

  /**
   * Get agent by ID
   */
  getAgent(id: string): AgentInfo | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents with pagination and filtering
   */
  listAgents(options: AgentListOptions = {}): AgentListResult {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    let agents = Array.from(this.agents.values());

    // Filter by type
    if (type) {
      agents = agents.filter(a => a.type === type);
    }

    // Filter by status
    if (status) {
      agents = agents.filter(a => a.status === status);
    }

    // Sort
    agents.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'taskCount':
          aVal = a.taskCount;
          bVal = b.taskCount;
          break;
        case 'lastActiveAt':
          aVal = a.lastActiveAt?.getTime() || 0;
          bVal = b.lastActiveAt?.getTime() || 0;
          break;
        case 'createdAt':
        default:
          aVal = a.createdAt.getTime();
          bVal = b.createdAt.getTime();
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
    });

    const total = agents.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedAgents = agents.slice(startIndex, startIndex + limit);

    return {
      agents: paginatedAgents,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Get active agents (not completed/error)
   */
  getActiveAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).filter(
      a => a.status !== AgentStatus.COMPLETED && a.status !== AgentStatus.ERROR
    );
  }

  /**
   * Get running agents (actively processing)
   */
  getRunningAgents(): AgentInfo[] {
    return Array.from(this.agents.values()).filter(
      a => a.status === AgentStatus.RUNNING
    );
  }

  /**
   * Get total created count
   */
  getAgentCount(): number {
    return this.createdCount;
  }

  /**
   * Get currently active count
   */
  getRunningCount(): number {
    return this.getActiveAgents().length;
  }

  // ============================================
  // TASK MANAGEMENT
  // ============================================

  /**
   * Start a new task for an agent
   */
  startTask(
    agentId: string,
    taskType: string,
    taskId?: string,
    metadata?: Record<string, unknown>
  ): AgentTask | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;

    const task: AgentTask = {
      id: taskId || crypto.randomUUID(),
      agentId,
      type: taskType,
      status: TaskStatus.RUNNING,
      startedAt: new Date(),
      metadata,
    };

    // Update agent state
    agent.status = AgentStatus.RUNNING;
    agent.taskCount++;
    agent.lastActiveAt = new Date();
    agent.currentTask = task;

    // Store task
    const agentTasks = this.tasks.get(agentId) || [];
    agentTasks.push(task);
    this.tasks.set(agentId, agentTasks);

    return task;
  }

  /**
   * Update task status
   */
  updateAgentTask(
    agentId: string,
    taskId: string,
    status: TaskStatus,
    result?: unknown,
    error?: string
  ): AgentTask | undefined {
    const agent = this.agents.get(agentId);
    const agentTasks = this.tasks.get(agentId);
    if (!agent || !agentTasks) return undefined;

    const task = agentTasks.find(t => t.id === taskId);
    if (!task) return undefined;

    task.status = status;
    task.completedAt = status !== TaskStatus.RUNNING ? new Date() : undefined;
    task.result = result;
    task.error = error;

    // Update agent state
    agent.lastActiveAt = new Date();

    if (status === TaskStatus.COMPLETED) {
      agent.completedTasks++;
    } else if (status === TaskStatus.FAILED) {
      agent.failedTasks++;
    }

    // Clear current task if completed/failed
    if (status !== TaskStatus.RUNNING && agent.currentTask?.id === taskId) {
      agent.currentTask = undefined;
      agent.status = AgentStatus.IDLE;
    }

    return task;
  }

  /**
   * Complete a task successfully
   */
  completeTask(agentId: string, taskId: string, result?: unknown): AgentTask | undefined {
    return this.updateAgentTask(agentId, taskId, TaskStatus.COMPLETED, result);
  }

  /**
   * Fail a task
   */
  failTask(agentId: string, taskId: string, error: string): AgentTask | undefined {
    return this.updateAgentTask(agentId, taskId, TaskStatus.FAILED, undefined, error);
  }

  /**
   * Get tasks for an agent
   */
  getAgentTasks(agentId: string): AgentTask[] {
    return this.tasks.get(agentId) || [];
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get comprehensive statistics
   */
  getAgentStats(): AgentStats {
    const agents = Array.from(this.agents.values());
    const allTasks = Array.from(this.tasks.values()).flat();

    // Count by type
    const byType: AgentStats['byType'] = {};
    for (const agent of agents) {
      const type = agent.type;
      if (!byType[type]) {
        byType[type] = { created: 0, active: 0, completed: 0, failed: 0 };
      }
      byType[type].created++;
      if (agent.status === AgentStatus.COMPLETED) {
        byType[type].completed++;
      } else if (agent.status === AgentStatus.ERROR) {
        byType[type].failed++;
      } else {
        byType[type].active++;
      }
    }

    // Count by status
    const byStatus: Record<AgentStatus, number> = {
      [AgentStatus.INITIALIZING]: 0,
      [AgentStatus.IDLE]: 0,
      [AgentStatus.RUNNING]: 0,
      [AgentStatus.COMPLETED]: 0,
      [AgentStatus.ERROR]: 0,
    };
    for (const agent of agents) {
      byStatus[agent.status]++;
    }

    // Task stats
    const tasksByType: Record<string, number> = {};
    let completedTasks = 0;
    let failedTasks = 0;
    for (const task of allTasks) {
      tasksByType[task.type] = (tasksByType[task.type] || 0) + 1;
      if (task.status === TaskStatus.COMPLETED) completedTasks++;
      if (task.status === TaskStatus.FAILED) failedTasks++;
    }

    // Calculate averages
    const avgLifetime = this.completedAgentLifetimes.length > 0
      ? this.completedAgentLifetimes.reduce((a, b) => a + b, 0) / this.completedAgentLifetimes.length
      : 0;

    const avgTasks = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.taskCount, 0) / agents.length
      : 0;

    return {
      totalCreated: this.createdCount,
      totalActive: this.getActiveAgents().length,
      totalCompleted: this.completedCount,
      totalFailed: this.failedCount,
      byType,
      byStatus,
      taskStats: {
        total: allTasks.length,
        completed: completedTasks,
        failed: failedTasks,
        byType: tasksByType,
      },
      averageLifetimeSeconds: Math.round(avgLifetime * 100) / 100,
      averageTasksPerAgent: Math.round(avgTasks * 100) / 100,
    };
  }

  // ============================================
  // MAINTENANCE
  // ============================================

  /**
   * Clear completed/failed agents older than given age
   */
  cleanupOldAgents(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, agent] of this.agents.entries()) {
      if (
        (agent.status === AgentStatus.COMPLETED || agent.status === AgentStatus.ERROR) &&
        agent.completedAt &&
        now - agent.completedAt.getTime() > maxAgeMs
      ) {
        this.agents.delete(id);
        this.tasks.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this.agents.clear();
    this.tasks.clear();
    this.completedAgentLifetimes = [];
    this.createdCount = 0;
    this.completedCount = 0;
    this.failedCount = 0;
  }
}

// Singleton instance
export const AgentRegistry = new AgentRegistryImpl();
