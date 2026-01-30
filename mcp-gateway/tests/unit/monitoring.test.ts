/**
 * Unit Tests: Monitoring - Audit Logger and Behavior Monitor
 *
 * @epic 2.5 - MCP Security Gateway
 * @task 7.1 - Monitoring Implementation
 *
 * Tests AuditLogger and BehaviorMonitor for tool behavior analysis.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  AuditLogger,
  BehaviorMonitor,
  AuditQueryFilter,
} from '../../monitoring/index.js';
import { AuditEntry, MCPTool, RiskLevel, AuditEventType, ToolPermission } from '../../core/types.js';

// Helper to create valid AuditEntry with required fields
let entryCounter = 0;
function createEntry(overrides: Partial<AuditEntry> & { eventType: AuditEventType; tool: string; tenantId: string }): AuditEntry {
  return {
    id: `entry-${++entryCounter}`,
    requestId: `req-${entryCounter}`,
    timestamp: new Date().toISOString(),
    outcome: 'success',
    riskLevel: 'low',
    details: {},
    ...overrides,
  };
}

describe('Monitoring (monitoring/index.ts)', () => {
  describe('AuditLogger', () => {
    let logger: AuditLogger;

    beforeEach(() => {
      logger = new AuditLogger({
        enabled: true,
        logLevel: 'debug',
        retentionDays: 30,
        includePayloads: true,
      });
    });

    describe('log', () => {
      it('should log audit entries when enabled', () => {
        const entry = createEntry({
          eventType: 'tool:completed',
          tool: 'test-tool',
          tenantId: 'tenant-1',
          details: { param1: 'value1' },
        });

        logger.log(entry);

        const entries = logger.query({});
        expect(entries.length).toBe(1);
        expect(entries[0]!.tool).toBe('test-tool');
      });

      it('should not log when disabled', () => {
        const disabledLogger = new AuditLogger({
          enabled: false,
          logLevel: 'info',
          retentionDays: 30,
          includePayloads: false,
        });

        disabledLogger.log(createEntry({
          eventType: 'tool:invoked',
          tool: 'tool',
          tenantId: 'tenant',
        }));

        expect(disabledLogger.query({}).length).toBe(0);
      });

      it('should respect log level filtering', () => {
        const infoLogger = new AuditLogger({
          enabled: true,
          logLevel: 'warn',
          retentionDays: 30,
          includePayloads: false,
        });

        // Debug event should be filtered
        infoLogger.log(createEntry({
          eventType: 'tool:invoked',
          tool: 'tool',
          tenantId: 'tenant',
        }));

        // Warn event should pass
        infoLogger.log(createEntry({
          eventType: 'security:warning',
          tool: 'tool',
          tenantId: 'tenant',
          riskLevel: 'medium',
        }));

        expect(infoLogger.query({}).length).toBe(1);
      });

      it('should trim entries when max exceeded', () => {
        // Log many entries
        for (let i = 0; i < 100; i++) {
          logger.log(createEntry({
            eventType: 'tool:invoked',
            tool: `tool-${i}`,
            tenantId: 'tenant',
          }));
        }

        const entries = logger.query({});
        expect(entries.length).toBeLessThanOrEqual(100);
      });

      it('should identify error level events', () => {
        logger.log(createEntry({
          eventType: 'security:violation',
          tool: 'tool',
          tenantId: 'tenant',
          outcome: 'failure',
          riskLevel: 'high',
        }));

        logger.log(createEntry({
          eventType: 'tool:failed',
          tool: 'tool',
          tenantId: 'tenant',
          outcome: 'failure',
          riskLevel: 'high',
        }));

        expect(logger.query({}).length).toBe(2);
      });

      it('should identify warning level events', () => {
        logger.log(createEntry({
          eventType: 'tool:blocked',
          tool: 'tool',
          tenantId: 'tenant',
          outcome: 'blocked',
          riskLevel: 'medium',
        }));

        expect(logger.query({}).length).toBe(1);
      });

      it('should identify info level events', () => {
        logger.log(createEntry({
          eventType: 'tool:completed',
          tool: 'tool',
          tenantId: 'tenant',
        }));

        logger.log(createEntry({
          eventType: 'approval:granted',
          tool: 'tool',
          tenantId: 'tenant',
        }));

        expect(logger.query({}).length).toBe(2);
      });
    });

    describe('query', () => {
      beforeEach(() => {
        // Seed test data
        const entries: AuditEntry[] = [
          createEntry({
            timestamp: '2026-01-01T10:00:00Z',
            eventType: 'tool:invoked',
            tool: 'tool-a',
            tenantId: 'tenant-1',
            outcome: 'success',
            riskLevel: 'low',
          }),
          createEntry({
            timestamp: '2026-01-01T11:00:00Z',
            eventType: 'tool:invoked',
            tool: 'tool-b',
            tenantId: 'tenant-2',
            outcome: 'failure',
            riskLevel: 'high',
          }),
          createEntry({
            timestamp: '2026-01-01T12:00:00Z',
            eventType: 'security:warning',
            tool: 'tool-a',
            tenantId: 'tenant-1',
            outcome: 'success',
            riskLevel: 'medium',
          }),
        ];

        entries.forEach((e) => logger.log(e));
      });

      it('should filter by tool', () => {
        const results = logger.query({ tool: 'tool-a' });
        expect(results.length).toBe(2);
        expect(results.every((e) => e.tool === 'tool-a')).toBe(true);
      });

      it('should filter by tenantId', () => {
        const results = logger.query({ tenantId: 'tenant-2' });
        expect(results.length).toBe(1);
        expect(results[0]!.tenantId).toBe('tenant-2');
      });

      it('should filter by eventType', () => {
        const results = logger.query({ eventType: 'security:warning' });
        expect(results.length).toBe(1);
      });

      it('should filter by outcome', () => {
        const results = logger.query({ outcome: 'failure' });
        expect(results.length).toBe(1);
      });

      it('should filter by riskLevel', () => {
        const results = logger.query({ riskLevel: 'high' as RiskLevel });
        expect(results.length).toBe(1);
      });

      it('should filter by startTime', () => {
        const results = logger.query({ startTime: '2026-01-01T11:00:00Z' });
        expect(results.length).toBe(2);
      });

      it('should filter by endTime', () => {
        const results = logger.query({ endTime: '2026-01-01T11:00:00Z' });
        expect(results.length).toBe(2);
      });

      it('should apply limit', () => {
        const results = logger.query({ limit: 1 });
        expect(results.length).toBe(1);
      });

      it('should sort by timestamp descending', () => {
        const results = logger.query({});
        expect(results[0]!.timestamp > results[1]!.timestamp).toBe(true);
      });

      it('should combine multiple filters', () => {
        const results = logger.query({
          tool: 'tool-a',
          outcome: 'success',
        });
        expect(results.length).toBe(2);
      });
    });

    describe('getStats', () => {
      beforeEach(() => {
        const entries: AuditEntry[] = [
          createEntry({ eventType: 'tool:invoked', tool: 'tool-a', tenantId: 't1', outcome: 'success', riskLevel: 'low' }),
          createEntry({ eventType: 'tool:invoked', tool: 'tool-a', tenantId: 't1', outcome: 'success', riskLevel: 'low' }),
          createEntry({ eventType: 'security:violation', tool: 'tool-b', tenantId: 't2', outcome: 'failure', riskLevel: 'high' }),
        ];
        entries.forEach((e) => logger.log(e));
      });

      it('should count total events', () => {
        const stats = logger.getStats();
        expect(stats.totalEvents).toBe(3);
      });

      it('should group by event type', () => {
        const stats = logger.getStats();
        expect(stats.byEventType['tool:invoked']).toBe(2);
        expect(stats.byEventType['security:violation']).toBe(1);
      });

      it('should group by outcome', () => {
        const stats = logger.getStats();
        expect(stats.byOutcome['success']).toBe(2);
        expect(stats.byOutcome['failure']).toBe(1);
      });

      it('should group by tool', () => {
        const stats = logger.getStats();
        expect(stats.byTool['tool-a']).toBe(2);
        expect(stats.byTool['tool-b']).toBe(1);
      });

      it('should group by risk level', () => {
        const stats = logger.getStats();
        expect(stats.byRiskLevel['low']).toBe(2);
        expect(stats.byRiskLevel['high']).toBe(1);
      });

      it('should filter by since timestamp', () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString();
        const stats = logger.getStats(futureDate);
        expect(stats.totalEvents).toBe(0);
      });
    });

    describe('export', () => {
      beforeEach(() => {
        logger.log(createEntry({
          timestamp: '2026-01-01T10:00:00Z',
          eventType: 'tool:invoked',
          tool: 'tool',
          tenantId: 'tenant',
        }));
      });

      it('should export as JSON by default', () => {
        const exported = logger.export();
        const parsed = JSON.parse(exported);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(1);
      });

      it('should export as JSON explicitly', () => {
        const exported = logger.export('json');
        expect(() => JSON.parse(exported)).not.toThrow();
      });

      it('should export as CSV', () => {
        const exported = logger.export('csv');
        const lines = exported.split('\n');
        expect(lines.length).toBe(2); // Header + 1 row
        expect(lines[0]).toContain('timestamp');
        expect(lines[0]).toContain('eventType');
      });
    });

    describe('cleanup', () => {
      it('should remove old entries', () => {
        // Log entry with old timestamp
        const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
        const newDate = new Date().toISOString();

        logger.log(createEntry({
          timestamp: oldDate,
          eventType: 'tool:invoked',
          tool: 'tool',
          tenantId: 'tenant',
        }));

        logger.log(createEntry({
          timestamp: newDate,
          eventType: 'tool:completed',
          tool: 'tool',
          tenantId: 'tenant',
        }));

        const removed = logger.cleanup();
        expect(removed).toBe(1);
        expect(logger.query({}).length).toBe(1);
      });
    });
  });

  describe('BehaviorMonitor', () => {
    let monitor: BehaviorMonitor;

    const createMockTool = (name: string, permissions: ToolPermission[] = [], riskLevel: RiskLevel = 'low'): MCPTool => ({
      name,
      description: `Description for ${name}`,
      version: '1.0.0',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} },
      metadata: {
        author: 'test-author',
        source: 'local:test',
        riskLevel,
        permissions,
        verificationStatus: 'verified',
      },
    });

    beforeEach(() => {
      monitor = new BehaviorMonitor({
        enabled: true,
        trackDescriptionChanges: true,
        alertOnChange: true,
      });
    });

    describe('registerTool', () => {
      it('should register a tool with baseline', () => {
        const tool = createMockTool('test-tool', ['filesystem:read']);
        monitor.registerTool(tool);

        const baseline = monitor.getBaseline('test-tool');
        expect(baseline).toBeDefined();
        expect(baseline!.tool).toBe('test-tool');
        expect(baseline!.invocationCount).toBe(0);
      });

      it('should not register when disabled', () => {
        const disabledMonitor = new BehaviorMonitor({
          enabled: false,
          trackDescriptionChanges: false,
          alertOnChange: false,
        });

        const tool = createMockTool('test-tool');
        disabledMonitor.registerTool(tool);

        expect(disabledMonitor.getBaseline('test-tool')).toBeUndefined();
      });

      it('should store description hash', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        const baseline = monitor.getBaseline('test-tool');
        expect(baseline!.lastDescriptionHash).toBeDefined();
      });
    });

    describe('unregisterTool', () => {
      it('should remove tool from monitoring', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);
        monitor.unregisterTool('test-tool');

        expect(monitor.getBaseline('test-tool')).toBeUndefined();
      });
    });

    describe('recordInvocation', () => {
      it('should update invocation count', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        monitor.recordInvocation('test-tool', 100, true);
        monitor.recordInvocation('test-tool', 150, true);

        const baseline = monitor.getBaseline('test-tool');
        expect(baseline!.invocationCount).toBe(2);
      });

      it('should calculate average duration', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        monitor.recordInvocation('test-tool', 100, true);
        monitor.recordInvocation('test-tool', 200, true);

        const baseline = monitor.getBaseline('test-tool');
        expect(baseline!.avgDurationMs).toBe(150);
      });

      it('should track error rate', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        monitor.recordInvocation('test-tool', 100, true);
        monitor.recordInvocation('test-tool', 100, false);
        monitor.recordInvocation('test-tool', 100, true);
        monitor.recordInvocation('test-tool', 100, false);

        const baseline = monitor.getBaseline('test-tool');
        expect(baseline!.errorRate).toBe(0.5);
      });

      it('should not record when disabled', () => {
        const disabledMonitor = new BehaviorMonitor({
          enabled: false,
          trackDescriptionChanges: false,
          alertOnChange: false,
        });

        disabledMonitor.recordInvocation('test-tool', 100, true);
        // No error thrown, just ignored
      });

      it('should update lastInvocation timestamp', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        monitor.recordInvocation('test-tool', 100, true);

        const baseline = monitor.getBaseline('test-tool');
        expect(baseline!.lastInvocation).toBeDefined();
      });
    });

    describe('checkToolIntegrity', () => {
      it('should return valid for unchanged tool', () => {
        const tool = createMockTool('test-tool', ['filesystem:read']);
        monitor.registerTool(tool);

        const result = monitor.checkToolIntegrity(tool);
        expect(result.valid).toBe(true);
        expect(result.changes.length).toBe(0);
      });

      it('should detect description change', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        // Modify description
        const modifiedTool = { ...tool, description: 'Modified description' };
        const result = monitor.checkToolIntegrity(modifiedTool);

        expect(result.valid).toBe(false);
        expect(result.changes).toContain('description_modified');
      });

      it('should detect permission additions', () => {
        const tool = createMockTool('test-tool', ['filesystem:read']);
        monitor.registerTool(tool);

        const modifiedTool = createMockTool('test-tool', ['filesystem:read', 'filesystem:write']);
        const result = monitor.checkToolIntegrity(modifiedTool);

        expect(result.valid).toBe(false);
        expect(result.changes.some((c) => c.includes('permissions_added'))).toBe(true);
      });

      it('should detect permission removals', () => {
        const tool = createMockTool('test-tool', ['filesystem:read', 'filesystem:write']);
        monitor.registerTool(tool);

        const modifiedTool = createMockTool('test-tool', ['filesystem:read']);
        const result = monitor.checkToolIntegrity(modifiedTool);

        expect(result.changes.some((c) => c.includes('permissions_removed'))).toBe(true);
      });

      it('should detect risk level changes', () => {
        const tool = createMockTool('test-tool', [], 'low');
        monitor.registerTool(tool);

        const modifiedTool = createMockTool('test-tool', [], 'high');
        const result = monitor.checkToolIntegrity(modifiedTool);

        expect(result.valid).toBe(false);
        expect(result.changes.some((c) => c.includes('risk_level_changed'))).toBe(true);
      });

      it('should skip check when tracking disabled', () => {
        const disabledMonitor = new BehaviorMonitor({
          enabled: true,
          trackDescriptionChanges: false,
          alertOnChange: false,
        });

        const tool = createMockTool('test-tool');
        disabledMonitor.registerTool(tool);

        const modifiedTool = { ...tool, description: 'Modified' };
        const result = disabledMonitor.checkToolIntegrity(modifiedTool);

        expect(result.valid).toBe(true);
      });

      it('should create alert on change when configured', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        const modifiedTool = { ...tool, description: 'Modified' };
        monitor.checkToolIntegrity(modifiedTool);

        const alerts = monitor.getAlerts();
        expect(alerts.some((a) => a.type === 'description_changed')).toBe(true);
      });
    });

    describe('detectAnomalies', () => {
      it('should return no anomalies for new tools', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        const result = monitor.detectAnomalies('test-tool');
        expect(result.anomalous).toBe(false);
      });

      it('should return no anomalies for unknown tools', () => {
        const result = monitor.detectAnomalies('unknown-tool');
        expect(result.anomalous).toBe(false);
      });

      it('should detect high error rate', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        // Record many errors (>30% rate with >20 invocations)
        for (let i = 0; i < 25; i++) {
          monitor.recordInvocation('test-tool', 100, i < 15); // 10 failures out of 25
        }

        const result = monitor.detectAnomalies('test-tool');
        expect(result.anomalous).toBe(true);
        expect(result.anomalies.some((a) => a.includes('error rate'))).toBe(true);
      });
    });

    describe('Alert Management', () => {
      it('should get all alerts', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        // Trigger alert
        const modifiedTool = { ...tool, description: 'Modified' };
        monitor.checkToolIntegrity(modifiedTool);

        const alerts = monitor.getAlerts();
        expect(alerts.length).toBeGreaterThan(0);
      });

      it('should filter unacknowledged alerts', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        // Trigger alert
        const modifiedTool = { ...tool, description: 'Modified' };
        monitor.checkToolIntegrity(modifiedTool);

        const alerts = monitor.getAlerts(true);
        expect(alerts.every((a) => !a.acknowledged)).toBe(true);
      });

      it('should acknowledge alerts', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        const modifiedTool = { ...tool, description: 'Modified' };
        monitor.checkToolIntegrity(modifiedTool);

        const alerts = monitor.getAlerts();
        const alertId = alerts[0]!.id;

        monitor.acknowledgeAlert(alertId, 'admin@example.com');

        const updatedAlerts = monitor.getAlerts();
        const acknowledgedAlert = updatedAlerts.find((a) => a.id === alertId);

        expect(acknowledgedAlert!.acknowledged).toBe(true);
        expect(acknowledgedAlert!.acknowledgedBy).toBe('admin@example.com');
        expect(acknowledgedAlert!.acknowledgedAt).toBeDefined();
      });
    });

    describe('Baseline Management', () => {
      it('should get baseline by name', () => {
        const tool = createMockTool('test-tool');
        monitor.registerTool(tool);

        const baseline = monitor.getBaseline('test-tool');
        expect(baseline).toBeDefined();
      });

      it('should return undefined for unknown tool', () => {
        expect(monitor.getBaseline('unknown')).toBeUndefined();
      });

      it('should get all baselines', () => {
        monitor.registerTool(createMockTool('tool-1'));
        monitor.registerTool(createMockTool('tool-2'));

        const baselines = monitor.getAllBaselines();
        expect(baselines.length).toBe(2);
      });
    });
  });
});
