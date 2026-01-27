import { auditLogger, hashChain, HashChain } from '../audit';

describe('AuditLogger', () => {
  beforeEach(() => {
    auditLogger.reset();
  });

  describe('log', () => {
    it('creates an audit event with hash', async () => {
      const event = await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-123', name: 'John' },
        'Started a workflow'
      );

      expect(event.id).toMatch(/^audit-/);
      expect(event.eventType).toBe('workflow.started');
      expect(event.actor.id).toBe('user-123');
      expect(event.action).toBe('Started a workflow');
      expect(event.eventHash).toHaveLength(64);
      expect(event.previousHash).toBe(HashChain.GENESIS_HASH);
      expect(event.createdAt).toBeInstanceOf(Date);
    });

    it('links events with previous hash', async () => {
      const event1 = await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-123' },
        'First event'
      );

      const event2 = await auditLogger.log(
        'stage.started',
        { type: 'system', id: 'engine' },
        'Second event'
      );

      expect(event2.previousHash).toBe(event1.eventHash);
    });

    it('stores optional fields', async () => {
      const event = await auditLogger.log(
        'policy.evaluated',
        { type: 'system', id: 'policy-engine' },
        'Evaluated policies',
        {
          resource: { type: 'workflow', id: 'wf-123' },
          details: { matched: 2 },
          riskLevel: 'high',
          workflowId: 'wf-123',
        }
      );

      expect(event.resource).toEqual({ type: 'workflow', id: 'wf-123' });
      expect(event.details).toEqual({ matched: 2 });
      expect(event.riskLevel).toBe('high');
      expect(event.workflowId).toBe('wf-123');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-1' },
        'Event 1',
        { workflowId: 'wf-1', riskLevel: 'low' }
      );
      await auditLogger.log(
        'stage.started',
        { type: 'system', id: 'engine' },
        'Event 2',
        { workflowId: 'wf-1' }
      );
      await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-2' },
        'Event 3',
        { workflowId: 'wf-2', riskLevel: 'high' }
      );
    });

    it('returns all events when no filter', async () => {
      const events = await auditLogger.query({});
      expect(events).toHaveLength(3);
    });

    it('filters by workflowId', async () => {
      const events = await auditLogger.query({ workflowId: 'wf-1' });
      expect(events).toHaveLength(2);
    });

    it('filters by actorId', async () => {
      const events = await auditLogger.query({ actorId: 'user-1' });
      expect(events).toHaveLength(1);
    });

    it('filters by eventType', async () => {
      const events = await auditLogger.query({ eventType: 'workflow.started' });
      expect(events).toHaveLength(2);
    });

    it('filters by riskLevel', async () => {
      const events = await auditLogger.query({ riskLevel: 'high' });
      expect(events).toHaveLength(1);
    });

    it('applies pagination', async () => {
      const events = await auditLogger.query({ limit: 2, offset: 1 });
      expect(events).toHaveLength(2);
    });
  });

  describe('getWorkflowEvents', () => {
    it('returns events for specific workflow', async () => {
      await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-1' },
        'Start',
        { workflowId: 'wf-test' }
      );
      await auditLogger.log(
        'stage.completed',
        { type: 'system', id: 'engine' },
        'Stage done',
        { workflowId: 'wf-test' }
      );
      await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-2' },
        'Other',
        { workflowId: 'wf-other' }
      );

      const events = await auditLogger.getWorkflowEvents('wf-test');
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.workflowId === 'wf-test')).toBe(true);
    });
  });

  describe('export', () => {
    it('exports events with integrity status', async () => {
      await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-1' },
        'Test'
      );

      const result = await auditLogger.export({}, 'json');

      expect(result.format).toBe('json');
      expect(result.events).toHaveLength(1);
      expect(result.exportedAt).toBeInstanceOf(Date);
      expect(result.integrityVerified).toBe(true);
    });
  });

  describe('verifyIntegrity', () => {
    it('returns valid for empty chain', async () => {
      const result = await auditLogger.verifyIntegrity();
      expect(result.valid).toBe(true);
    });

    it('returns valid for intact chain', async () => {
      await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-1' },
        'Event 1'
      );
      await auditLogger.log(
        'stage.started',
        { type: 'system', id: 'engine' },
        'Event 2'
      );
      await auditLogger.log(
        'workflow.completed',
        { type: 'system', id: 'engine' },
        'Event 3'
      );

      const result = await auditLogger.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Chain integrity verified');
    });
  });

  describe('getStats', () => {
    it('returns statistics', async () => {
      await auditLogger.log(
        'workflow.started',
        { type: 'user', id: 'user-1' },
        'Start',
        { riskLevel: 'low' }
      );
      await auditLogger.log(
        'workflow.completed',
        { type: 'system', id: 'engine' },
        'Complete',
        { riskLevel: 'high' }
      );

      const stats = await auditLogger.getStats();

      expect(stats.totalEvents).toBe(2);
      expect(stats.eventsByType['workflow.started']).toBe(1);
      expect(stats.eventsByType['workflow.completed']).toBe(1);
      expect(stats.eventsByRiskLevel['low']).toBe(1);
      expect(stats.eventsByRiskLevel['high']).toBe(1);
      expect(stats.recentEvents).toBe(2);
    });
  });
});

describe('HashChain', () => {
  describe('computeHash', () => {
    it('produces deterministic hashes', async () => {
      const event = {
        id: 'test-1',
        eventType: 'workflow.started' as const,
        actor: { type: 'user' as const, id: 'user-1' },
        action: 'Test action',
        details: {},
        previousHash: HashChain.GENESIS_HASH,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const hash1 = await hashChain.computeHash(event, HashChain.GENESIS_HASH);
      const hash2 = await hashChain.computeHash(event, HashChain.GENESIS_HASH);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('produces different hashes for different content', async () => {
      const baseEvent = {
        id: 'test-1',
        eventType: 'workflow.started' as const,
        actor: { type: 'user' as const, id: 'user-1' },
        action: 'Test action',
        details: {},
        previousHash: HashChain.GENESIS_HASH,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      };

      const hash1 = await hashChain.computeHash(baseEvent, HashChain.GENESIS_HASH);
      const hash2 = await hashChain.computeHash(
        { ...baseEvent, action: 'Different action' },
        HashChain.GENESIS_HASH
      );

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('returns valid for empty array', async () => {
      const result = await hashChain.verify([]);
      expect(result.valid).toBe(true);
    });

    it('detects broken chain', async () => {
      const event1 = {
        id: 'e1',
        eventType: 'workflow.started' as const,
        actor: { type: 'user' as const, id: 'u1' },
        action: 'test',
        details: {},
        previousHash: HashChain.GENESIS_HASH,
        createdAt: new Date(),
        eventHash: '', // Will be computed
      };
      event1.eventHash = await hashChain.computeHash(event1, HashChain.GENESIS_HASH);

      const event2 = {
        id: 'e2',
        eventType: 'stage.started' as const,
        actor: { type: 'system' as const, id: 's1' },
        action: 'test2',
        details: {},
        previousHash: 'wrong-hash', // Broken link!
        createdAt: new Date(),
        eventHash: 'fake-hash',
      };

      const result = await hashChain.verify([event1, event2]);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(1);
    });
  });
});
