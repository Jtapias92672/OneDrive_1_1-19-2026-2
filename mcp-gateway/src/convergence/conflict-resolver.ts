/**
 * FORGE MCP Gateway - Conflict Resolver
 *
 * ============================================================================
 * WARNING: SIMULATION FRAMEWORK - NOT FOR PRODUCTION
 * ============================================================================
 * This module is part of the Convergence Engine simulation framework.
 * For testing, demos, and development only.
 * See src/convergence/README.md for details.
 * ============================================================================
 *
 * @epic Epic 04 - Convergence Engine
 * @description Detects and resolves conflicts between agents using
 *              multiple resolution strategies with CARS integration.
 */

import * as crypto from 'crypto';
import {
  Conflict,
  ConflictType,
  ConflictResolution,
  ConflictResolutionStrategy,
  ConflictHandler,
} from './types.js';

export interface ConflictResolverConfig {
  defaultStrategy: ConflictResolutionStrategy;
  strategyByType: Partial<Record<ConflictType, ConflictResolutionStrategy>>;
  maxRetries: number;
  votingTimeoutMs: number;
  enableCARSEscalation: boolean;
}

export interface VoteRequest {
  conflictId: string;
  options: string[];
  voterIds: string[];
  deadline: Date;
}

export interface Vote {
  conflictId: string;
  voterId: string;
  choice: string;
  timestamp: Date;
  weight: number;
}

export class ConflictResolver {
  private conflicts: Map<string, Conflict> = new Map();
  private pendingVotes: Map<string, { request: VoteRequest; votes: Vote[] }> = new Map();
  private handlers: Map<ConflictType, ConflictHandler[]> = new Map();
  private config: ConflictResolverConfig;
  private resolvedCount = 0;
  private failedCount = 0;

  constructor(config: Partial<ConflictResolverConfig> = {}) {
    this.config = {
      defaultStrategy: config.defaultStrategy ?? ConflictResolutionStrategy.PRIORITY_BASED,
      strategyByType: config.strategyByType ?? {},
      maxRetries: config.maxRetries ?? 3,
      votingTimeoutMs: config.votingTimeoutMs ?? 30000,
      enableCARSEscalation: config.enableCARSEscalation ?? true,
    };
  }

  // ============================================
  // CONFLICT DETECTION
  // ============================================

  /**
   * Detect and register a new conflict
   */
  detectConflict(
    sessionId: string,
    type: ConflictType,
    agents: string[],
    description: string,
    details: Record<string, unknown> = {}
  ): Conflict {
    const id = `conflict_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const severity = this.assessSeverity(type, details);

    const conflict: Conflict = {
      id,
      sessionId,
      type,
      agents,
      description,
      details,
      detectedAt: new Date(),
      severity,
    };

    this.conflicts.set(id, conflict);

    return conflict;
  }

  /**
   * Assess conflict severity based on type and details
   */
  private assessSeverity(type: ConflictType, details: Record<string, unknown>): Conflict['severity'] {
    // Critical conflicts
    if (type === ConflictType.RESOURCE_CONTENTION && details.resourceType === 'critical') {
      return 'critical';
    }
    if (type === ConflictType.STATE_MISMATCH && details.corruptionDetected) {
      return 'critical';
    }

    // High severity
    if (type === ConflictType.OUTPUT_CONFLICT && details.contradictory) {
      return 'high';
    }
    if (type === ConflictType.PRIORITY_CONFLICT) {
      return 'high';
    }

    // Medium severity
    if (type === ConflictType.TASK_OVERLAP) {
      return 'medium';
    }
    if (type === ConflictType.TIMING_CONFLICT) {
      return 'medium';
    }

    // Default to low
    return 'low';
  }

  // ============================================
  // CONFLICT RESOLUTION
  // ============================================

  /**
   * Resolve a conflict using appropriate strategy
   */
  async resolveConflict(
    conflictId: string,
    agentPriorities?: Record<string, number>,
    agentStates?: Record<string, { version: number; timestamp: Date }>
  ): Promise<ConflictResolution> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    if (conflict.resolution) {
      return conflict.resolution;
    }

    // Get strategy for this conflict type
    const strategy = this.config.strategyByType[conflict.type] ?? this.config.defaultStrategy;

    let resolution: ConflictResolution;

    switch (strategy) {
      case ConflictResolutionStrategy.PRIORITY_BASED:
        resolution = this.resolvePriorityBased(conflict, agentPriorities ?? {});
        break;

      case ConflictResolutionStrategy.FIRST_COME:
        resolution = this.resolveFirstCome(conflict, agentStates ?? {});
        break;

      case ConflictResolutionStrategy.LAST_WRITE:
        resolution = this.resolveLastWrite(conflict, agentStates ?? {});
        break;

      case ConflictResolutionStrategy.MERGE:
        resolution = await this.resolveMerge(conflict);
        break;

      case ConflictResolutionStrategy.VOTING:
        resolution = await this.resolveVoting(conflict);
        break;

      case ConflictResolutionStrategy.ARBITRATION:
        resolution = await this.resolveArbitration(conflict);
        break;

      case ConflictResolutionStrategy.ROLLBACK:
        resolution = this.resolveRollback(conflict);
        break;

      default:
        resolution = this.resolvePriorityBased(conflict, agentPriorities ?? {});
    }

    // Record resolution
    conflict.resolution = resolution;
    conflict.resolvedAt = new Date();
    this.resolvedCount++;

    // Notify handlers
    await this.notifyHandlers(conflict);

    return resolution;
  }

  /**
   * Priority-based resolution: highest priority agent wins
   */
  private resolvePriorityBased(
    conflict: Conflict,
    priorities: Record<string, number>
  ): ConflictResolution {
    let winner = conflict.agents[0]!;
    let highestPriority = priorities[winner] ?? 0;

    for (const agent of conflict.agents) {
      const priority = priorities[agent] ?? 0;
      if (priority > highestPriority) {
        highestPriority = priority;
        winner = agent;
      }
    }

    return {
      strategy: ConflictResolutionStrategy.PRIORITY_BASED,
      winnerId: winner,
      explanation: `Agent ${winner} wins with priority ${highestPriority}`,
    };
  }

  /**
   * First-come resolution: earliest timestamp wins
   */
  private resolveFirstCome(
    conflict: Conflict,
    states: Record<string, { version: number; timestamp: Date }>
  ): ConflictResolution {
    let winner = conflict.agents[0]!;
    let earliest = states[winner]?.timestamp ?? new Date();

    for (const agent of conflict.agents) {
      const timestamp = states[agent]?.timestamp;
      if (timestamp && timestamp < earliest) {
        earliest = timestamp;
        winner = agent;
      }
    }

    return {
      strategy: ConflictResolutionStrategy.FIRST_COME,
      winnerId: winner,
      explanation: `Agent ${winner} wins as first to claim at ${earliest.toISOString()}`,
    };
  }

  /**
   * Last-write resolution: most recent update wins
   */
  private resolveLastWrite(
    conflict: Conflict,
    states: Record<string, { version: number; timestamp: Date }>
  ): ConflictResolution {
    let winner = conflict.agents[0]!;
    let latest = states[winner]?.timestamp ?? new Date(0);

    for (const agent of conflict.agents) {
      const timestamp = states[agent]?.timestamp;
      if (timestamp && timestamp > latest) {
        latest = timestamp;
        winner = agent;
      }
    }

    return {
      strategy: ConflictResolutionStrategy.LAST_WRITE,
      winnerId: winner,
      explanation: `Agent ${winner} wins with most recent update at ${latest.toISOString()}`,
    };
  }

  /**
   * Merge resolution: combine conflicting values
   */
  private async resolveMerge(conflict: Conflict): Promise<ConflictResolution> {
    const values = conflict.details.values as Record<string, unknown>[] | undefined;

    if (!values || values.length === 0) {
      return {
        strategy: ConflictResolutionStrategy.MERGE,
        explanation: 'No values to merge',
      };
    }

    // Deep merge all values
    let merged: Record<string, unknown> = {};
    for (const value of values) {
      if (value && typeof value === 'object') {
        merged = this.deepMerge(merged, value as Record<string, unknown>);
      }
    }

    return {
      strategy: ConflictResolutionStrategy.MERGE,
      mergedValue: merged,
      explanation: `Merged ${values.length} conflicting values`,
    };
  }

  /**
   * Voting resolution: agents vote on outcome
   */
  private async resolveVoting(conflict: Conflict): Promise<ConflictResolution> {
    const voteRequest: VoteRequest = {
      conflictId: conflict.id,
      options: conflict.agents,
      voterIds: conflict.agents,
      deadline: new Date(Date.now() + this.config.votingTimeoutMs),
    };

    this.pendingVotes.set(conflict.id, { request: voteRequest, votes: [] });

    // Wait for votes (in real implementation, this would be async)
    await new Promise(resolve => setTimeout(resolve, 100));

    const voteData = this.pendingVotes.get(conflict.id);
    const votes = voteData?.votes ?? [];

    // Tally votes
    const tally: Record<string, number> = {};
    for (const vote of votes) {
      tally[vote.choice] = (tally[vote.choice] ?? 0) + vote.weight;
    }

    // Find winner
    let winner = conflict.agents[0]!;
    let maxVotes = 0;
    for (const [choice, count] of Object.entries(tally)) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = choice;
      }
    }

    this.pendingVotes.delete(conflict.id);

    return {
      strategy: ConflictResolutionStrategy.VOTING,
      winnerId: winner,
      votes: tally,
      explanation: `Agent ${winner} wins with ${maxVotes} votes`,
    };
  }

  /**
   * Submit a vote for a conflict
   */
  submitVote(conflictId: string, voterId: string, choice: string, weight: number = 1): boolean {
    const voteData = this.pendingVotes.get(conflictId);
    if (!voteData) return false;

    if (!voteData.request.voterIds.includes(voterId)) return false;
    if (voteData.votes.some(v => v.voterId === voterId)) return false;
    if (new Date() > voteData.request.deadline) return false;

    voteData.votes.push({
      conflictId,
      voterId,
      choice,
      timestamp: new Date(),
      weight,
    });

    return true;
  }

  /**
   * Arbitration resolution: external arbiter decides
   */
  private async resolveArbitration(conflict: Conflict): Promise<ConflictResolution> {
    // In production, this would call an external arbiter service
    // For now, use a deterministic selection based on conflict details
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(conflict))
      .digest('hex');

    const index = parseInt(hash.slice(0, 8), 16) % conflict.agents.length;
    const winner = conflict.agents[index]!;

    return {
      strategy: ConflictResolutionStrategy.ARBITRATION,
      winnerId: winner,
      arbiterId: 'system-arbiter',
      explanation: `Arbiter selected agent ${winner} based on conflict analysis`,
    };
  }

  /**
   * Rollback resolution: return to known good state
   */
  private resolveRollback(conflict: Conflict): ConflictResolution {
    const rollbackPoint = conflict.details.lastKnownGoodState as string | undefined;

    return {
      strategy: ConflictResolutionStrategy.ROLLBACK,
      rollbackPoint: rollbackPoint ?? 'initial',
      explanation: rollbackPoint
        ? `Rolling back to state: ${rollbackPoint}`
        : 'Rolling back to initial state',
    };
  }

  // ============================================
  // CONFLICT QUERIES
  // ============================================

  /**
   * Get conflict by ID
   */
  getConflict(id: string): Conflict | undefined {
    return this.conflicts.get(id);
  }

  /**
   * Get all conflicts for a session
   */
  getSessionConflicts(sessionId: string): Conflict[] {
    return Array.from(this.conflicts.values())
      .filter(c => c.sessionId === sessionId);
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(sessionId?: string): Conflict[] {
    let conflicts = Array.from(this.conflicts.values())
      .filter(c => !c.resolution);

    if (sessionId) {
      conflicts = conflicts.filter(c => c.sessionId === sessionId);
    }

    return conflicts;
  }

  /**
   * Get conflict statistics
   */
  getStats(): {
    total: number;
    resolved: number;
    failed: number;
    pending: number;
    byType: Record<ConflictType, number>;
    bySeverity: Record<string, number>;
  } {
    const conflicts = Array.from(this.conflicts.values());

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const conflict of conflicts) {
      byType[conflict.type] = (byType[conflict.type] ?? 0) + 1;
      bySeverity[conflict.severity] = (bySeverity[conflict.severity] ?? 0) + 1;
    }

    return {
      total: conflicts.length,
      resolved: this.resolvedCount,
      failed: this.failedCount,
      pending: conflicts.filter(c => !c.resolution).length,
      byType: byType as Record<ConflictType, number>,
      bySeverity,
    };
  }

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Register conflict handler for a type
   */
  onConflict(type: ConflictType, handler: ConflictHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);

    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify handlers of resolved conflict
   */
  private async notifyHandlers(conflict: Conflict): Promise<void> {
    const handlers = this.handlers.get(conflict.type) ?? [];
    for (const handler of handlers) {
      try {
        await handler(conflict);
      } catch (error) {
        console.error('Conflict handler error:', error);
      }
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Deep merge two objects
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(
          (result[key] as Record<string, unknown>) ?? {},
          value as Record<string, unknown>
        );
      } else if (Array.isArray(value)) {
        const existing = result[key];
        if (Array.isArray(existing)) {
          result[key] = [...new Set([...existing, ...value])];
        } else {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Clear resolved conflicts older than given age
   */
  cleanup(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, conflict] of this.conflicts.entries()) {
      if (conflict.resolvedAt && now - conflict.resolvedAt.getTime() > maxAgeMs) {
        this.conflicts.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Reset resolver
   */
  reset(): void {
    this.conflicts.clear();
    this.pendingVotes.clear();
    this.handlers.clear();
    this.resolvedCount = 0;
    this.failedCount = 0;
  }
}

// Singleton instance
export const conflictResolver = new ConflictResolver();
