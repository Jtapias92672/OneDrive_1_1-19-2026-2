/**
 * MCP Security Gateway - Alert Deduplicator
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.14 - Alert Deduplication
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Prevents alert storms by deduplicating similar alerts
 *   within a time window.
 */

import * as crypto from 'crypto';
import { SecurityAlert, AlertSeverity, AlertType } from './types.js';

// ============================================
// TYPES
// ============================================

/**
 * Deduplication configuration
 */
export interface DeduplicatorConfig {
  /** Time window for deduplication in milliseconds (default: 5 min) */
  windowMs?: number;

  /** Maximum alerts to aggregate before forcing send (default: 100) */
  maxAggregation?: number;

  /** Alert types that should never be deduplicated */
  neverDeduplicate?: (AlertType | string)[];

  /** Fields to include in fingerprint calculation */
  fingerprintFields?: string[];

  /** Enable burst detection */
  burstDetection?: boolean;

  /** Burst threshold (alerts per minute) */
  burstThreshold?: number;

  /** Cleanup interval for expired alerts (default: 1 min) */
  cleanupIntervalMs?: number;
}

/**
 * Deduplication result
 */
export interface DeduplicationResult {
  /** Whether alert should be sent */
  shouldAlert: boolean;

  /** Reason for decision */
  reason: 'new' | 'deduplicated' | 'aggregated' | 'burst';

  /** Number of similar alerts seen */
  count: number;

  /** Aggregated alert (if aggregating) */
  aggregatedAlert?: SecurityAlert;
}

/**
 * Alert record for deduplication
 */
interface AlertRecord {
  /** Alert fingerprint */
  fingerprint: string;

  /** First occurrence */
  firstSeen: Date;

  /** Last occurrence */
  lastSeen: Date;

  /** Occurrence count */
  count: number;

  /** Most severe alert in the window */
  mostSevere: SecurityAlert;

  /** All alert IDs in window */
  alertIds: string[];
}

/**
 * Burst detection record
 */
interface BurstRecord {
  /** Start of burst window */
  windowStart: Date;

  /** Alert count in window */
  count: number;

  /** Whether burst has been reported */
  reported: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_AGGREGATION = 100;
const DEFAULT_BURST_THRESHOLD = 60; // 60 alerts per minute
const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

const DEFAULT_FINGERPRINT_FIELDS = [
  'type',
  'severity',
  'source',
  'userId',
  'tenantId',
  'toolName',
];

// ============================================
// ALERT DEDUPLICATOR CLASS
// ============================================

/**
 * Alert Deduplicator
 *
 * Prevents alert fatigue by:
 * - Deduplicating identical alerts within a time window
 * - Aggregating similar alerts into summaries
 * - Detecting alert bursts
 *
 * @example
 * ```typescript
 * const deduplicator = new AlertDeduplicator({
 *   windowMs: 300000, // 5 minutes
 *   maxAggregation: 100,
 *   burstDetection: true,
 * });
 *
 * const result = deduplicator.check(alert);
 * if (result.shouldAlert) {
 *   await alertManager.send(result.aggregatedAlert ?? alert);
 * }
 * ```
 */
export class AlertDeduplicator {
  private config: DeduplicatorConfig;
  private alerts: Map<string, AlertRecord> = new Map();
  private burstRecords: Map<string, BurstRecord> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: DeduplicatorConfig = {}) {
    this.config = {
      windowMs: DEFAULT_WINDOW_MS,
      maxAggregation: DEFAULT_MAX_AGGREGATION,
      neverDeduplicate: [AlertType.CARS_CRITICAL_RISK, AlertType.CROSS_TENANT_LEAK],
      fingerprintFields: DEFAULT_FINGERPRINT_FIELDS,
      burstDetection: true,
      burstThreshold: DEFAULT_BURST_THRESHOLD,
      cleanupIntervalMs: DEFAULT_CLEANUP_INTERVAL_MS,
      ...config,
    };

    // Start cleanup interval
    this.startCleanup();
  }

  // ==========================================
  // DEDUPLICATION
  // ==========================================

  /**
   * Check if alert should be sent
   *
   * @param alert Alert to check
   * @returns Deduplication result
   */
  check(alert: SecurityAlert): DeduplicationResult {
    // Never deduplicate certain alert types
    if (this.shouldNeverDeduplicate(alert)) {
      return { shouldAlert: true, reason: 'new', count: 1 };
    }

    // Calculate fingerprint
    const fingerprint = this.createFingerprint(alert);

    // Check for burst
    if (this.config.burstDetection) {
      const burstResult = this.checkBurst(fingerprint, alert);
      if (burstResult) {
        return burstResult;
      }
    }

    // Check for existing alert
    const existing = this.alerts.get(fingerprint);
    const now = new Date();

    if (existing) {
      const windowMs = this.config.windowMs ?? DEFAULT_WINDOW_MS;
      const inWindow = now.getTime() - existing.firstSeen.getTime() < windowMs;

      if (inWindow) {
        // Update existing record
        existing.lastSeen = now;
        existing.count++;
        existing.alertIds.push(alert.id);

        // Track most severe
        if (this.isSeverityHigher(alert.severity, existing.mostSevere.severity)) {
          existing.mostSevere = alert;
        }

        // Check if should aggregate
        const maxAggregation = this.config.maxAggregation ?? DEFAULT_MAX_AGGREGATION;
        if (existing.count >= maxAggregation) {
          // Force send aggregated alert
          const aggregated = this.createAggregatedAlert(existing);
          this.alerts.delete(fingerprint);
          return {
            shouldAlert: true,
            reason: 'aggregated',
            count: existing.count,
            aggregatedAlert: aggregated,
          };
        }

        return {
          shouldAlert: false,
          reason: 'deduplicated',
          count: existing.count,
        };
      } else {
        // Window expired, send summary and start new window
        const aggregated = this.createAggregatedAlert(existing);
        this.alerts.set(fingerprint, this.createAlertRecord(fingerprint, alert));
        return {
          shouldAlert: true,
          reason: 'aggregated',
          count: existing.count,
          aggregatedAlert: aggregated,
        };
      }
    }

    // New alert
    this.alerts.set(fingerprint, this.createAlertRecord(fingerprint, alert));
    return { shouldAlert: true, reason: 'new', count: 1 };
  }

  /**
   * Simple check - just returns whether to alert
   */
  shouldAlert(alert: SecurityAlert): boolean {
    return this.check(alert).shouldAlert;
  }

  // ==========================================
  // FINGERPRINTING
  // ==========================================

  /**
   * Create fingerprint for alert
   */
  createFingerprint(alert: SecurityAlert): string {
    const fields = this.config.fingerprintFields ?? DEFAULT_FINGERPRINT_FIELDS;
    const parts: string[] = [];

    for (const field of fields) {
      const value = this.getFieldValue(alert, field);
      if (value !== undefined) {
        parts.push(`${field}:${value}`);
      }
    }

    // Add evidence keys (but not values for privacy)
    if (alert.evidence) {
      const evidenceKeys = Object.keys(alert.evidence).sort().join(',');
      parts.push(`evidence:${evidenceKeys}`);
    }

    const combined = parts.join('|');
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get field value from alert
   */
  private getFieldValue(alert: SecurityAlert, field: string): string | undefined {
    switch (field) {
      case 'type':
        return alert.type;
      case 'severity':
        return alert.severity;
      case 'source':
        return alert.source;
      case 'userId':
        return alert.userId;
      case 'tenantId':
        return alert.tenantId;
      case 'toolName':
        return alert.toolName;
      default:
        return (alert as unknown as Record<string, unknown>)[field]?.toString();
    }
  }

  // ==========================================
  // BURST DETECTION
  // ==========================================

  /**
   * Check for alert burst
   */
  private checkBurst(fingerprint: string, alert: SecurityAlert): DeduplicationResult | null {
    const now = new Date();
    const burstKey = `burst:${fingerprint}`;
    const record = this.burstRecords.get(burstKey);

    const threshold = this.config.burstThreshold ?? DEFAULT_BURST_THRESHOLD;
    const windowMs = 60 * 1000; // 1 minute for burst detection

    if (record) {
      const inWindow = now.getTime() - record.windowStart.getTime() < windowMs;

      if (inWindow) {
        record.count++;

        if (record.count >= threshold && !record.reported) {
          record.reported = true;
          return {
            shouldAlert: true,
            reason: 'burst',
            count: record.count,
            aggregatedAlert: this.createBurstAlert(alert, record.count),
          };
        }

        return null; // Let normal deduplication handle it
      } else {
        // New window
        this.burstRecords.set(burstKey, {
          windowStart: now,
          count: 1,
          reported: false,
        });
      }
    } else {
      // First alert
      this.burstRecords.set(burstKey, {
        windowStart: now,
        count: 1,
        reported: false,
      });
    }

    return null;
  }

  /**
   * Create burst notification alert
   */
  private createBurstAlert(sample: SecurityAlert, count: number): SecurityAlert {
    return {
      id: `burst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: AlertType.BURST_DETECTED,
      severity: AlertSeverity.HIGH,
      message: `Alert burst detected: ${count} similar alerts in the last minute`,
      source: 'deduplicator',
      timestamp: new Date(),
      userId: sample.userId,
      tenantId: sample.tenantId,
      toolName: sample.toolName,
      evidence: {
        originalType: sample.type,
        originalSeverity: sample.severity,
        alertCount: count,
        sampleMessage: sample.message,
      },
      tags: ['burst', 'automated'],
    };
  }

  // ==========================================
  // AGGREGATION
  // ==========================================

  /**
   * Create aggregated alert from record
   */
  private createAggregatedAlert(record: AlertRecord): SecurityAlert {
    const sample = record.mostSevere;

    return {
      id: `agg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: sample.type,
      severity: sample.severity,
      message: `[${record.count}x] ${sample.message}`,
      source: sample.source,
      timestamp: new Date(),
      userId: sample.userId,
      tenantId: sample.tenantId,
      toolName: sample.toolName,
      evidence: {
        ...sample.evidence,
        aggregatedCount: record.count,
        firstSeen: record.firstSeen.toISOString(),
        lastSeen: record.lastSeen.toISOString(),
        alertIds: record.alertIds.slice(0, 10), // Limit to first 10
      },
      tags: [...(sample.tags ?? []), 'aggregated'],
    };
  }

  /**
   * Create alert record
   */
  private createAlertRecord(fingerprint: string, alert: SecurityAlert): AlertRecord {
    return {
      fingerprint,
      firstSeen: new Date(),
      lastSeen: new Date(),
      count: 1,
      mostSevere: alert,
      alertIds: [alert.id],
    };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Check if alert should never be deduplicated
   */
  private shouldNeverDeduplicate(alert: SecurityAlert): boolean {
    const neverDedup = this.config.neverDeduplicate ?? [];
    return neverDedup.includes(alert.type);
  }

  /**
   * Compare severity levels
   */
  private isSeverityHigher(a: AlertSeverity, b: AlertSeverity): boolean {
    const order: Record<AlertSeverity, number> = {
      [AlertSeverity.CRITICAL]: 5,
      [AlertSeverity.HIGH]: 4,
      [AlertSeverity.MEDIUM]: 3,
      [AlertSeverity.LOW]: 2,
      [AlertSeverity.INFO]: 1,
    };
    return order[a] > order[b];
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    const intervalMs = this.config.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up expired records
   */
  cleanup(): number {
    const now = Date.now();
    const windowMs = this.config.windowMs ?? DEFAULT_WINDOW_MS;
    let cleaned = 0;

    // Clean alerts
    for (const [fingerprint, record] of this.alerts) {
      if (now - record.lastSeen.getTime() > windowMs) {
        this.alerts.delete(fingerprint);
        cleaned++;
      }
    }

    // Clean burst records (1 minute window)
    for (const [key, record] of this.burstRecords) {
      if (now - record.windowStart.getTime() > 60 * 1000) {
        this.burstRecords.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get statistics
   */
  getStats(): DeduplicatorStats {
    let totalDeduplicated = 0;
    let activeBursts = 0;

    for (const record of this.alerts.values()) {
      if (record.count > 1) {
        totalDeduplicated += record.count - 1;
      }
    }

    for (const record of this.burstRecords.values()) {
      if (record.count >= (this.config.burstThreshold ?? DEFAULT_BURST_THRESHOLD)) {
        activeBursts++;
      }
    }

    return {
      activeFingerprints: this.alerts.size,
      totalDeduplicated,
      activeBursts,
      windowMs: this.config.windowMs ?? DEFAULT_WINDOW_MS,
    };
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.alerts.clear();
    this.burstRecords.clear();
  }

  /**
   * Dispose of deduplicator
   */
  dispose(): void {
    this.stopCleanup();
    this.clear();
  }
}

// ============================================
// TYPES
// ============================================

export interface DeduplicatorStats {
  activeFingerprints: number;
  totalDeduplicated: number;
  activeBursts: number;
  windowMs: number;
}

// ============================================
// EXPORTS
// ============================================

export default AlertDeduplicator;
