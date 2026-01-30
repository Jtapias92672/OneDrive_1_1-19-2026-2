/**
 * FORGE MCP Gateway - State Synchronizer
 *
 * @epic Epic 04 - Convergence Engine
 * @description Manages state synchronization across multiple agents using
 *              vector clocks for causality tracking and CRDT-inspired merging.
 */

import * as crypto from 'crypto';
import {
  AgentState,
  StateUpdate,
  StateDelta,
  SyncStrategy,
  StateUpdateHandler,
} from './types.js';

export interface SynchronizerConfig {
  strategy: SyncStrategy;
  conflictResolution: 'last-write-wins' | 'merge' | 'manual';
  maxVersionHistory: number;
  checksumAlgorithm: 'sha256' | 'md5';
}

export class StateSynchronizer {
  private states: Map<string, Map<string, AgentState>> = new Map();
  private versionHistory: Map<string, AgentState[]> = new Map();
  private handlers: Set<StateUpdateHandler> = new Set();
  private config: SynchronizerConfig;

  constructor(config: Partial<SynchronizerConfig> = {}) {
    this.config = {
      strategy: config.strategy ?? SyncStrategy.DELTA_SYNC,
      conflictResolution: config.conflictResolution ?? 'last-write-wins',
      maxVersionHistory: config.maxVersionHistory ?? 100,
      checksumAlgorithm: config.checksumAlgorithm ?? 'sha256',
    };
  }

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  /**
   * Initialize state for an agent in a session
   */
  initializeState(sessionId: string, agentId: string, initialState: Record<string, unknown> = {}): AgentState {
    if (!this.states.has(sessionId)) {
      this.states.set(sessionId, new Map());
    }

    const state: AgentState = {
      agentId,
      sessionId,
      state: { ...initialState },
      version: 1,
      vectorClock: { [agentId]: 1 },
      lastUpdated: new Date(),
      checksum: this.computeChecksum(initialState),
    };

    this.states.get(sessionId)!.set(agentId, state);
    this.recordVersion(sessionId, agentId, state);

    return state;
  }

  /**
   * Get current state for an agent
   */
  getState(sessionId: string, agentId: string): AgentState | undefined {
    return this.states.get(sessionId)?.get(agentId);
  }

  /**
   * Get all states for a session
   */
  getSessionStates(sessionId: string): AgentState[] {
    const sessionStates = this.states.get(sessionId);
    return sessionStates ? Array.from(sessionStates.values()) : [];
  }

  /**
   * Get merged state for entire session
   */
  getMergedState(sessionId: string): Record<string, unknown> {
    const states = this.getSessionStates(sessionId);
    if (states.length === 0) return {};

    // Merge all states, using vector clocks for conflict resolution
    const merged: Record<string, unknown> = {};
    const vectorClocks: Map<string, Record<string, number>> = new Map();

    for (const state of states) {
      for (const [key, value] of Object.entries(state.state)) {
        const existing = merged[key];
        if (existing === undefined) {
          merged[key] = value;
          vectorClocks.set(key, { ...state.vectorClock });
        } else {
          // Compare vector clocks to determine winner
          const existingClock = vectorClocks.get(key) || {};
          if (this.happensBefore(existingClock, state.vectorClock)) {
            merged[key] = value;
            vectorClocks.set(key, { ...state.vectorClock });
          }
        }
      }
    }

    return merged;
  }

  // ============================================
  // STATE UPDATES
  // ============================================

  /**
   * Apply an update to agent state
   */
  async applyUpdate(update: StateUpdate): Promise<AgentState> {
    const sessionStates = this.states.get(update.sessionId);
    if (!sessionStates) {
      throw new Error(`Session ${update.sessionId} not found`);
    }

    let state = sessionStates.get(update.agentId);
    if (!state) {
      state = this.initializeState(update.sessionId, update.agentId);
    }

    // Apply deltas
    for (const delta of update.updates) {
      this.applyDelta(state.state, delta);
    }

    // Update version and vector clock
    state.version = update.version;
    state.vectorClock = this.mergeVectorClocks(state.vectorClock, update.vectorClock);
    state.vectorClock[update.agentId] = (state.vectorClock[update.agentId] || 0) + 1;
    state.lastUpdated = update.timestamp;
    state.checksum = this.computeChecksum(state.state);

    // Record version history
    this.recordVersion(update.sessionId, update.agentId, state);

    // Notify handlers
    await this.notifyHandlers(update);

    return state;
  }

  /**
   * Create a state update from local changes
   */
  createUpdate(
    sessionId: string,
    agentId: string,
    changes: Record<string, unknown>
  ): StateUpdate {
    const state = this.getState(sessionId, agentId);
    if (!state) {
      throw new Error(`State not found for agent ${agentId} in session ${sessionId}`);
    }

    const deltas: StateDelta[] = [];
    for (const [path, value] of Object.entries(changes)) {
      const previousValue = this.getValueAtPath(state.state, path);
      deltas.push({
        path,
        operation: value === undefined ? 'delete' : 'set',
        value,
        previousValue,
      });
    }

    const newVersion = state.version + 1;
    const newClock = { ...state.vectorClock, [agentId]: (state.vectorClock[agentId] || 0) + 1 };

    return {
      sessionId,
      agentId,
      updates: deltas,
      version: newVersion,
      vectorClock: newClock,
      timestamp: new Date(),
    };
  }

  // ============================================
  // SYNCHRONIZATION
  // ============================================

  /**
   * Synchronize state between two agents
   */
  async syncStates(sessionId: string, sourceAgentId: string, targetAgentId: string): Promise<{
    sourceUpdates: StateDelta[];
    targetUpdates: StateDelta[];
    conflicts: Array<{ path: string; sourceValue: unknown; targetValue: unknown }>;
  }> {
    const sourceState = this.getState(sessionId, sourceAgentId);
    const targetState = this.getState(sessionId, targetAgentId);

    if (!sourceState || !targetState) {
      throw new Error('One or both agents not found in session');
    }

    const sourceUpdates: StateDelta[] = [];
    const targetUpdates: StateDelta[] = [];
    const conflicts: Array<{ path: string; sourceValue: unknown; targetValue: unknown }> = [];

    // Find differences
    const allKeys = new Set([
      ...Object.keys(sourceState.state),
      ...Object.keys(targetState.state),
    ]);

    for (const key of allKeys) {
      const sourceValue = sourceState.state[key];
      const targetValue = targetState.state[key];

      if (JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
        // Determine which is newer using vector clocks
        const sourceClock = sourceState.vectorClock;
        const targetClock = targetState.vectorClock;

        if (this.happensBefore(sourceClock, targetClock)) {
          // Target is newer
          sourceUpdates.push({ path: key, operation: 'set', value: targetValue, previousValue: sourceValue });
        } else if (this.happensBefore(targetClock, sourceClock)) {
          // Source is newer
          targetUpdates.push({ path: key, operation: 'set', value: sourceValue, previousValue: targetValue });
        } else {
          // Concurrent updates - conflict
          conflicts.push({ path: key, sourceValue, targetValue });
        }
      }
    }

    return { sourceUpdates, targetUpdates, conflicts };
  }

  /**
   * Perform full state sync for a session
   */
  async fullSync(sessionId: string): Promise<{
    syncedAgents: string[];
    conflictCount: number;
    updateCount: number;
  }> {
    const states = this.getSessionStates(sessionId);
    if (states.length < 2) {
      return { syncedAgents: states.map(s => s.agentId), conflictCount: 0, updateCount: 0 };
    }

    const mergedState = this.getMergedState(sessionId);
    const syncedAgents: string[] = [];
    let conflictCount = 0;
    let updateCount = 0;

    for (const state of states) {
      const deltas: StateDelta[] = [];

      for (const [key, value] of Object.entries(mergedState)) {
        if (JSON.stringify(state.state[key]) !== JSON.stringify(value)) {
          deltas.push({
            path: key,
            operation: 'set',
            value,
            previousValue: state.state[key],
          });
          updateCount++;
        }
      }

      if (deltas.length > 0) {
        const update: StateUpdate = {
          sessionId,
          agentId: state.agentId,
          updates: deltas,
          version: state.version + 1,
          vectorClock: this.incrementClock(state.vectorClock, state.agentId),
          timestamp: new Date(),
        };

        await this.applyUpdate(update);
      }

      syncedAgents.push(state.agentId);
    }

    return { syncedAgents, conflictCount, updateCount };
  }

  // ============================================
  // VECTOR CLOCK OPERATIONS
  // ============================================

  /**
   * Check if clock1 happens before clock2
   */
  private happensBefore(clock1: Record<string, number>, clock2: Record<string, number>): boolean {
    let atLeastOneLess = false;

    for (const [agent, time] of Object.entries(clock2)) {
      const time1 = clock1[agent] || 0;
      if (time1 > time) {
        return false; // clock1 has a larger component
      }
      if (time1 < time) {
        atLeastOneLess = true;
      }
    }

    // Check for agents only in clock1
    for (const [agent, time] of Object.entries(clock1)) {
      if (!(agent in clock2) && time > 0) {
        return false;
      }
    }

    return atLeastOneLess;
  }

  /**
   * Merge two vector clocks
   */
  private mergeVectorClocks(
    clock1: Record<string, number>,
    clock2: Record<string, number>
  ): Record<string, number> {
    const merged: Record<string, number> = { ...clock1 };

    for (const [agent, time] of Object.entries(clock2)) {
      merged[agent] = Math.max(merged[agent] || 0, time);
    }

    return merged;
  }

  /**
   * Increment vector clock for an agent
   */
  private incrementClock(clock: Record<string, number>, agentId: string): Record<string, number> {
    return {
      ...clock,
      [agentId]: (clock[agentId] || 0) + 1,
    };
  }

  // ============================================
  // DELTA OPERATIONS
  // ============================================

  /**
   * Apply a single delta to state object
   */
  private applyDelta(state: Record<string, unknown>, delta: StateDelta): void {
    const pathParts = delta.path.split('.');

    if (pathParts.length === 1) {
      // Top-level operation
      switch (delta.operation) {
        case 'set':
          state[delta.path] = delta.value;
          break;
        case 'delete':
          delete state[delta.path];
          break;
        case 'increment':
          state[delta.path] = ((state[delta.path] as number) || 0) + (delta.value as number || 1);
          break;
        case 'append':
          if (!Array.isArray(state[delta.path])) {
            state[delta.path] = [];
          }
          (state[delta.path] as unknown[]).push(delta.value);
          break;
        case 'merge':
          state[delta.path] = { ...(state[delta.path] as object || {}), ...(delta.value as object) };
          break;
      }
    } else {
      // Nested operation
      let current = state as Record<string, unknown>;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!(pathParts[i]! in current)) {
          current[pathParts[i]!] = {};
        }
        current = current[pathParts[i]!] as Record<string, unknown>;
      }

      const lastPart = pathParts[pathParts.length - 1]!;
      switch (delta.operation) {
        case 'set':
          current[lastPart] = delta.value;
          break;
        case 'delete':
          delete current[lastPart];
          break;
        case 'increment':
          current[lastPart] = ((current[lastPart] as number) || 0) + (delta.value as number || 1);
          break;
        case 'append':
          if (!Array.isArray(current[lastPart])) {
            current[lastPart] = [];
          }
          (current[lastPart] as unknown[]).push(delta.value);
          break;
        case 'merge':
          current[lastPart] = { ...(current[lastPart] as object || {}), ...(delta.value as object) };
          break;
      }
    }
  }

  /**
   * Get value at a path in state
   */
  private getValueAtPath(state: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = state;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  // ============================================
  // VERSION HISTORY
  // ============================================

  /**
   * Record a state version for history
   */
  private recordVersion(sessionId: string, agentId: string, state: AgentState): void {
    const key = `${sessionId}:${agentId}`;
    if (!this.versionHistory.has(key)) {
      this.versionHistory.set(key, []);
    }

    const history = this.versionHistory.get(key)!;
    history.push({ ...state, state: { ...state.state } });

    // Trim history if needed
    while (history.length > this.config.maxVersionHistory) {
      history.shift();
    }
  }

  /**
   * Get version history for an agent
   */
  getVersionHistory(sessionId: string, agentId: string): AgentState[] {
    const key = `${sessionId}:${agentId}`;
    return this.versionHistory.get(key) || [];
  }

  /**
   * Rollback to a specific version
   */
  rollbackToVersion(sessionId: string, agentId: string, version: number): AgentState | undefined {
    const history = this.getVersionHistory(sessionId, agentId);
    const targetState = history.find(s => s.version === version);

    if (targetState) {
      const sessionStates = this.states.get(sessionId);
      if (sessionStates) {
        const rolledBack: AgentState = {
          ...targetState,
          version: targetState.version,
          lastUpdated: new Date(),
          checksum: this.computeChecksum(targetState.state),
        };
        sessionStates.set(agentId, rolledBack);
        return rolledBack;
      }
    }

    return undefined;
  }

  // ============================================
  // HANDLERS
  // ============================================

  /**
   * Register update handler
   */
  onStateUpdate(handler: StateUpdateHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Notify all handlers of update
   */
  private async notifyHandlers(update: StateUpdate): Promise<void> {
    for (const handler of this.handlers) {
      try {
        await handler(update);
      } catch (error) {
        console.error('State update handler error:', error);
      }
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Compute checksum for state
   */
  private computeChecksum(state: Record<string, unknown>): string {
    const content = JSON.stringify(state, Object.keys(state).sort());
    return crypto.createHash(this.config.checksumAlgorithm).update(content).digest('hex');
  }

  /**
   * Verify state checksum
   */
  verifyChecksum(state: AgentState): boolean {
    const computed = this.computeChecksum(state.state);
    return computed === state.checksum;
  }

  /**
   * Clear all state for a session
   */
  clearSession(sessionId: string): void {
    this.states.delete(sessionId);

    // Clear version history for all agents in session
    for (const key of this.versionHistory.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.versionHistory.delete(key);
      }
    }
  }

  /**
   * Reset synchronizer
   */
  reset(): void {
    this.states.clear();
    this.versionHistory.clear();
    this.handlers.clear();
  }
}

// Singleton instance
export const stateSynchronizer = new StateSynchronizer();
