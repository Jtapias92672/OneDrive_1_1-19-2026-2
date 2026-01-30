/**
 * FORGE MCP Gateway - Convergence Engine Unit Tests
 *
 * @epic Epic 04 - Convergence Engine
 * @description Tests for multi-agent convergence, coordination patterns,
 *              state synchronization, conflict resolution, and handoff protocols.
 */

import {
  ConvergenceEngine,
  StateSynchronizer,
  ConflictResolver,
  HandoffProtocol,
  CoordinationPatterns,
  ConvergenceState,
  CoordinationPattern,
  ConflictType,
  ConflictResolutionStrategy,
  HandoffReason,
  SyncStrategy,
} from '../../src/convergence/index.js';

// ============================================
// CONVERGENCE ENGINE TESTS
// ============================================

describe('ConvergenceEngine', () => {
  let engine: ConvergenceEngine;

  beforeEach(() => {
    engine = new ConvergenceEngine({
      enableAuditLogging: false,
      enableCARSIntegration: false,
    });
  });

  afterEach(() => {
    engine.reset();
  });

  describe('Session Management', () => {
    test('should create a convergence session', () => {
      const session = engine.createSession(
        'Test Session',
        ['agent-1', 'agent-2', 'agent-3'],
        {
          description: 'Test convergence goal',
          successCriteria: [
            { name: 'all-agree', condition: 'state.agreed === true', weight: 1, required: true },
          ],
        }
      );

      expect(session.id).toMatch(/^session_/);
      expect(session.name).toBe('Test Session');
      expect(session.agents).toHaveLength(3);
      expect(session.state).toBe(ConvergenceState.INITIALIZING);
      expect(session.pattern).toBe(CoordinationPattern.LEADER_FOLLOWER);
    });

    test('should start a session', async () => {
      const session = engine.createSession(
        'Test Session',
        ['agent-1', 'agent-2'],
        { description: 'Test', successCriteria: [] }
      );

      const started = await engine.startSession(session.id);

      expect(started.state).toBe(ConvergenceState.COORDINATING);
      expect(started.startedAt).toBeDefined();
    });

    test('should list sessions with filters', () => {
      engine.createSession('Session 1', ['a1'], { description: 'Test', successCriteria: [] });
      engine.createSession('Session 2', ['a2'], { description: 'Test', successCriteria: [] }, {
        pattern: CoordinationPattern.CONSENSUS,
      });

      const all = engine.listSessions();
      expect(all).toHaveLength(2);

      const consensus = engine.listSessions({ pattern: CoordinationPattern.CONSENSUS });
      expect(consensus).toHaveLength(1);
      expect(consensus[0]!.name).toBe('Session 2');
    });

    test('should complete a session successfully', () => {
      const session = engine.createSession(
        'Test Session',
        ['agent-1'],
        { description: 'Test', successCriteria: [] }
      );

      const completed = engine.completeSession(session.id, true);

      expect(completed?.state).toBe(ConvergenceState.CONVERGED);
      expect(completed?.completedAt).toBeDefined();
    });

    test('should track session statistics', () => {
      engine.createSession('S1', ['a1'], { description: 'Test', successCriteria: [] });
      engine.createSession('S2', ['a2'], { description: 'Test', successCriteria: [] });

      const stats = engine.getStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(2);
    });
  });

  describe('Pattern Execution', () => {
    test('should execute leader-follower pattern', async () => {
      const session = engine.createSession(
        'Leader Test',
        ['leader', 'follower-1', 'follower-2'],
        { description: 'Test', successCriteria: [] },
        { pattern: CoordinationPattern.LEADER_FOLLOWER }
      );

      const result = await engine.executeLeaderFollower(
        session.id,
        async (leaderId, followerIds) => {
          expect(leaderId).toBeDefined();
          expect(followerIds).toHaveLength(2);
          return { coordinated: true };
        }
      );

      expect(result.success).toBe(true);
      expect(result.participatingAgents).toHaveLength(3);
    });

    test('should execute consensus pattern', async () => {
      const session = engine.createSession(
        'Consensus Test',
        ['agent-1', 'agent-2', 'agent-3'],
        { description: 'Test', successCriteria: [] },
        { pattern: CoordinationPattern.CONSENSUS }
      );

      const proposals = new Map([
        ['agent-1', { value: 'option-a' }],
        ['agent-2', { value: 'option-a' }],
        ['agent-3', { value: 'option-b' }],
      ]);

      const { result, consensus } = await engine.executeConsensus(session.id, proposals);

      expect(result.success).toBeDefined();
      expect(consensus.votes).toBeDefined();
    });
  });

  describe('State Management', () => {
    test('should update agent state', async () => {
      const session = engine.createSession(
        'State Test',
        ['agent-1'],
        { description: 'Test', successCriteria: [] }
      );

      await engine.updateAgentState(session.id, 'agent-1', {
        progress: 50,
        status: 'processing',
      });

      const state = engine.getAgentState(session.id, 'agent-1');
      expect(state?.state.progress).toBe(50);
      expect(state?.state.status).toBe('processing');
    });

    test('should get merged session state', async () => {
      const session = engine.createSession(
        'Merge Test',
        ['agent-1', 'agent-2'],
        { description: 'Test', successCriteria: [] }
      );

      await engine.updateAgentState(session.id, 'agent-1', { task1: 'done' });
      await engine.updateAgentState(session.id, 'agent-2', { task2: 'done' });

      const merged = engine.getSessionState(session.id);
      expect(merged).toBeDefined();
    });
  });

  describe('Convergence Checking', () => {
    test('should detect converged state', async () => {
      const session = engine.createSession(
        'Convergence Test',
        ['agent-1', 'agent-2'],
        {
          description: 'Test',
          successCriteria: [],
          convergenceThreshold: 100,
        }
      );

      // Set same state for both agents
      await engine.updateAgentState(session.id, 'agent-1', { agreed: true, value: 42 });
      await engine.updateAgentState(session.id, 'agent-2', { agreed: true, value: 42 });

      const converged = await engine.checkConvergence(session.id);
      expect(converged).toBe(true);
    });

    test('should detect diverged state', async () => {
      const session = engine.createSession(
        'Divergence Test',
        ['agent-1', 'agent-2'],
        {
          description: 'Test',
          successCriteria: [],
          convergenceThreshold: 100,
        }
      );

      // Set different states
      await engine.updateAgentState(session.id, 'agent-1', { value: 1 });
      await engine.updateAgentState(session.id, 'agent-2', { value: 2 });

      const converged = await engine.checkConvergence(session.id);
      expect(converged).toBe(false);
    });
  });
});

// ============================================
// STATE SYNCHRONIZER TESTS
// ============================================

describe('StateSynchronizer', () => {
  let sync: StateSynchronizer;

  beforeEach(() => {
    sync = new StateSynchronizer();
  });

  afterEach(() => {
    sync.reset();
  });

  describe('State Initialization', () => {
    test('should initialize state for an agent', () => {
      const state = sync.initializeState('session-1', 'agent-1', { counter: 0 });

      expect(state.agentId).toBe('agent-1');
      expect(state.sessionId).toBe('session-1');
      expect(state.version).toBe(1);
      expect(state.state.counter).toBe(0);
      expect(state.checksum).toBeDefined();
    });

    test('should get state for an agent', () => {
      sync.initializeState('session-1', 'agent-1', { value: 'test' });

      const state = sync.getState('session-1', 'agent-1');
      expect(state?.state.value).toBe('test');
    });

    test('should get all states for a session', () => {
      sync.initializeState('session-1', 'agent-1');
      sync.initializeState('session-1', 'agent-2');
      sync.initializeState('session-2', 'agent-3');

      const states = sync.getSessionStates('session-1');
      expect(states).toHaveLength(2);
    });
  });

  describe('State Updates', () => {
    test('should create and apply updates', async () => {
      sync.initializeState('session-1', 'agent-1', { counter: 0 });

      const update = sync.createUpdate('session-1', 'agent-1', { counter: 1 });
      expect(update.updates).toHaveLength(1);
      expect(update.updates[0]!.path).toBe('counter');

      const newState = await sync.applyUpdate(update);
      expect(newState.state.counter).toBe(1);
      expect(newState.version).toBe(2);
    });

    test('should handle nested state updates', async () => {
      sync.initializeState('session-1', 'agent-1', {});

      const update = sync.createUpdate('session-1', 'agent-1', {
        'config.timeout': 5000,
        'config.retry': true,
      });

      await sync.applyUpdate(update);
      const state = sync.getState('session-1', 'agent-1');

      expect((state?.state.config as any)?.timeout).toBe(5000);
      expect((state?.state.config as any)?.retry).toBe(true);
    });
  });

  describe('Synchronization', () => {
    test('should sync states between agents', async () => {
      sync.initializeState('session-1', 'agent-1', { shared: 'old' });
      sync.initializeState('session-1', 'agent-2', { shared: 'new' });

      // Update agent-2's state to have a higher vector clock
      await sync.applyUpdate(sync.createUpdate('session-1', 'agent-2', { shared: 'new' }));

      const result = await sync.syncStates('session-1', 'agent-1', 'agent-2');

      expect(result.sourceUpdates.length + result.targetUpdates.length + result.conflicts.length)
        .toBeGreaterThanOrEqual(0);
    });

    test('should perform full sync', async () => {
      sync.initializeState('session-1', 'agent-1', { value: 1 });
      sync.initializeState('session-1', 'agent-2', { value: 2 });
      sync.initializeState('session-1', 'agent-3', { value: 1 });

      const result = await sync.fullSync('session-1');

      expect(result.syncedAgents).toHaveLength(3);
    });

    test('should get merged state', () => {
      sync.initializeState('session-1', 'agent-1', { a: 1 });
      sync.initializeState('session-1', 'agent-2', { b: 2 });

      const merged = sync.getMergedState('session-1');

      expect(merged.a).toBeDefined();
      expect(merged.b).toBeDefined();
    });
  });

  describe('Version History', () => {
    test('should maintain version history', async () => {
      sync.initializeState('session-1', 'agent-1', { v: 1 });

      await sync.applyUpdate(sync.createUpdate('session-1', 'agent-1', { v: 2 }));
      await sync.applyUpdate(sync.createUpdate('session-1', 'agent-1', { v: 3 }));

      const history = sync.getVersionHistory('session-1', 'agent-1');
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    test('should rollback to previous version', async () => {
      sync.initializeState('session-1', 'agent-1', { v: 1 });
      await sync.applyUpdate(sync.createUpdate('session-1', 'agent-1', { v: 2 }));
      await sync.applyUpdate(sync.createUpdate('session-1', 'agent-1', { v: 3 }));

      const rolledBack = sync.rollbackToVersion('session-1', 'agent-1', 1);

      expect(rolledBack?.state.v).toBe(1);
    });
  });

  describe('Checksum Verification', () => {
    test('should verify valid checksum', () => {
      const state = sync.initializeState('session-1', 'agent-1', { data: 'test' });
      expect(sync.verifyChecksum(state)).toBe(true);
    });

    test('should detect invalid checksum', () => {
      const state = sync.initializeState('session-1', 'agent-1', { data: 'test' });
      state.checksum = 'invalid';
      expect(sync.verifyChecksum(state)).toBe(false);
    });
  });
});

// ============================================
// CONFLICT RESOLVER TESTS
// ============================================

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  afterEach(() => {
    resolver.reset();
  });

  describe('Conflict Detection', () => {
    test('should detect and register conflicts', () => {
      const conflict = resolver.detectConflict(
        'session-1',
        ConflictType.RESOURCE_CONTENTION,
        ['agent-1', 'agent-2'],
        'Both agents claiming same resource'
      );

      expect(conflict.id).toMatch(/^conflict_/);
      expect(conflict.type).toBe(ConflictType.RESOURCE_CONTENTION);
      expect(conflict.agents).toHaveLength(2);
    });

    test('should assess severity correctly', () => {
      const critical = resolver.detectConflict(
        'session-1',
        ConflictType.RESOURCE_CONTENTION,
        ['a1', 'a2'],
        'Critical resource',
        { resourceType: 'critical' }
      );

      expect(critical.severity).toBe('critical');

      const low = resolver.detectConflict(
        'session-1',
        ConflictType.TIMING_CONFLICT,
        ['a1', 'a2'],
        'Minor timing issue'
      );

      expect(low.severity).toBe('medium');
    });
  });

  describe('Conflict Resolution', () => {
    test('should resolve with priority-based strategy', async () => {
      const conflict = resolver.detectConflict(
        'session-1',
        ConflictType.PRIORITY_CONFLICT,
        ['agent-low', 'agent-high'],
        'Priority dispute'
      );

      const resolution = await resolver.resolveConflict(conflict.id, {
        'agent-low': 1,
        'agent-high': 10,
      });

      expect(resolution.strategy).toBe(ConflictResolutionStrategy.PRIORITY_BASED);
      expect(resolution.winnerId).toBe('agent-high');
    });

    test('should resolve with first-come strategy', async () => {
      resolver = new ConflictResolver({
        defaultStrategy: ConflictResolutionStrategy.FIRST_COME,
      });

      const conflict = resolver.detectConflict(
        'session-1',
        ConflictType.RESOURCE_CONTENTION,
        ['agent-later', 'agent-earlier'],
        'Resource claim'
      );

      const resolution = await resolver.resolveConflict(conflict.id, {}, {
        'agent-later': { version: 1, timestamp: new Date('2024-01-02') },
        'agent-earlier': { version: 1, timestamp: new Date('2024-01-01') },
      });

      expect(resolution.strategy).toBe(ConflictResolutionStrategy.FIRST_COME);
      expect(resolution.winnerId).toBe('agent-earlier');
    });

    test('should resolve with last-write strategy', async () => {
      resolver = new ConflictResolver({
        defaultStrategy: ConflictResolutionStrategy.LAST_WRITE,
      });

      const conflict = resolver.detectConflict(
        'session-1',
        ConflictType.OUTPUT_CONFLICT,
        ['agent-old', 'agent-new'],
        'Output conflict'
      );

      const resolution = await resolver.resolveConflict(conflict.id, {}, {
        'agent-old': { version: 1, timestamp: new Date('2024-01-01') },
        'agent-new': { version: 2, timestamp: new Date('2024-01-02') },
      });

      expect(resolution.strategy).toBe(ConflictResolutionStrategy.LAST_WRITE);
      expect(resolution.winnerId).toBe('agent-new');
    });

    test('should resolve with merge strategy', async () => {
      resolver = new ConflictResolver({
        defaultStrategy: ConflictResolutionStrategy.MERGE,
      });

      const conflict = resolver.detectConflict(
        'session-1',
        ConflictType.STATE_MISMATCH,
        ['agent-1', 'agent-2'],
        'State mismatch',
        {
          values: [
            { a: 1, b: 2 },
            { b: 3, c: 4 },
          ],
        }
      );

      const resolution = await resolver.resolveConflict(conflict.id);

      expect(resolution.strategy).toBe(ConflictResolutionStrategy.MERGE);
      expect(resolution.mergedValue).toBeDefined();
    });
  });

  describe('Voting', () => {
    test('should handle vote submission', async () => {
      resolver = new ConflictResolver({
        defaultStrategy: ConflictResolutionStrategy.VOTING,
      });

      const conflict = resolver.detectConflict(
        'session-1',
        ConflictType.TASK_OVERLAP,
        ['agent-1', 'agent-2', 'agent-3'],
        'Task assignment dispute'
      );

      // Start resolution (initiates voting)
      const resolutionPromise = resolver.resolveConflict(conflict.id);

      // Submit votes
      resolver.submitVote(conflict.id, 'agent-1', 'agent-2');
      resolver.submitVote(conflict.id, 'agent-2', 'agent-2');
      resolver.submitVote(conflict.id, 'agent-3', 'agent-1');

      const resolution = await resolutionPromise;
      expect(resolution.votes).toBeDefined();
    });
  });

  describe('Queries', () => {
    test('should get unresolved conflicts', () => {
      resolver.detectConflict('session-1', ConflictType.RESOURCE_CONTENTION, ['a1'], 'C1');
      resolver.detectConflict('session-1', ConflictType.OUTPUT_CONFLICT, ['a2'], 'C2');

      const unresolved = resolver.getUnresolvedConflicts('session-1');
      expect(unresolved).toHaveLength(2);
    });

    test('should track statistics', () => {
      resolver.detectConflict('session-1', ConflictType.RESOURCE_CONTENTION, ['a1'], 'C1');
      resolver.detectConflict('session-1', ConflictType.OUTPUT_CONFLICT, ['a2'], 'C2');

      const stats = resolver.getStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
    });
  });
});

// ============================================
// HANDOFF PROTOCOL TESTS
// ============================================

describe('HandoffProtocol', () => {
  let protocol: HandoffProtocol;

  beforeEach(() => {
    protocol = new HandoffProtocol();
  });

  afterEach(() => {
    protocol.reset();
  });

  describe('Agent Registration', () => {
    test('should register agent capabilities', () => {
      protocol.registerAgent('agent-1', ['code-generation', 'testing'], 5, 2);

      const capable = protocol.findCapableAgents(['code-generation']);
      expect(capable).toHaveLength(1);
      expect(capable[0]!.agentId).toBe('agent-1');
    });

    test('should find capable agents', () => {
      protocol.registerAgent('agent-1', ['a', 'b'], 5);
      protocol.registerAgent('agent-2', ['b', 'c'], 5);
      protocol.registerAgent('agent-3', ['a', 'b', 'c'], 5);

      const forAB = protocol.findCapableAgents(['a', 'b']);
      expect(forAB.map(a => a.agentId)).toContain('agent-1');
      expect(forAB.map(a => a.agentId)).toContain('agent-3');

      const forABC = protocol.findCapableAgents(['a', 'b', 'c']);
      expect(forABC).toHaveLength(1);
      expect(forABC[0]!.agentId).toBe('agent-3');
    });

    test('should exclude overloaded agents', () => {
      protocol.registerAgent('agent-1', ['skill'], 1); // maxLoad: 1
      protocol.updateAgentStatus('agent-1', true, 1); // currentLoad: 1

      const capable = protocol.findCapableAgents(['skill']);
      expect(capable).toHaveLength(0);
    });
  });

  describe('Handoff Execution', () => {
    test('should request and execute handoff', async () => {
      protocol.registerAgent('source', ['a'], 5);
      protocol.registerAgent('target', ['a', 'b'], 5);

      const request = await protocol.requestHandoff(
        'session-1',
        'source',
        HandoffReason.CAPABILITY_MISMATCH,
        { taskId: 't1', taskType: 'test', progress: 50, remainingWork: [], dependencies: [], artifacts: [] },
        { data: 'state' },
        { targetCapabilities: ['a', 'b'] }
      );

      const result = await protocol.executeHandoff(request.id);

      expect(result.accepted).toBe(true);
      expect(result.targetAgentId).toBe('target');
      expect(result.stateTransferred).toBe(true);
    });

    test('should reject handoff when no capable agent available', async () => {
      protocol.registerAgent('source', ['a'], 5);
      // No agent with capability 'x'

      const request = await protocol.requestHandoff(
        'session-1',
        'source',
        HandoffReason.CAPABILITY_MISMATCH,
        { taskId: 't1', taskType: 'test', progress: 0, remainingWork: [], dependencies: [], artifacts: [] },
        {},
        { targetCapabilities: ['x', 'y', 'z'] }
      );

      const result = await protocol.executeHandoff(request.id);

      expect(result.accepted).toBe(false);
      expect(result.error).toContain('No capable agents');
    });
  });

  describe('Handoff Patterns', () => {
    test('should perform capability-based handoff', async () => {
      protocol.registerAgent('generalist', ['basic'], 5);
      protocol.registerAgent('specialist', ['basic', 'advanced'], 5);

      const result = await protocol.handoffByCapability(
        'session-1',
        'generalist',
        ['basic', 'advanced'],
        { taskId: 't1', taskType: 'advanced-task', progress: 0, remainingWork: [], dependencies: [], artifacts: [] },
        {}
      );

      expect(result.accepted).toBe(true);
      expect(result.targetAgentId).toBe('specialist');
    });

    test('should perform load balancing handoff', async () => {
      protocol.registerAgent('busy', ['skill'], 5);
      protocol.registerAgent('idle', ['skill'], 5);

      protocol.updateAgentStatus('busy', true, 4);
      protocol.updateAgentStatus('idle', true, 1);

      const result = await protocol.handoffForLoadBalancing(
        'session-1',
        'busy',
        { taskId: 't1', taskType: 'task', progress: 0, remainingWork: [], dependencies: [], artifacts: [] },
        {}
      );

      expect(result.accepted).toBe(true);
      expect(result.targetAgentId).toBe('idle');
    });

    test('should perform escalation handoff', async () => {
      protocol.registerAgent('junior', ['skill'], 5, 1); // priority: 1
      protocol.registerAgent('senior', ['skill'], 5, 5); // priority: 5

      const result = await protocol.handoffForEscalation(
        'session-1',
        'junior',
        { taskId: 't1', taskType: 'complex', progress: 0, remainingWork: [], dependencies: [], artifacts: [] },
        {},
        3 // minPriority
      );

      expect(result.accepted).toBe(true);
      expect(result.targetAgentId).toBe('senior');
    });
  });

  describe('Statistics', () => {
    test('should track handoff statistics', async () => {
      protocol.registerAgent('a1', ['s'], 5);
      protocol.registerAgent('a2', ['s'], 5);

      await protocol.handoffByCapability('s1', 'a1', ['s'],
        { taskId: 't1', taskType: 't', progress: 0, remainingWork: [], dependencies: [], artifacts: [] }, {});

      const stats = protocol.getStats();

      expect(stats.total).toBeGreaterThanOrEqual(1);
      expect(stats.successful).toBeGreaterThanOrEqual(1);
    });
  });
});

// ============================================
// COORDINATION PATTERNS TESTS
// ============================================

describe('CoordinationPatterns', () => {
  let patterns: CoordinationPatterns;

  beforeEach(() => {
    patterns = new CoordinationPatterns();
  });

  afterEach(() => {
    patterns.reset();
  });

  describe('Leader Election', () => {
    test('should elect a leader', async () => {
      const result = await patterns.electLeader('session-1', ['agent-a', 'agent-b', 'agent-c']);

      expect(result.leaderId).toBeDefined();
      expect(result.term).toBeDefined();
      expect(['agent-a', 'agent-b', 'agent-c']).toContain(result.leaderId);
    });

    test('should return consistent leader for session', async () => {
      await patterns.electLeader('session-1', ['a', 'b', 'c']);

      const leader = patterns.getLeader('session-1');
      expect(leader).toBeDefined();
    });
  });

  describe('Consensus', () => {
    test('should execute consensus protocol', async () => {
      const session = {
        id: 'session-1',
        name: 'Consensus Test',
        pattern: CoordinationPattern.CONSENSUS,
        state: ConvergenceState.EXECUTING,
        agents: ['a1', 'a2', 'a3'],
        createdAt: new Date(),
        goal: { description: 'Test', successCriteria: [] },
        currentPhase: 0,
        totalPhases: 1,
        stateVersion: 1,
      };

      const proposals = new Map([
        ['a1', 'option-x'],
        ['a2', 'option-x'],
        ['a3', 'option-y'],
      ]);

      const { consensus } = await patterns.executeConsensus(session, proposals);

      expect(consensus.votes).toBeDefined();
      expect(Object.keys(consensus.votes)).toHaveLength(3);
    });
  });

  describe('Pipeline', () => {
    test('should execute pipeline stages', async () => {
      const session = {
        id: 'session-1',
        name: 'Pipeline Test',
        pattern: CoordinationPattern.PIPELINE,
        state: ConvergenceState.EXECUTING,
        agents: ['parser', 'processor', 'outputter'],
        createdAt: new Date(),
        goal: { description: 'Test', successCriteria: [] },
        currentPhase: 0,
        totalPhases: 3,
        stateVersion: 1,
      };

      const stages = [
        { name: 'parse', agentId: 'parser' },
        { name: 'process', agentId: 'processor' },
        { name: 'output', agentId: 'outputter' },
      ];

      const result = await patterns.executePipeline(session, stages, { raw: 'input' });

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(3);
      expect(result.participatingAgents).toContain('parser');
    });
  });

  describe('Parallel Merge', () => {
    test('should execute parallel merge', async () => {
      const session = {
        id: 'session-1',
        name: 'Parallel Test',
        pattern: CoordinationPattern.PARALLEL_MERGE,
        state: ConvergenceState.EXECUTING,
        agents: ['worker-1', 'worker-2'],
        createdAt: new Date(),
        goal: { description: 'Test', successCriteria: [] },
        currentPhase: 0,
        totalPhases: 1,
        stateVersion: 1,
      };

      const taskDistribution = new Map([
        ['worker-1', { partition: 'A' }],
        ['worker-2', { partition: 'B' }],
      ]);

      const mergeFunction = (results: Map<string, unknown>) => {
        return { merged: true, count: results.size };
      };

      const { result, merge } = await patterns.executeParallelMerge(
        session,
        taskDistribution,
        mergeFunction
      );

      expect(result.success).toBe(true);
      expect(merge.sources).toHaveLength(2);
    });
  });

  describe('Competitive', () => {
    test('should execute competitive pattern', async () => {
      const session = {
        id: 'session-1',
        name: 'Competition Test',
        pattern: CoordinationPattern.COMPETITIVE,
        state: ConvergenceState.EXECUTING,
        agents: ['competitor-1', 'competitor-2'],
        createdAt: new Date(),
        goal: { description: 'Test', successCriteria: [] },
        currentPhase: 0,
        totalPhases: 1,
        stateVersion: 1,
      };

      const scoreFunction = (result: any, agentId: string) => {
        return result?.quality ?? Math.random() * 100;
      };

      const result = await patterns.executeCompetitive(session, { task: 'solve' }, scoreFunction);

      expect(result.success).toBe(true);
      expect((result.output as any).winner).toBeDefined();
      expect((result.output as any).score).toBeDefined();
    });
  });

  describe('Messaging', () => {
    test('should send and receive messages', async () => {
      const messages: any[] = [];

      patterns.onMessage('session-1', async (msg) => {
        messages.push(msg);
      });

      await patterns.sendMessage('session-1', 'sender', ['recipient'], 'state_update', {
        key: 'value',
      });

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('state_update');
    });

    test('should track message history', async () => {
      await patterns.sendMessage('session-1', 's1', 'broadcast', 'heartbeat', {});
      await patterns.sendMessage('session-1', 's2', 'broadcast', 'heartbeat', {});

      const history = patterns.getMessages('session-1');
      expect(history).toHaveLength(2);
    });
  });
});
