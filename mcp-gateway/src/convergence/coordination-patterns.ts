/**
 * FORGE MCP Gateway - Coordination Patterns
 *
 * @epic Epic 04 - Convergence Engine
 * @description Multi-agent coordination patterns for various collaboration scenarios.
 *
 * ============================================================================
 * WARNING: SIMULATION FRAMEWORK - NOT FOR PRODUCTION
 * ============================================================================
 *
 * This module provides SIMULATED coordination patterns for testing and demos.
 * Key limitations:
 *
 * - Message delivery is in-memory only (no network transport)
 * - Pipeline execution returns hardcoded outputs
 * - Parallel execution runs synchronously
 * - Competitive scoring uses Math.random()
 * - Consensus is simplified voting (not Raft/Paxos)
 *
 * For production multi-agent coordination, see docs/ROADMAP.md
 * ============================================================================
 */

import * as crypto from 'crypto';
import {
  CoordinationPattern,
  ConvergenceSession,
  ConvergenceState,
  CoordinationMessage,
  MessageType,
  MessageHandler,
} from './types.js';

// ============================================
// INTERFACES
// ============================================

export interface PatternConfig {
  maxAgents: number;
  timeoutMs: number;
  requireQuorum: boolean;
  quorumPercentage: number;
}

export interface PatternResult {
  success: boolean;
  output: unknown;
  participatingAgents: string[];
  duration: number;
  iterations: number;
  messages: number;
}

export interface LeaderElectionResult {
  leaderId: string;
  term: number;
  timestamp: Date;
}

export interface ConsensusResult {
  achieved: boolean;
  value: unknown;
  agreementPercentage: number;
  votes: Record<string, unknown>;
}

export interface PipelineStage {
  name: string;
  agentId: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  timeout?: number;
}

export interface MergeResult {
  merged: unknown;
  sources: string[];
  conflicts: Array<{ path: string; values: unknown[] }>;
}

// ============================================
// COORDINATION PATTERNS MANAGER
// ============================================

export class CoordinationPatterns {
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private messageQueue: Map<string, CoordinationMessage[]> = new Map();
  private leaders: Map<string, LeaderElectionResult> = new Map();
  private config: PatternConfig;

  constructor(config: Partial<PatternConfig> = {}) {
    this.config = {
      maxAgents: config.maxAgents ?? 10,
      timeoutMs: config.timeoutMs ?? 60000,
      requireQuorum: config.requireQuorum ?? true,
      quorumPercentage: config.quorumPercentage ?? 51,
    };
  }

  // ============================================
  // LEADER-FOLLOWER PATTERN
  // ============================================

  /**
   * Execute leader-follower coordination
   */
  async executeLeaderFollower(
    session: ConvergenceSession,
    task: (leaderId: string, followerIds: string[]) => Promise<unknown>
  ): Promise<PatternResult> {
    const startTime = Date.now();
    let messageCount = 0;

    // Elect leader if not already set
    if (!session.leaderId) {
      const election = await this.electLeader(session.id, session.agents);
      session.leaderId = election.leaderId;
      messageCount += session.agents.length; // Election messages
    }

    const leaderId = session.leaderId!;
    const followerIds = session.agents.filter(a => a !== leaderId);

    // Notify followers
    for (const followerId of followerIds) {
      await this.sendMessage(session.id, leaderId, [followerId], 'state_update', {
        type: 'leader_assigned',
        leaderId,
      });
      messageCount++;
    }

    // Execute task
    const output = await task(leaderId, followerIds);

    return {
      success: true,
      output,
      participatingAgents: session.agents,
      duration: Date.now() - startTime,
      iterations: 1,
      messages: messageCount,
    };
  }

  /**
   * Elect a leader using Bully algorithm variant
   */
  async electLeader(sessionId: string, agents: string[]): Promise<LeaderElectionResult> {
    // Use highest priority (last in sorted list) as leader
    const sortedAgents = [...agents].sort();
    const leaderId = sortedAgents[sortedAgents.length - 1]!;
    const term = Date.now();

    const result: LeaderElectionResult = {
      leaderId,
      term,
      timestamp: new Date(),
    };

    this.leaders.set(sessionId, result);

    // Broadcast election result
    await this.sendMessage(sessionId, leaderId, 'broadcast', 'leader_election', result);

    return result;
  }

  /**
   * Get current leader for session
   */
  getLeader(sessionId: string): LeaderElectionResult | undefined {
    return this.leaders.get(sessionId);
  }

  // ============================================
  // CONSENSUS PATTERN (SIMULATION)
  // ============================================

  /**
   * SIMULATION: Execute consensus-based coordination
   * This is simplified voting, NOT production-ready Raft/Paxos consensus.
   */
  async executeConsensus(
    session: ConvergenceSession,
    proposals: Map<string, unknown>,
    maxRounds: number = 3
  ): Promise<{ result: PatternResult; consensus: ConsensusResult }> {
    const startTime = Date.now();
    let messageCount = 0;
    let round = 0;

    const votes: Record<string, unknown> = {};
    let consensusValue: unknown = null;
    let achieved = false;

    while (round < maxRounds && !achieved) {
      round++;

      // Collect votes for this round
      for (const [agentId, proposal] of proposals.entries()) {
        votes[agentId] = proposal;
        messageCount++;
      }

      // Count votes
      const valueCounts: Map<string, { count: number; value: unknown }> = new Map();
      for (const [agentId, value] of Object.entries(votes)) {
        const key = JSON.stringify(value);
        const existing = valueCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          valueCounts.set(key, { count: 1, value });
        }
      }

      // Check for consensus
      const totalVotes = Object.keys(votes).length;
      const requiredVotes = Math.ceil(totalVotes * (this.config.quorumPercentage / 100));

      for (const [key, data] of valueCounts.entries()) {
        if (data.count >= requiredVotes) {
          consensusValue = data.value;
          achieved = true;
          break;
        }
      }

      if (!achieved) {
        // Broadcast current state for next round
        await this.sendMessage(session.id, 'system', 'broadcast', 'vote_request', {
          round,
          currentVotes: votes,
        });
        messageCount += session.agents.length;
      }
    }

    const agreementPercentage = achieved
      ? (Object.values(votes).filter(v => JSON.stringify(v) === JSON.stringify(consensusValue)).length / Object.keys(votes).length) * 100
      : 0;

    const consensus: ConsensusResult = {
      achieved,
      value: consensusValue,
      agreementPercentage,
      votes,
    };

    return {
      result: {
        success: achieved,
        output: consensusValue,
        participatingAgents: session.agents,
        duration: Date.now() - startTime,
        iterations: round,
        messages: messageCount,
      },
      consensus,
    };
  }

  // ============================================
  // PIPELINE PATTERN (SIMULATION)
  // ============================================

  /**
   * SIMULATION: Execute pipeline coordination
   * Uses simulateStageExecution instead of real agent dispatch.
   */
  async executePipeline(
    session: ConvergenceSession,
    stages: PipelineStage[],
    initialInput: unknown
  ): Promise<PatternResult> {
    const startTime = Date.now();
    let messageCount = 0;
    let currentInput = initialInput;
    const participatingAgents: string[] = [];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]!;
      session.currentPhase = i + 1;

      // Notify stage agent
      await this.sendMessage(session.id, 'orchestrator', [stage.agentId], 'state_update', {
        type: 'pipeline_stage',
        stage: stage.name,
        input: currentInput,
      });
      messageCount++;

      participatingAgents.push(stage.agentId);

      // Simulate stage execution (in real implementation, would wait for agent response)
      const stageOutput = await this.simulateStageExecution(stage, currentInput);

      // Send phase complete
      await this.sendMessage(session.id, stage.agentId, 'broadcast', 'phase_complete', {
        stage: stage.name,
        output: stageOutput,
      });
      messageCount++;

      currentInput = stageOutput;
    }

    return {
      success: true,
      output: currentInput,
      participatingAgents: [...new Set(participatingAgents)],
      duration: Date.now() - startTime,
      iterations: stages.length,
      messages: messageCount,
    };
  }

  /**
   * SIMULATION: Simulate stage execution (placeholder for real agent execution)
   * In production, this would dispatch to actual agent processes via message queue.
   */
  private async simulateStageExecution(stage: PipelineStage, input: unknown): Promise<unknown> {
    // SIMULATION: Returns hardcoded output instead of real agent processing
    // Production would: send message to agent queue, await response, handle timeout
    return {
      stageName: stage.name,
      processedBy: stage.agentId,
      input,
      output: `Processed by ${stage.name}`, // SIMULATION: Hardcoded output
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // PARALLEL MERGE PATTERN (SIMULATION)
  // ============================================

  /**
   * SIMULATION: Execute parallel merge coordination
   * Uses simulateParallelExecution instead of distributed workers.
   */
  async executeParallelMerge(
    session: ConvergenceSession,
    taskDistribution: Map<string, unknown>,
    mergeFunction: (results: Map<string, unknown>) => unknown
  ): Promise<{ result: PatternResult; merge: MergeResult }> {
    const startTime = Date.now();
    let messageCount = 0;

    // Distribute tasks to agents
    const results: Map<string, unknown> = new Map();

    for (const [agentId, task] of taskDistribution.entries()) {
      await this.sendMessage(session.id, 'orchestrator', [agentId], 'state_update', {
        type: 'parallel_task',
        task,
      });
      messageCount++;

      // Simulate parallel execution
      const result = await this.simulateParallelExecution(agentId, task);
      results.set(agentId, result);
    }

    // Merge results
    const merged = mergeFunction(results);

    // Detect conflicts
    const conflicts = this.detectMergeConflicts(results);

    // Broadcast merged result
    await this.sendMessage(session.id, 'orchestrator', 'broadcast', 'state_update', {
      type: 'merge_complete',
      merged,
    });
    messageCount++;

    const mergeResult: MergeResult = {
      merged,
      sources: Array.from(results.keys()),
      conflicts,
    };

    return {
      result: {
        success: true,
        output: merged,
        participatingAgents: session.agents,
        duration: Date.now() - startTime,
        iterations: 1,
        messages: messageCount,
      },
      merge: mergeResult,
    };
  }

  /**
   * SIMULATION: Simulate parallel execution
   * In production, this would dispatch tasks to multiple agents concurrently.
   */
  private async simulateParallelExecution(agentId: string, task: unknown): Promise<unknown> {
    // SIMULATION: Returns immediately with hardcoded result
    // Production would: distribute to workers, collect results, handle failures
    return {
      agentId,
      task,
      result: `Result from ${agentId}`, // SIMULATION: Hardcoded result
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detect conflicts in merge results
   */
  private detectMergeConflicts(
    results: Map<string, unknown>
  ): Array<{ path: string; values: unknown[] }> {
    const conflicts: Array<{ path: string; values: unknown[] }> = [];
    const pathValues: Map<string, unknown[]> = new Map();

    for (const [agentId, result] of results.entries()) {
      if (result && typeof result === 'object') {
        this.extractPaths(result as Record<string, unknown>, '', pathValues);
      }
    }

    for (const [path, values] of pathValues.entries()) {
      const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];
      if (uniqueValues.length > 1) {
        conflicts.push({ path, values });
      }
    }

    return conflicts;
  }

  /**
   * Extract all paths from an object
   */
  private extractPaths(
    obj: Record<string, unknown>,
    prefix: string,
    pathValues: Map<string, unknown[]>
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.extractPaths(value as Record<string, unknown>, path, pathValues);
      } else {
        if (!pathValues.has(path)) {
          pathValues.set(path, []);
        }
        pathValues.get(path)!.push(value);
      }
    }
  }

  // ============================================
  // COMPETITIVE PATTERN (SIMULATION)
  // ============================================

  /**
   * SIMULATION: Execute competitive coordination (best result wins)
   * Uses Math.random() for scoring instead of real agent evaluation.
   */
  async executeCompetitive(
    session: ConvergenceSession,
    task: unknown,
    scoreFunction: (result: unknown, agentId: string) => number
  ): Promise<PatternResult> {
    const startTime = Date.now();
    let messageCount = 0;

    // Distribute same task to all agents
    const results: Map<string, { result: unknown; score: number }> = new Map();

    for (const agentId of session.agents) {
      await this.sendMessage(session.id, 'orchestrator', [agentId], 'state_update', {
        type: 'competitive_task',
        task,
      });
      messageCount++;

      // Simulate competitive execution
      const result = await this.simulateCompetitiveExecution(agentId, task);
      const score = scoreFunction(result, agentId);
      results.set(agentId, { result, score });
    }

    // Find winner (highest score)
    let winner = session.agents[0]!;
    let highestScore = -Infinity;

    for (const [agentId, data] of results.entries()) {
      if (data.score > highestScore) {
        highestScore = data.score;
        winner = agentId;
      }
    }

    const winningResult = results.get(winner)!.result;

    // Broadcast winner
    await this.sendMessage(session.id, 'orchestrator', 'broadcast', 'state_update', {
      type: 'competition_winner',
      winner,
      score: highestScore,
      result: winningResult,
    });
    messageCount++;

    return {
      success: true,
      output: { winner, result: winningResult, score: highestScore },
      participatingAgents: session.agents,
      duration: Date.now() - startTime,
      iterations: 1,
      messages: messageCount,
    };
  }

  /**
   * SIMULATION: Simulate competitive execution
   * In production, this would have agents compete on actual task quality.
   */
  private async simulateCompetitiveExecution(agentId: string, task: unknown): Promise<unknown> {
    // SIMULATION: Uses Math.random() for quality instead of real evaluation
    // Production would: execute real agent logic, evaluate output quality
    return {
      agentId,
      task,
      solution: `Solution from ${agentId}`, // SIMULATION: Hardcoded solution
      quality: Math.random() * 100, // SIMULATION: Random quality score
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================
  // MESSAGING (SIMULATION)
  // ============================================

  /**
   * SIMULATION: Send coordination message
   * In production, this would use a real message broker (Redis, Kafka, etc.)
   */
  async sendMessage(
    sessionId: string,
    senderId: string,
    recipientIds: string[] | 'broadcast',
    type: MessageType,
    payload: unknown
  ): Promise<CoordinationMessage> {
    const message: CoordinationMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      sessionId,
      type,
      senderId,
      recipientIds,
      payload,
      timestamp: new Date(),
      requiresAck: false,
    };

    // Queue message
    if (!this.messageQueue.has(sessionId)) {
      this.messageQueue.set(sessionId, []);
    }
    this.messageQueue.get(sessionId)!.push(message);

    // Notify handlers
    const handlers = this.messageHandlers.get(sessionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (error) {
          console.error('Message handler error:', error);
        }
      }
    }

    return message;
  }

  /**
   * Register message handler
   */
  onMessage(sessionId: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(sessionId)) {
      this.messageHandlers.set(sessionId, new Set());
    }
    this.messageHandlers.get(sessionId)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(sessionId);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Get message history for session
   */
  getMessages(sessionId: string): CoordinationMessage[] {
    return this.messageQueue.get(sessionId) ?? [];
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Clear session data
   */
  clearSession(sessionId: string): void {
    this.messageQueue.delete(sessionId);
    this.messageHandlers.delete(sessionId);
    this.leaders.delete(sessionId);
  }

  /**
   * Reset patterns
   */
  reset(): void {
    this.messageQueue.clear();
    this.messageHandlers.clear();
    this.leaders.clear();
  }
}

// Singleton instance
export const coordinationPatterns = new CoordinationPatterns();
