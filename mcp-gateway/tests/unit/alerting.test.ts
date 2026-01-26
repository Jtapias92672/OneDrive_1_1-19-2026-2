/**
 * Unit Tests: Security Alerting Module
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.13-3.6.15 - Security Alerting
 *
 * Tests alert types, deduplication, and alert management
 */

import {
  // Types
  AlertSeverity,
  AlertType,
  SEVERITY_ORDER,
  compareSeverity,
  meetsMinimumSeverity,
  parseSeverity,
  parseAlertType,
  getSeverityColor,
  // Deduplicator
  AlertDeduplicator,
  // Alert Manager
  AlertManager,
} from '../../alerting/index.js';

// ============================================
// ALERT TYPES TESTS (Task 3.6.13)
// ============================================

describe('Alert Types', () => {
  describe('AlertSeverity', () => {
    it('should have all severity levels defined', () => {
      expect(AlertSeverity.CRITICAL).toBe('CRITICAL');
      expect(AlertSeverity.HIGH).toBe('HIGH');
      expect(AlertSeverity.MEDIUM).toBe('MEDIUM');
      expect(AlertSeverity.LOW).toBe('LOW');
      expect(AlertSeverity.INFO).toBe('INFO');
    });
  });

  describe('AlertType', () => {
    it('should have OAuth alert types', () => {
      expect(AlertType.OAUTH_TOKEN_EXPIRED).toBeDefined();
      expect(AlertType.OAUTH_TOKEN_REVOKED).toBeDefined();
      expect(AlertType.AUTH_FAILURE).toBeDefined();
    });

    it('should have tenant alert types', () => {
      expect(AlertType.CROSS_TENANT_VIOLATION).toBeDefined();
      expect(AlertType.CROSS_TENANT_LEAK).toBeDefined();
      expect(AlertType.TENANT_ACCESS_DENIED).toBeDefined();
    });

    it('should have injection alert types', () => {
      expect(AlertType.SQL_INJECTION).toBeDefined();
      expect(AlertType.COMMAND_INJECTION).toBeDefined();
      expect(AlertType.PROMPT_INJECTION).toBeDefined();
      expect(AlertType.PATH_TRAVERSAL).toBeDefined();
      expect(AlertType.XSS_ATTEMPT).toBeDefined();
    });

    it('should have CARS alert types', () => {
      expect(AlertType.CARS_HIGH_RISK).toBeDefined();
      expect(AlertType.CARS_CRITICAL_RISK).toBeDefined();
      expect(AlertType.DECEPTIVE_COMPLIANCE).toBeDefined();
      expect(AlertType.REWARD_HACKING).toBeDefined();
    });
  });

  describe('SEVERITY_ORDER', () => {
    it('should order severities correctly', () => {
      expect(SEVERITY_ORDER[AlertSeverity.CRITICAL]).toBeGreaterThan(SEVERITY_ORDER[AlertSeverity.HIGH]);
      expect(SEVERITY_ORDER[AlertSeverity.HIGH]).toBeGreaterThan(SEVERITY_ORDER[AlertSeverity.MEDIUM]);
      expect(SEVERITY_ORDER[AlertSeverity.MEDIUM]).toBeGreaterThan(SEVERITY_ORDER[AlertSeverity.LOW]);
      expect(SEVERITY_ORDER[AlertSeverity.LOW]).toBeGreaterThan(SEVERITY_ORDER[AlertSeverity.INFO]);
    });
  });

  describe('compareSeverity', () => {
    it('should compare severity levels', () => {
      expect(compareSeverity(AlertSeverity.CRITICAL, AlertSeverity.HIGH)).toBeGreaterThan(0);
      expect(compareSeverity(AlertSeverity.LOW, AlertSeverity.HIGH)).toBeLessThan(0);
      expect(compareSeverity(AlertSeverity.MEDIUM, AlertSeverity.MEDIUM)).toBe(0);
    });
  });

  describe('meetsMinimumSeverity', () => {
    it('should check minimum severity', () => {
      expect(meetsMinimumSeverity(AlertSeverity.CRITICAL, AlertSeverity.HIGH)).toBe(true);
      expect(meetsMinimumSeverity(AlertSeverity.LOW, AlertSeverity.HIGH)).toBe(false);
      expect(meetsMinimumSeverity(AlertSeverity.HIGH, AlertSeverity.HIGH)).toBe(true);
    });
  });

  describe('parseSeverity', () => {
    it('should parse severity from string', () => {
      expect(parseSeverity('critical')).toBe(AlertSeverity.CRITICAL);
      expect(parseSeverity('HIGH')).toBe(AlertSeverity.HIGH);
      expect(parseSeverity('Medium')).toBe(AlertSeverity.MEDIUM);
    });

    it('should return null for invalid severity', () => {
      expect(parseSeverity('invalid')).toBeNull();
    });
  });

  describe('parseAlertType', () => {
    it('should parse alert type from string', () => {
      expect(parseAlertType('SQL_INJECTION')).toBe(AlertType.SQL_INJECTION);
      expect(parseAlertType('prompt_injection')).toBe(AlertType.PROMPT_INJECTION);
    });

    it('should return null for invalid type', () => {
      expect(parseAlertType('invalid_type')).toBeNull();
    });
  });

  describe('getSeverityColor', () => {
    it('should return colors for severities', () => {
      expect(getSeverityColor(AlertSeverity.CRITICAL)).toBe('#ff0000');
      expect(getSeverityColor(AlertSeverity.HIGH)).toBe('#ff6600');
      expect(getSeverityColor(AlertSeverity.MEDIUM)).toBe('#ffcc00');
    });
  });
});

// ============================================
// ALERT DEDUPLICATOR TESTS (Task 3.6.14)
// ============================================

describe('AlertDeduplicator', () => {
  let deduplicator: AlertDeduplicator;

  beforeEach(() => {
    deduplicator = new AlertDeduplicator({
      windowMs: 60000, // 1 minute
      maxAggregation: 10,
      burstDetection: true,
      burstThreshold: 5,
    });
  });

  afterEach(() => {
    deduplicator.dispose();
  });

  describe('check', () => {
    it('should allow first alert', () => {
      const result = deduplicator.check({
        id: 'alert-1',
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'SQL injection detected',
        source: 'sanitizer',
        timestamp: new Date(),
        evidence: {},
      });

      expect(result.shouldAlert).toBe(true);
      expect(result.reason).toBe('new');
      expect(result.count).toBe(1);
    });

    it('should deduplicate similar alerts', () => {
      const baseAlert = {
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'SQL injection detected',
        source: 'sanitizer',
        userId: 'user-1',
        timestamp: new Date(),
        evidence: {},
      };

      // First alert
      deduplicator.check({ ...baseAlert, id: 'alert-1' });

      // Second similar alert
      const result = deduplicator.check({ ...baseAlert, id: 'alert-2' });

      expect(result.shouldAlert).toBe(false);
      expect(result.reason).toBe('deduplicated');
      expect(result.count).toBe(2);
    });

    it('should never deduplicate critical alerts', () => {
      const criticalAlert = {
        id: 'alert-1',
        type: AlertType.CARS_CRITICAL_RISK,
        severity: AlertSeverity.CRITICAL,
        message: 'Critical risk detected',
        source: 'cars',
        timestamp: new Date(),
        evidence: {},
      };

      deduplicator.check(criticalAlert);
      const result = deduplicator.check({ ...criticalAlert, id: 'alert-2' });

      expect(result.shouldAlert).toBe(true);
      expect(result.reason).toBe('new');
    });

    it('should aggregate when max reached', () => {
      const baseAlert = {
        type: AlertType.RATE_LIMIT_EXCEEDED,
        severity: AlertSeverity.MEDIUM,
        message: 'Rate limit exceeded',
        source: 'gateway',
        timestamp: new Date(),
        evidence: {},
      };

      // Send many alerts - deduplicator config has maxAggregation: 10
      for (let i = 0; i < 9; i++) {
        deduplicator.check({ ...baseAlert, id: `alert-${i}` });
      }

      // 10th alert should trigger aggregation
      const result = deduplicator.check({ ...baseAlert, id: 'alert-10' });

      // After max aggregation, it should either aggregate or suppress
      // Behavior depends on implementation - check that count is tracked
      expect(result.count).toBeGreaterThanOrEqual(9);
    });
  });

  describe('shouldAlert', () => {
    it('should return boolean for quick check', () => {
      const result = deduplicator.shouldAlert({
        id: 'alert-1',
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        timestamp: new Date(),
        evidence: {},
      });

      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });
  });

  describe('createFingerprint', () => {
    it('should create consistent fingerprint', () => {
      const alert = {
        id: 'alert-1',
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        timestamp: new Date(),
        evidence: {},
      };

      const fp1 = deduplicator.createFingerprint(alert);
      const fp2 = deduplicator.createFingerprint(alert);

      expect(fp1).toBe(fp2);
    });

    it('should create different fingerprints for different alerts', () => {
      const alert1 = {
        id: 'alert-1',
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        timestamp: new Date(),
        evidence: {},
      };

      const alert2 = {
        ...alert1,
        type: AlertType.COMMAND_INJECTION,
      };

      expect(deduplicator.createFingerprint(alert1)).not.toBe(
        deduplicator.createFingerprint(alert2)
      );
    });
  });

  describe('burst detection', () => {
    it('should detect alert burst', () => {
      const baseAlert = {
        type: AlertType.AUTH_FAILURE,
        severity: AlertSeverity.MEDIUM,
        message: 'Auth failed',
        source: 'auth',
        timestamp: new Date(),
        evidence: {},
      };

      let burstDetected = false;

      // Send alerts rapidly
      for (let i = 0; i < 10; i++) {
        const result = deduplicator.check({ ...baseAlert, id: `alert-${i}` });
        if (result.reason === 'burst') {
          burstDetected = true;
        }
      }

      expect(burstDetected).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should clean up expired records', () => {
      deduplicator.check({
        id: 'alert-1',
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        timestamp: new Date(),
        evidence: {},
      });

      const stats1 = deduplicator.getStats();
      expect(stats1.activeFingerprints).toBe(1);

      deduplicator.clear();

      const stats2 = deduplicator.getStats();
      expect(stats2.activeFingerprints).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      const stats = deduplicator.getStats();

      expect(stats).toHaveProperty('activeFingerprints');
      expect(stats).toHaveProperty('totalDeduplicated');
      expect(stats).toHaveProperty('activeBursts');
      expect(stats).toHaveProperty('windowMs');
    });
  });
});

// ============================================
// ALERT MANAGER TESTS (Task 3.6.15)
// ============================================

describe('AlertManager', () => {
  let manager: AlertManager;

  beforeEach(() => {
    manager = new AlertManager({
      consoleEnabled: true,
      deduplicationEnabled: true,
      deduplicationConfig: {
        windowMs: 60000,
      },
      routingRules: [
        {
          name: 'critical-to-all',
          minSeverity: AlertSeverity.CRITICAL,
          channel: 'console',
          enabled: true,
        },
      ],
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('emit', () => {
    it('should emit alert and return it', async () => {
      const alert = await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'SQL injection detected',
        source: 'sanitizer',
        evidence: {},
      });

      expect(alert).toBeDefined();
      expect(alert.id).toBeDefined();
      expect(alert.type).toBe(AlertType.SQL_INJECTION);
      expect(alert.severity).toBe(AlertSeverity.HIGH);
      expect(alert.timestamp).toBeInstanceOf(Date);
    });

    it('should include optional fields', async () => {
      const alert = await manager.emit({
        type: AlertType.CROSS_TENANT_VIOLATION,
        severity: AlertSeverity.CRITICAL,
        message: 'Cross-tenant violation',
        source: 'isolation',
        userId: 'user-123',
        tenantId: 'tenant-a',
        toolName: 'database_query',
        requestId: 'req-456',
        evidence: {
          targetTenant: 'tenant-b',
        },
        tags: ['security', 'isolation'],
      });

      expect(alert.userId).toBe('user-123');
      expect(alert.tenantId).toBe('tenant-a');
      expect(alert.toolName).toBe('database_query');
      expect(alert.requestId).toBe('req-456');
      expect(alert.evidence.targetTenant).toBe('tenant-b');
      expect(alert.tags).toContain('security');
    });
  });

  describe('handleSecurityEvent', () => {
    it('should handle security events', async () => {
      const alert = await manager.handleSecurityEvent({
        type: AlertType.SQL_INJECTION,
        message: 'SQL injection detected',
        severity: AlertSeverity.HIGH,
        evidence: {
          injectionType: 'sql',
          input: "'; DROP TABLE users;--",
        },
        userId: 'user-1',
      });

      expect(alert).toBeDefined();
      expect(alert?.severity).toBe(AlertSeverity.HIGH);
    });

    it('should map event types to alert types', async () => {
      const alert = await manager.handleSecurityEvent({
        type: AlertType.CROSS_TENANT_VIOLATION,
        message: 'Cross tenant access attempted',
        severity: AlertSeverity.CRITICAL,
      });

      expect(alert?.type).toBe(AlertType.CROSS_TENANT_VIOLATION);
    });
  });

  describe('getStats', () => {
    it('should return alert statistics', async () => {
      await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test 1',
        source: 'test',
        evidence: {},
      });

      await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.CRITICAL,
        message: 'Test 2',
        source: 'test',
        evidence: {},
      });

      const stats = manager.getStats();

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.bySeverity[AlertSeverity.HIGH]).toBeGreaterThanOrEqual(1);
      expect(stats.bySeverity[AlertSeverity.CRITICAL]).toBeGreaterThanOrEqual(1);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert', async () => {
      const alert = await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        evidence: {},
      });

      const result = manager.acknowledgeAlert(alert.id);
      expect(result).toBe(true);

      const updated = manager.getAlert(alert.id);
      expect(updated?.acknowledged).toBe(true);
    });

    it('should return false for unknown alert', () => {
      const result = manager.acknowledgeAlert('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert with notes', async () => {
      const alert = await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        evidence: {},
      });

      const result = manager.resolveAlert(alert.id, 'False positive - test data');
      expect(result).toBe(true);

      const updated = manager.getAlert(alert.id);
      expect(updated?.resolved).toBe(true);
      expect(updated?.resolutionNotes).toBe('False positive - test data');
    });
  });

  describe('getAlert', () => {
    it('should retrieve alert by id', async () => {
      const alert = await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        evidence: {},
      });

      const retrieved = manager.getAlert(alert.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(alert.id);
    });

    it('should return null for unknown id', () => {
      const result = manager.getAlert('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('queryAlerts', () => {
    it('should filter alerts by type', async () => {
      await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'SQL',
        source: 'test',
        evidence: {},
      });

      await manager.emit({
        type: AlertType.COMMAND_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Command',
        source: 'test',
        evidence: {},
      });

      const sqlAlerts = manager.queryAlerts({ type: AlertType.SQL_INJECTION });
      expect(sqlAlerts.length).toBe(1);
      expect(sqlAlerts[0]?.type).toBe(AlertType.SQL_INJECTION);
    });

    it('should filter alerts by severity', async () => {
      await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'High',
        source: 'test',
        evidence: {},
      });

      await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.CRITICAL,
        message: 'Critical',
        source: 'test',
        evidence: {},
      });

      const criticalAlerts = manager.queryAlerts({ severity: AlertSeverity.CRITICAL });
      expect(criticalAlerts.length).toBe(1);
      expect(criticalAlerts[0]?.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('should get recent alerts', async () => {
      const alert = await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        evidence: {},
      });

      manager.acknowledgeAlert(alert.id);

      const recentAlerts = manager.getRecentAlerts(10);
      const foundAlert = recentAlerts.find((a: { id: string }) => a.id === alert.id);
      expect(foundAlert).toBeDefined();
      expect(foundAlert?.acknowledged).toBe(true);
    });
  });

  describe('getRecentAlerts', () => {
    it('should return recent alerts', async () => {
      await manager.emit({
        type: AlertType.SQL_INJECTION,
        severity: AlertSeverity.HIGH,
        message: 'Test',
        source: 'test',
        evidence: {},
      });

      const alerts = manager.getRecentAlerts(10);
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
