/**
 * MCP Security Gateway - Monitoring
 * 
 * @epic 2.5 - MCP Security Gateway
 * @task 7.1 - Monitoring Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Audit logging and tool behavior monitoring for MCP gateway.
 *   Detects Tool Poisoning Attacks (TPA) through behavior analysis.
 */

import { 
  MonitoringConfig, 
  AuditEntry, 
  MCPTool,
  RiskLevel,
} from '../core/types.js';

// ============================================
// AUDIT LOGGER
// ============================================

export class AuditLogger {
  private config: MonitoringConfig['audit'];
  private entries: AuditEntry[] = [];
  private maxEntries = 10000;

  constructor(config: MonitoringConfig['audit']) {
    this.config = config;
  }

  /**
   * Log an audit entry
   */
  log(entry: AuditEntry): void {
    if (!this.config.enabled) return;

    // Check log level
    const entryLevel = this.getEntryLevel(entry);
    if (!this.shouldLog(entryLevel)) return;

    // Add to in-memory store
    this.entries.push(entry);

    // Trim if too many entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Output based on log level
    this.outputLog(entry);
  }

  private getEntryLevel(entry: AuditEntry): 'debug' | 'info' | 'warn' | 'error' {
    if (entry.eventType.includes('violation') || entry.eventType.includes('failed')) {
      return 'error';
    }
    if (entry.eventType.includes('warning') || entry.eventType.includes('blocked')) {
      return 'warn';
    }
    if (entry.eventType.includes('completed') || entry.eventType.includes('granted')) {
      return 'info';
    }
    return 'debug';
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.logLevel);
  }

  private outputLog(entry: AuditEntry): void {
    const logData = {
      timestamp: entry.timestamp,
      event: entry.eventType,
      tool: entry.tool,
      tenant: entry.tenantId,
      outcome: entry.outcome,
      ...(this.config.includePayloads ? { details: entry.details } : {}),
    };

    switch (this.getEntryLevel(entry)) {
      case 'error':
        console.error('[MCPAudit]', JSON.stringify(logData));
        break;
      case 'warn':
        console.warn('[MCPAudit]', JSON.stringify(logData));
        break;
      default:
        console.log('[MCPAudit]', JSON.stringify(logData));
    }
  }

  /**
   * Query audit log
   */
  query(filter: AuditQueryFilter): AuditEntry[] {
    let results = [...this.entries];

    if (filter.tool) {
      results = results.filter(e => e.tool === filter.tool);
    }

    if (filter.tenantId) {
      results = results.filter(e => e.tenantId === filter.tenantId);
    }

    if (filter.eventType) {
      results = results.filter(e => e.eventType === filter.eventType);
    }

    if (filter.outcome) {
      results = results.filter(e => e.outcome === filter.outcome);
    }

    if (filter.riskLevel) {
      results = results.filter(e => e.riskLevel === filter.riskLevel);
    }

    if (filter.startTime) {
      results = results.filter(e => e.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      results = results.filter(e => e.timestamp <= filter.endTime!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Apply limit
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Get audit statistics
   */
  getStats(since?: string): AuditStats {
    let entries = this.entries;
    
    if (since) {
      entries = entries.filter(e => e.timestamp >= since);
    }

    const stats: AuditStats = {
      totalEvents: entries.length,
      byEventType: {},
      byOutcome: {},
      byTool: {},
      byRiskLevel: {},
    };

    for (const entry of entries) {
      stats.byEventType[entry.eventType] = (stats.byEventType[entry.eventType] || 0) + 1;
      stats.byOutcome[entry.outcome] = (stats.byOutcome[entry.outcome] || 0) + 1;
      stats.byTool[entry.tool] = (stats.byTool[entry.tool] || 0) + 1;
      stats.byRiskLevel[entry.riskLevel] = (stats.byRiskLevel[entry.riskLevel] || 0) + 1;
    }

    return stats;
  }

  /**
   * Export audit log
   */
  export(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'eventType', 'tool', 'tenantId', 'outcome', 'riskLevel'];
      const rows = this.entries.map(e => 
        [e.timestamp, e.eventType, e.tool, e.tenantId, e.outcome, e.riskLevel].join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    }

    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Clear old entries based on retention policy
   */
  cleanup(): number {
    const cutoff = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString();
    
    const before = this.entries.length;
    this.entries = this.entries.filter(e => e.timestamp >= cutoffStr);
    
    return before - this.entries.length;
  }
}

// ============================================
// BEHAVIOR MONITOR
// ============================================

export class BehaviorMonitor {
  private config: MonitoringConfig['toolBehavior'];
  private toolBaselines = new Map<string, ToolBaseline>();
  private descriptionHashes = new Map<string, string>();
  private alerts: BehaviorAlert[] = [];

  constructor(config: MonitoringConfig['toolBehavior']) {
    this.config = config;
  }

  /**
   * Register a tool for monitoring
   */
  registerTool(tool: MCPTool): void {
    if (!this.config.enabled) return;

    // Store description hash for change detection
    const descHash = this.hashDescription(tool.description);
    this.descriptionHashes.set(tool.name, descHash);

    // Initialize baseline
    this.toolBaselines.set(tool.name, {
      tool: tool.name,
      registeredAt: new Date().toISOString(),
      invocationCount: 0,
      avgDurationMs: 0,
      errorRate: 0,
      lastDescriptionHash: descHash,
      permissions: tool.metadata.permissions,
      riskLevel: tool.metadata.riskLevel,
    });
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.toolBaselines.delete(name);
    this.descriptionHashes.delete(name);
  }

  /**
   * Record a tool invocation
   */
  recordInvocation(toolName: string, durationMs: number, success: boolean): void {
    if (!this.config.enabled) return;

    const baseline = this.toolBaselines.get(toolName);
    if (!baseline) return;

    // Update statistics
    const totalInvocations = baseline.invocationCount + 1;
    baseline.avgDurationMs = (baseline.avgDurationMs * baseline.invocationCount + durationMs) / totalInvocations;
    
    if (!success) {
      const errorCount = Math.round(baseline.errorRate * baseline.invocationCount) + 1;
      baseline.errorRate = errorCount / totalInvocations;
    } else {
      const errorCount = Math.round(baseline.errorRate * baseline.invocationCount);
      baseline.errorRate = errorCount / totalInvocations;
    }
    
    baseline.invocationCount = totalInvocations;
    baseline.lastInvocation = new Date().toISOString();
  }

  /**
   * Check tool for behavior changes (Rug Pull detection)
   */
  checkToolIntegrity(tool: MCPTool): IntegrityCheckResult {
    if (!this.config.trackDescriptionChanges) {
      return { valid: true, changes: [] };
    }

    const changes: string[] = [];
    const storedHash = this.descriptionHashes.get(tool.name);
    const currentHash = this.hashDescription(tool.description);

    // Check description change
    if (storedHash && storedHash !== currentHash) {
      changes.push('description_modified');
      
      if (this.config.alertOnChange) {
        this.createAlert(tool.name, 'description_changed', {
          originalHash: storedHash,
          newHash: currentHash,
        });
      }
    }

    // Check baseline changes
    const baseline = this.toolBaselines.get(tool.name);
    if (baseline) {
      // Check for permission changes
      const currentPerms = new Set<string>(tool.metadata.permissions);
      const baselinePerms = new Set<string>(baseline.permissions);

      const addedPerms = [...currentPerms].filter((p: string) => !baselinePerms.has(p));
      const removedPerms = [...baselinePerms].filter((p: string) => !currentPerms.has(p));
      
      if (addedPerms.length > 0) {
        changes.push(`permissions_added: ${addedPerms.join(', ')}`);
        this.createAlert(tool.name, 'permissions_expanded', { added: addedPerms });
      }

      if (removedPerms.length > 0) {
        changes.push(`permissions_removed: ${removedPerms.join(', ')}`);
      }

      // Check for risk level changes
      if (tool.metadata.riskLevel !== baseline.riskLevel) {
        changes.push(`risk_level_changed: ${baseline.riskLevel} -> ${tool.metadata.riskLevel}`);
        this.createAlert(tool.name, 'risk_level_changed', {
          from: baseline.riskLevel,
          to: tool.metadata.riskLevel,
        });
      }
    }

    return {
      valid: changes.length === 0,
      changes,
    };
  }

  /**
   * Detect anomalous behavior
   */
  detectAnomalies(toolName: string): AnomalyDetection {
    const baseline = this.toolBaselines.get(toolName);
    if (!baseline || baseline.invocationCount < 10) {
      return { anomalous: false, anomalies: [] };
    }

    const anomalies: string[] = [];

    // Check error rate spike
    if (baseline.errorRate > 0.3 && baseline.invocationCount > 20) {
      anomalies.push(`High error rate: ${(baseline.errorRate * 100).toFixed(1)}%`);
    }

    // More anomaly detection would go here (timing analysis, pattern detection, etc.)

    return {
      anomalous: anomalies.length > 0,
      anomalies,
    };
  }

  private hashDescription(description: string): string {
    // Simple hash for change detection
    let hash = 0;
    for (let i = 0; i < description.length; i++) {
      const char = description.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private createAlert(tool: string, type: string, details: Record<string, unknown>): void {
    const alert: BehaviorAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      tool,
      type,
      details,
      acknowledged: false,
    };

    this.alerts.push(alert);
    
    // Emit alert
    console.warn('[BehaviorMonitor] ALERT:', JSON.stringify(alert));
  }

  /**
   * Get pending alerts
   */
  getAlerts(unacknowledgedOnly = false): BehaviorAlert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return [...this.alerts];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
    }
  }

  /**
   * Get tool baseline
   */
  getBaseline(toolName: string): ToolBaseline | undefined {
    return this.toolBaselines.get(toolName);
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): ToolBaseline[] {
    return Array.from(this.toolBaselines.values());
  }
}

// ============================================
// TYPES
// ============================================

export interface AuditQueryFilter {
  tool?: string;
  tenantId?: string;
  eventType?: string;
  outcome?: string;
  riskLevel?: RiskLevel;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export interface AuditStats {
  totalEvents: number;
  byEventType: Record<string, number>;
  byOutcome: Record<string, number>;
  byTool: Record<string, number>;
  byRiskLevel: Record<string, number>;
}

export interface ToolBaseline {
  tool: string;
  registeredAt: string;
  invocationCount: number;
  avgDurationMs: number;
  errorRate: number;
  lastDescriptionHash: string;
  permissions: string[];
  riskLevel: RiskLevel;
  lastInvocation?: string;
}

export interface IntegrityCheckResult {
  valid: boolean;
  changes: string[];
}

export interface AnomalyDetection {
  anomalous: boolean;
  anomalies: string[];
}

export interface BehaviorAlert {
  id: string;
  timestamp: string;
  tool: string;
  type: string;
  details: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default AuditLogger;
