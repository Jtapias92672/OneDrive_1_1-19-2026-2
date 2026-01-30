/**
 * FORGE MCP Gateway - Convergence Engine
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
 * @description Main orchestration engine for multi-agent convergence with
 *              CARS integration, behavioral verification, and audit logging.
 */

import * as crypto from 'crypto';
import {
  ConvergenceSession,
  ConvergenceState,
  ConvergenceGoal,
  ConvergenceConfig,
  ConvergenceMetrics,
  CoordinationPattern,
  ConflictType,
  ConvergenceHandler,
} from './types.js';
import { StateSynchronizer } from './state-synchronizer.js';
import { ConflictResolver } from './conflict-resolver.js';
import { HandoffProtocol } from './handoff-protocol.js';
import { CoordinationPatterns, PatternResult } from './coordination-patterns.js';

// ============================================
// CONVERGENCE ENGINE
// ============================================

export class ConvergenceEngine {
  private sessions: Map<string, ConvergenceSession> = new Map();
  private metrics: Map<string, ConvergenceMetrics[]> = new Map();
  private handlers: Set<ConvergenceHandler> = new Set();
  private config: ConvergenceConfig;

  // Sub-systems
  private synchronizer: StateSynchronizer;
  private conflictResolver: ConflictResolver;
  private handoffProtocol: HandoffProtocol;
  private patterns: CoordinationPatterns;

  // Statistics
  private sessionCount = 0;
  private convergedCount = 0;
  private failedCount = 0;

  constructor(config: Partial<ConvergenceConfig> = {}) {
    this.config = {
      defaultPattern: config.defaultPattern ?? CoordinationPattern.LEADER_FOLLOWER,
      defaultSyncStrategy: config.defaultSyncStrategy ?? 'delta-sync' as any,
      defaultConflictStrategy: config.defaultConflictStrategy ?? 'priority-based' as any,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 5000,
      syncIntervalMs: config.syncIntervalMs ?? 1000,
      convergenceCheckIntervalMs: config.convergenceCheckIntervalMs ?? 2000,
      maxConflictRetries: config.maxConflictRetries ?? 3,
      handoffTimeoutMs: config.handoffTimeoutMs ?? 30000,
      sessionTimeoutMs: config.sessionTimeoutMs ?? 300000,
      enableAuditLogging: config.enableAuditLogging ?? true,
      enableCARSIntegration: config.enableCARSIntegration ?? true,
      enableBehavioralVerification: config.enableBehavioralVerification ?? true,
    };

    this.synchronizer = new StateSynchronizer();
    this.conflictResolver = new ConflictResolver();
    this.handoffProtocol = new HandoffProtocol();
    this.patterns = new CoordinationPatterns();
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Create a new convergence session
   */
  createSession(
    name: string,
    agents: string[],
    goal: ConvergenceGoal,
    options: {
      pattern?: CoordinationPattern;
      leaderId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): ConvergenceSession {
    const id = `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const session: ConvergenceSession = {
      id,
      name,
      pattern: options.pattern ?? this.config.defaultPattern,
      state: ConvergenceState.INITIALIZING,
      agents,
      leaderId: options.leaderId,
      createdAt: new Date(),
      goal,
      currentPhase: 0,
      totalPhases: goal.successCriteria.length,
      stateVersion: 1,
      metadata: options.metadata,
    };

    this.sessions.set(id, session);
    this.metrics.set(id, []);
    this.sessionCount++;

    // Initialize state for all agents
    for (const agentId of agents) {
      this.synchronizer.initializeState(id, agentId, {
        phase: 0,
        progress: 0,
        status: 'ready',
      });
    }

    return session;
  }

  /**
   * Start a convergence session
   */
  async startSession(sessionId: string): Promise<ConvergenceSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.state !== ConvergenceState.INITIALIZING) {
      throw new Error(`Session ${sessionId} already started`);
    }

    session.state = ConvergenceState.COORDINATING;
    session.startedAt = new Date();

    // Start monitoring
    this.startMonitoring(sessionId);

    return session;
  }

  /**
   * Execute convergence for a session
   */
  async executeConvergence(
    sessionId: string,
    executionFn: (session: ConvergenceSession) => Promise<unknown>
  ): Promise<{
    session: ConvergenceSession;
    result: unknown;
    metrics: ConvergenceMetrics;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.state === ConvergenceState.INITIALIZING) {
      await this.startSession(sessionId);
    }

    session.state = ConvergenceState.EXECUTING;
    const startTime = Date.now();

    try {
      // Execute based on pattern
      let result: unknown;
      let patternResult: PatternResult | undefined;

      switch (session.pattern) {
        case CoordinationPattern.LEADER_FOLLOWER:
          patternResult = await this.patterns.executeLeaderFollower(
            session,
            async (leaderId, followerIds) => executionFn(session)
          );
          result = patternResult.output;
          break;

        case CoordinationPattern.PIPELINE:
          // Pipeline requires explicit stages
          result = await executionFn(session);
          break;

        case CoordinationPattern.PARALLEL_MERGE:
          // Parallel merge requires task distribution
          result = await executionFn(session);
          break;

        default:
          result = await executionFn(session);
      }

      // Synchronize state
      session.state = ConvergenceState.SYNCHRONIZING;
      await this.synchronizer.fullSync(sessionId);

      // Check convergence
      session.state = ConvergenceState.CONVERGING;
      const converged = await this.checkConvergence(sessionId);

      if (converged) {
        session.state = ConvergenceState.CONVERGED;
        session.completedAt = new Date();
        this.convergedCount++;
      } else {
        session.state = ConvergenceState.DIVERGED;
        session.completedAt = new Date();
      }

      // Record metrics
      const metrics = this.recordMetrics(sessionId, patternResult);

      // Notify handlers
      await this.notifyHandlers(session, metrics);

      return { session, result, metrics };

    } catch (error) {
      session.state = ConvergenceState.FAILED;
      session.completedAt = new Date();
      this.failedCount++;

      const metrics = this.recordMetrics(sessionId);
      throw error;
    }
  }

  /**
   * Check if session has converged
   */
  async checkConvergence(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    // Get all agent states
    const states = this.synchronizer.getSessionStates(sessionId);
    if (states.length === 0) return false;

    // Check if all agents have same state (simplified convergence check)
    const firstState = JSON.stringify(states[0]!.state);
    const allSame = states.every(s => JSON.stringify(s.state) === firstState);

    if (!allSame && session.goal.convergenceThreshold) {
      // Check if within threshold
      let matchCount = 1;
      for (let i = 1; i < states.length; i++) {
        if (JSON.stringify(states[i]!.state) === firstState) {
          matchCount++;
        }
      }
      const matchPercentage = (matchCount / states.length) * 100;
      return matchPercentage >= session.goal.convergenceThreshold;
    }

    return allSame;
  }

  /**
   * Complete a session
   */
  completeSession(sessionId: string, success: boolean = true): ConvergenceSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    session.state = success ? ConvergenceState.CONVERGED : ConvergenceState.FAILED;
    session.completedAt = new Date();

    if (success) {
      this.convergedCount++;
    } else {
      this.failedCount++;
    }

    // Cleanup
    this.patterns.clearSession(sessionId);

    return session;
  }

  // ============================================
  // PATTERN EXECUTION
  // ============================================

  /**
   * Execute leader-follower pattern
   */
  async executeLeaderFollower(
    sessionId: string,
    task: (leaderId: string, followerIds: string[]) => Promise<unknown>
  ): Promise<PatternResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return this.patterns.executeLeaderFollower(session, task);
  }

  /**
   * Execute consensus pattern
   */
  async executeConsensus(
    sessionId: string,
    proposals: Map<string, unknown>
  ): Promise<{ result: PatternResult; consensus: any }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return this.patterns.executeConsensus(session, proposals);
  }

  /**
   * Execute pipeline pattern
   */
  async executePipeline(
    sessionId: string,
    stages: Array<{ name: string; agentId: string }>,
    input: unknown
  ): Promise<PatternResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return this.patterns.executePipeline(session, stages, input);
  }

  /**
   * Execute parallel merge pattern
   */
  async executeParallelMerge(
    sessionId: string,
    taskDistribution: Map<string, unknown>,
    mergeFunction: (results: Map<string, unknown>) => unknown
  ): Promise<{ result: PatternResult; merge: any }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return this.patterns.executeParallelMerge(session, taskDistribution, mergeFunction);
  }

  // ============================================
  // CONFLICT HANDLING
  // ============================================

  /**
   * Handle a detected conflict
   */
  async handleConflict(
    sessionId: string,
    type: ConflictType,
    agents: string[],
    description: string,
    details: Record<string, unknown> = {}
  ): Promise<{ conflictId: string; resolution: any }> {
    const conflict = this.conflictResolver.detectConflict(
      sessionId,
      type,
      agents,
      description,
      details
    );

    // Get agent priorities from state
    const states = this.synchronizer.getSessionStates(sessionId);
    const priorities: Record<string, number> = {};
    const timestamps: Record<string, { version: number; timestamp: Date }> = {};

    for (const state of states) {
      priorities[state.agentId] = (state.state.priority as number) ?? 1;
      timestamps[state.agentId] = {
        version: state.version,
        timestamp: state.lastUpdated,
      };
    }

    const resolution = await this.conflictResolver.resolveConflict(
      conflict.id,
      priorities,
      timestamps
    );

    return { conflictId: conflict.id, resolution };
  }

  // ============================================
  // HANDOFF MANAGEMENT
  // ============================================

  /**
   * Request agent handoff
   */
  async requestHandoff(
    sessionId: string,
    sourceAgentId: string,
    reason: any,
    taskContext: any,
    options: { targetAgentId?: string; targetCapabilities?: string[] } = {}
  ): Promise<any> {
    const state = this.synchronizer.getState(sessionId, sourceAgentId);
    const stateSnapshot = state?.state ?? {};

    const request = await this.handoffProtocol.requestHandoff(
      sessionId,
      sourceAgentId,
      reason,
      taskContext,
      stateSnapshot,
      options
    );

    return this.handoffProtocol.executeHandoff(request.id);
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Update agent state
   */
  async updateAgentState(
    sessionId: string,
    agentId: string,
    changes: Record<string, unknown>
  ): Promise<void> {
    const update = this.synchronizer.createUpdate(sessionId, agentId, changes);
    await this.synchronizer.applyUpdate(update);

    // Update session version
    const session = this.sessions.get(sessionId);
    if (session) {
      session.stateVersion++;
    }
  }

  /**
   * Get merged session state
   */
  getSessionState(sessionId: string): Record<string, unknown> {
    return this.synchronizer.getMergedState(sessionId);
  }

  /**
   * Get agent state
   */
  getAgentState(sessionId: string, agentId: string): any {
    return this.synchronizer.getState(sessionId, agentId);
  }

  // ============================================
  // MONITORING
  // ============================================

  /**
   * Start session monitoring
   */
  private startMonitoring(sessionId: string): void {
    // In production, would set up intervals for:
    // - Heartbeat monitoring
    // - State synchronization
    // - Convergence checking
    // - Timeout detection
  }

  /**
   * Record convergence metrics
   */
  private recordMetrics(sessionId: string, patternResult?: PatternResult): ConvergenceMetrics {
    const session = this.sessions.get(sessionId);
    const states = this.synchronizer.getSessionStates(sessionId);
    const conflicts = this.conflictResolver.getSessionConflicts(sessionId);
    const handoffStats = this.handoffProtocol.getStats();

    // Calculate agreement percentage
    let agreement = 0;
    if (states.length > 0) {
      const firstState = JSON.stringify(states[0]!.state);
      const matching = states.filter(s => JSON.stringify(s.state) === firstState).length;
      agreement = (matching / states.length) * 100;
    }

    // Calculate convergence score
    const convergenceScore = this.calculateConvergenceScore(session, states, conflicts);

    const metrics: ConvergenceMetrics = {
      sessionId,
      iterationCount: patternResult?.iterations ?? session?.currentPhase ?? 0,
      convergenceScore,
      agentAgreement: agreement,
      conflictCount: conflicts.length,
      handoffCount: handoffStats.total,
      syncLatencyMs: 0, // Would be calculated from actual sync operations
      throughput: patternResult?.messages ?? 0,
      timestamp: new Date(),
    };

    // Store metrics
    const sessionMetrics = this.metrics.get(sessionId) ?? [];
    sessionMetrics.push(metrics);
    this.metrics.set(sessionId, sessionMetrics);

    return metrics;
  }

  /**
   * Calculate convergence score (0-100)
   */
  private calculateConvergenceScore(
    session: ConvergenceSession | undefined,
    states: any[],
    conflicts: any[]
  ): number {
    if (!session) return 0;

    let score = 0;

    // State agreement (40%)
    if (states.length > 0) {
      const firstState = JSON.stringify(states[0]!.state);
      const matching = states.filter(s => JSON.stringify(s.state) === firstState).length;
      score += (matching / states.length) * 40;
    }

    // Conflict resolution (30%)
    const resolvedConflicts = conflicts.filter(c => c.resolution).length;
    if (conflicts.length > 0) {
      score += (resolvedConflicts / conflicts.length) * 30;
    } else {
      score += 30; // No conflicts = full points
    }

    // Progress (30%)
    if (session.totalPhases > 0) {
      score += (session.currentPhase / session.totalPhases) * 30;
    }

    return Math.round(score * 10) / 10;
  }

  // ============================================
  // QUERIES
  // ============================================

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ConvergenceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all sessions
   */
  listSessions(options: {
    state?: ConvergenceState;
    pattern?: CoordinationPattern;
  } = {}): ConvergenceSession[] {
    let sessions = Array.from(this.sessions.values());

    if (options.state) {
      sessions = sessions.filter(s => s.state === options.state);
    }

    if (options.pattern) {
      sessions = sessions.filter(s => s.pattern === options.pattern);
    }

    return sessions;
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): ConvergenceMetrics[] {
    return this.metrics.get(sessionId) ?? [];
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    convergedSessions: number;
    failedSessions: number;
    conflictStats: any;
    handoffStats: any;
    averageConvergenceScore: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(
      s => s.state !== ConvergenceState.CONVERGED &&
           s.state !== ConvergenceState.FAILED &&
           s.state !== ConvergenceState.DIVERGED
    ).length;

    // Calculate average convergence score
    let totalScore = 0;
    let scoreCount = 0;
    for (const sessionMetrics of this.metrics.values()) {
      if (sessionMetrics.length > 0) {
        const lastMetrics = sessionMetrics[sessionMetrics.length - 1]!;
        totalScore += lastMetrics.convergenceScore;
        scoreCount++;
      }
    }

    return {
      totalSessions: this.sessionCount,
      activeSessions,
      convergedSessions: this.convergedCount,
      failedSessions: this.failedCount,
      conflictStats: this.conflictResolver.getStats(),
      handoffStats: this.handoffProtocol.getStats(),
      averageConvergenceScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0,
    };
  }

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Register convergence handler
   */
  onConvergence(handler: ConvergenceHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Notify handlers of convergence
   */
  private async notifyHandlers(
    session: ConvergenceSession,
    metrics: ConvergenceMetrics
  ): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(session, metrics);
      } catch (error) {
        console.error('Convergence handler error:', error);
      }
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Cleanup old sessions
   */
  cleanup(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (
        session.completedAt &&
        now - session.completedAt.getTime() > maxAgeMs
      ) {
        this.sessions.delete(id);
        this.metrics.delete(id);
        this.synchronizer.clearSession(id);
        this.patterns.clearSession(id);
        cleaned++;
      }
    }

    this.conflictResolver.cleanup(maxAgeMs);
    this.handoffProtocol.cleanup(maxAgeMs);

    return cleaned;
  }

  /**
   * Reset engine
   */
  reset(): void {
    this.sessions.clear();
    this.metrics.clear();
    this.handlers.clear();
    this.synchronizer.reset();
    this.conflictResolver.reset();
    this.handoffProtocol.reset();
    this.patterns.reset();
    this.sessionCount = 0;
    this.convergedCount = 0;
    this.failedCount = 0;
  }
}

// Singleton instance
export const convergenceEngine = new ConvergenceEngine();
