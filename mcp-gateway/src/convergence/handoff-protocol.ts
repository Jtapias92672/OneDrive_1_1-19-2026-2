/**
 * FORGE MCP Gateway - Handoff Protocol
 *
 * @epic Epic 04 - Convergence Engine
 * @description Manages agent handoffs with state transfer, capability matching,
 *              and CARS risk assessment during transitions.
 */

import * as crypto from 'crypto';
import {
  HandoffRequest,
  HandoffResult,
  HandoffReason,
  TaskContext,
  HandoffHandler,
} from './types.js';

export interface HandoffConfig {
  timeoutMs: number;
  maxRetries: number;
  enableStateValidation: boolean;
  enableCARSCheck: boolean;
  requireCapabilityMatch: boolean;
}

export interface AgentCapability {
  agentId: string;
  capabilities: string[];
  currentLoad: number;
  maxLoad: number;
  priority: number;
  available: boolean;
}

export class HandoffProtocol {
  private pendingHandoffs: Map<string, HandoffRequest> = new Map();
  private completedHandoffs: Map<string, HandoffResult> = new Map();
  private agentCapabilities: Map<string, AgentCapability> = new Map();
  private handlers: Map<string, HandoffHandler> = new Map();
  private config: HandoffConfig;
  private handoffCount = 0;
  private successCount = 0;
  private failureCount = 0;

  constructor(config: Partial<HandoffConfig> = {}) {
    this.config = {
      timeoutMs: config.timeoutMs ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      enableStateValidation: config.enableStateValidation ?? true,
      enableCARSCheck: config.enableCARSCheck ?? true,
      requireCapabilityMatch: config.requireCapabilityMatch ?? true,
    };
  }

  // ============================================
  // CAPABILITY MANAGEMENT
  // ============================================

  /**
   * Register agent capabilities
   */
  registerAgent(
    agentId: string,
    capabilities: string[],
    maxLoad: number = 5,
    priority: number = 1
  ): void {
    this.agentCapabilities.set(agentId, {
      agentId,
      capabilities,
      currentLoad: 0,
      maxLoad,
      priority,
      available: true,
    });
  }

  /**
   * Update agent availability
   */
  updateAgentStatus(agentId: string, available: boolean, currentLoad?: number): void {
    const agent = this.agentCapabilities.get(agentId);
    if (agent) {
      agent.available = available;
      if (currentLoad !== undefined) {
        agent.currentLoad = currentLoad;
      }
    }
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agentCapabilities.delete(agentId);
  }

  /**
   * Find agents with required capabilities
   */
  findCapableAgents(
    requiredCapabilities: string[],
    excludeAgentIds: string[] = []
  ): AgentCapability[] {
    const capable: AgentCapability[] = [];

    for (const agent of this.agentCapabilities.values()) {
      if (excludeAgentIds.includes(agent.agentId)) continue;
      if (!agent.available) continue;
      if (agent.currentLoad >= agent.maxLoad) continue;

      const hasAllCapabilities = requiredCapabilities.every(
        cap => agent.capabilities.includes(cap)
      );

      if (hasAllCapabilities) {
        capable.push(agent);
      }
    }

    // Sort by load (ascending) then priority (descending)
    return capable.sort((a, b) => {
      const loadDiff = a.currentLoad - b.currentLoad;
      if (loadDiff !== 0) return loadDiff;
      return b.priority - a.priority;
    });
  }

  // ============================================
  // HANDOFF INITIATION
  // ============================================

  /**
   * Request a handoff to another agent
   */
  async requestHandoff(
    sessionId: string,
    sourceAgentId: string,
    reason: HandoffReason,
    taskContext: TaskContext,
    stateSnapshot: Record<string, unknown>,
    options: {
      targetAgentId?: string;
      targetCapabilities?: string[];
      priority?: number;
      deadline?: Date;
    } = {}
  ): Promise<HandoffRequest> {
    const id = `handoff_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const request: HandoffRequest = {
      id,
      sessionId,
      sourceAgentId,
      targetAgentId: options.targetAgentId,
      targetCapabilities: options.targetCapabilities,
      reason,
      taskContext,
      stateSnapshot,
      priority: options.priority ?? 1,
      createdAt: new Date(),
      deadline: options.deadline ?? new Date(Date.now() + this.config.timeoutMs),
    };

    this.pendingHandoffs.set(id, request);
    this.handoffCount++;

    return request;
  }

  /**
   * Execute a handoff request
   */
  async executeHandoff(requestId: string): Promise<HandoffResult> {
    const request = this.pendingHandoffs.get(requestId);
    if (!request) {
      throw new Error(`Handoff request ${requestId} not found`);
    }

    // Check deadline
    if (new Date() > request.deadline!) {
      const result: HandoffResult = {
        requestId,
        accepted: false,
        targetAgentId: '',
        handoffTime: new Date(),
        stateTransferred: false,
        error: 'Handoff deadline exceeded',
      };
      this.recordResult(requestId, result);
      this.failureCount++;
      return result;
    }

    // Find target agent if not specified
    let targetAgentId = request.targetAgentId;
    if (!targetAgentId && request.targetCapabilities) {
      const capableAgents = this.findCapableAgents(
        request.targetCapabilities,
        [request.sourceAgentId]
      );

      if (capableAgents.length === 0) {
        const result: HandoffResult = {
          requestId,
          accepted: false,
          targetAgentId: '',
          handoffTime: new Date(),
          stateTransferred: false,
          error: 'No capable agents available',
        };
        this.recordResult(requestId, result);
        this.failureCount++;
        return result;
      }

      targetAgentId = capableAgents[0]!.agentId;
    }

    if (!targetAgentId) {
      const result: HandoffResult = {
        requestId,
        accepted: false,
        targetAgentId: '',
        handoffTime: new Date(),
        stateTransferred: false,
        error: 'No target agent specified or found',
      };
      this.recordResult(requestId, result);
      this.failureCount++;
      return result;
    }

    // Validate target agent
    const targetAgent = this.agentCapabilities.get(targetAgentId);
    if (!targetAgent || !targetAgent.available) {
      const result: HandoffResult = {
        requestId,
        accepted: false,
        targetAgentId,
        handoffTime: new Date(),
        stateTransferred: false,
        error: `Target agent ${targetAgentId} not available`,
      };
      this.recordResult(requestId, result);
      this.failureCount++;
      return result;
    }

    // Execute handoff via handler if registered
    const handler = this.handlers.get(targetAgentId);
    if (handler) {
      try {
        const result = await handler(request);
        this.recordResult(requestId, result);

        if (result.accepted) {
          this.successCount++;
          // Update load
          targetAgent.currentLoad++;
          const sourceAgent = this.agentCapabilities.get(request.sourceAgentId);
          if (sourceAgent) {
            sourceAgent.currentLoad = Math.max(0, sourceAgent.currentLoad - 1);
          }
        } else {
          this.failureCount++;
        }

        return result;
      } catch (error) {
        const result: HandoffResult = {
          requestId,
          accepted: false,
          targetAgentId,
          handoffTime: new Date(),
          stateTransferred: false,
          error: error instanceof Error ? error.message : 'Handler error',
        };
        this.recordResult(requestId, result);
        this.failureCount++;
        return result;
      }
    }

    // Default acceptance (no handler registered)
    const continuationToken = crypto.randomBytes(16).toString('hex');
    const result: HandoffResult = {
      requestId,
      accepted: true,
      targetAgentId,
      handoffTime: new Date(),
      stateTransferred: true,
      continuationToken,
    };

    this.recordResult(requestId, result);
    this.successCount++;

    // Update loads
    targetAgent.currentLoad++;
    const sourceAgent = this.agentCapabilities.get(request.sourceAgentId);
    if (sourceAgent) {
      sourceAgent.currentLoad = Math.max(0, sourceAgent.currentLoad - 1);
    }

    return result;
  }

  // ============================================
  // HANDOFF PATTERNS
  // ============================================

  /**
   * Capability-based handoff: find agent with required skills
   */
  async handoffByCapability(
    sessionId: string,
    sourceAgentId: string,
    requiredCapabilities: string[],
    taskContext: TaskContext,
    stateSnapshot: Record<string, unknown>
  ): Promise<HandoffResult> {
    const request = await this.requestHandoff(
      sessionId,
      sourceAgentId,
      HandoffReason.CAPABILITY_MISMATCH,
      taskContext,
      stateSnapshot,
      { targetCapabilities: requiredCapabilities }
    );

    return this.executeHandoff(request.id);
  }

  /**
   * Load balancing handoff: move to less loaded agent
   */
  async handoffForLoadBalancing(
    sessionId: string,
    sourceAgentId: string,
    taskContext: TaskContext,
    stateSnapshot: Record<string, unknown>
  ): Promise<HandoffResult> {
    const sourceAgent = this.agentCapabilities.get(sourceAgentId);
    if (!sourceAgent) {
      throw new Error(`Source agent ${sourceAgentId} not registered`);
    }

    // Find less loaded agent with same capabilities
    const candidates = this.findCapableAgents(
      sourceAgent.capabilities,
      [sourceAgentId]
    ).filter(a => a.currentLoad < sourceAgent.currentLoad);

    if (candidates.length === 0) {
      throw new Error('No less loaded agents available');
    }

    const request = await this.requestHandoff(
      sessionId,
      sourceAgentId,
      HandoffReason.LOAD_BALANCING,
      taskContext,
      stateSnapshot,
      { targetAgentId: candidates[0]!.agentId }
    );

    return this.executeHandoff(request.id);
  }

  /**
   * Escalation handoff: move to higher priority agent
   */
  async handoffForEscalation(
    sessionId: string,
    sourceAgentId: string,
    taskContext: TaskContext,
    stateSnapshot: Record<string, unknown>,
    minPriority: number
  ): Promise<HandoffResult> {
    const candidates = Array.from(this.agentCapabilities.values())
      .filter(a => a.agentId !== sourceAgentId)
      .filter(a => a.available)
      .filter(a => a.priority >= minPriority)
      .filter(a => a.currentLoad < a.maxLoad)
      .sort((a, b) => b.priority - a.priority);

    if (candidates.length === 0) {
      throw new Error('No agents available for escalation');
    }

    const request = await this.requestHandoff(
      sessionId,
      sourceAgentId,
      HandoffReason.ESCALATION,
      taskContext,
      stateSnapshot,
      { targetAgentId: candidates[0]!.agentId }
    );

    return this.executeHandoff(request.id);
  }

  /**
   * Failure recovery handoff
   */
  async handoffForFailureRecovery(
    sessionId: string,
    failedAgentId: string,
    taskContext: TaskContext,
    stateSnapshot: Record<string, unknown>
  ): Promise<HandoffResult> {
    const failedAgent = this.agentCapabilities.get(failedAgentId);
    const capabilities = failedAgent?.capabilities ?? [];

    // Mark failed agent as unavailable
    if (failedAgent) {
      failedAgent.available = false;
    }

    const request = await this.requestHandoff(
      sessionId,
      failedAgentId,
      HandoffReason.FAILURE_RECOVERY,
      taskContext,
      stateSnapshot,
      { targetCapabilities: capabilities, priority: 10 }
    );

    return this.executeHandoff(request.id);
  }

  // ============================================
  // HANDOFF QUERIES
  // ============================================

  /**
   * Get handoff request by ID
   */
  getRequest(id: string): HandoffRequest | undefined {
    return this.pendingHandoffs.get(id);
  }

  /**
   * Get handoff result by request ID
   */
  getResult(requestId: string): HandoffResult | undefined {
    return this.completedHandoffs.get(requestId);
  }

  /**
   * Get pending handoffs for a session
   */
  getPendingHandoffs(sessionId: string): HandoffRequest[] {
    return Array.from(this.pendingHandoffs.values())
      .filter(h => h.sessionId === sessionId);
  }

  /**
   * Get handoff statistics
   */
  getStats(): {
    total: number;
    pending: number;
    successful: number;
    failed: number;
    byReason: Record<HandoffReason, number>;
    averageHandoffTimeMs: number;
  } {
    const byReason: Record<string, number> = {};
    let totalHandoffTime = 0;
    let completedCount = 0;

    for (const request of this.pendingHandoffs.values()) {
      byReason[request.reason] = (byReason[request.reason] ?? 0) + 1;
    }

    for (const [requestId, result] of this.completedHandoffs.entries()) {
      const request = this.pendingHandoffs.get(requestId);
      if (request) {
        byReason[request.reason] = (byReason[request.reason] ?? 0) + 1;
        totalHandoffTime += result.handoffTime.getTime() - request.createdAt.getTime();
        completedCount++;
      }
    }

    return {
      total: this.handoffCount,
      pending: this.pendingHandoffs.size - this.completedHandoffs.size,
      successful: this.successCount,
      failed: this.failureCount,
      byReason: byReason as Record<HandoffReason, number>,
      averageHandoffTimeMs: completedCount > 0 ? totalHandoffTime / completedCount : 0,
    };
  }

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Register handler for an agent
   */
  registerHandler(agentId: string, handler: HandoffHandler): () => void {
    this.handlers.set(agentId, handler);
    return () => this.handlers.delete(agentId);
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Record handoff result
   */
  private recordResult(requestId: string, result: HandoffResult): void {
    this.completedHandoffs.set(requestId, result);
    this.pendingHandoffs.delete(requestId);
  }

  /**
   * Cleanup old completed handoffs
   */
  cleanup(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, result] of this.completedHandoffs.entries()) {
      if (now - result.handoffTime.getTime() > maxAgeMs) {
        this.completedHandoffs.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Reset protocol
   */
  reset(): void {
    this.pendingHandoffs.clear();
    this.completedHandoffs.clear();
    this.agentCapabilities.clear();
    this.handlers.clear();
    this.handoffCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }
}

// Singleton instance
export const handoffProtocol = new HandoffProtocol();
