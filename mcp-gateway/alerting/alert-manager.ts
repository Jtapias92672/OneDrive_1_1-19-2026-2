/**
 * MCP Security Gateway - Alert Manager
 *
 * @epic 3.6 - Security Controls
 * @task 3.6.13 - Alert Manager & Types
 * @task 3.6.15 - Security Integration
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Central alert management for the MCP Gateway.
 *   Handles alert routing, enrichment, and delivery.
 */

import * as crypto from 'crypto';
import {
  SecurityAlert,
  AlertSeverity,
  AlertType,
  AlertEvidence,
  AlertRoutingRule,
  AlertChannel,
  AlertChannelConfig,
  AlertStats,
  getSeverityEmoji,
  meetsMinimumSeverity,
} from './types.js';
import { AlertDeduplicator, DeduplicatorConfig } from './deduplicator.js';

// ============================================
// TYPES
// ============================================

/**
 * Alert manager configuration
 */
export interface AlertManagerConfig {
  /** Enable console output */
  consoleEnabled?: boolean;

  /** Minimum severity for console output */
  consoleMinSeverity?: AlertSeverity;

  /** Enable deduplication */
  deduplicationEnabled?: boolean;

  /** Deduplication configuration */
  deduplicationConfig?: DeduplicatorConfig;

  /** Alert routing rules */
  routingRules?: AlertRoutingRule[];

  /** Alert channels */
  channels?: AlertChannelConfig[];

  /** Enable alert enrichment */
  enrichmentEnabled?: boolean;

  /** Maximum alerts to store in memory */
  maxStoredAlerts?: number;

  /** Alert retention period in milliseconds */
  retentionMs?: number;
}

/**
 * Alert input (partial alert for creation)
 */
export type AlertInput = Omit<SecurityAlert, 'id' | 'timestamp'>;

/**
 * Security event for gateway integration
 */
export interface SecurityEvent {
  type: AlertType | string;
  message: string;
  severity?: AlertSeverity;
  userId?: string;
  tenantId?: string;
  toolName?: string;
  requestId?: string;
  evidence?: AlertEvidence;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MAX_STORED_ALERTS = 10000;
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================
// ALERT MANAGER CLASS
// ============================================

/**
 * Alert Manager
 *
 * Central hub for security alerts with:
 * - Multi-channel delivery (console, email, Slack, webhook)
 * - Alert deduplication
 * - Routing rules
 * - Alert enrichment
 *
 * @example
 * ```typescript
 * const manager = new AlertManager({
 *   consoleEnabled: true,
 *   deduplicationEnabled: true,
 * });
 *
 * // Emit an alert
 * await manager.emit({
 *   type: AlertType.SQL_INJECTION,
 *   severity: AlertSeverity.CRITICAL,
 *   message: 'SQL injection detected in user query',
 *   source: 'sanitizer',
 *   evidence: { query: '...' },
 * });
 *
 * // Or from a security event
 * await manager.handleSecurityEvent({
 *   type: 'INJECTION_BLOCKED',
 *   message: 'Command injection blocked',
 *   userId: 'user-123',
 * });
 * ```
 */
export class AlertManager {
  private config: AlertManagerConfig;
  private deduplicator: AlertDeduplicator | null = null;
  private alerts: Map<string, SecurityAlert> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: AlertManagerConfig = {}) {
    this.config = {
      consoleEnabled: true,
      consoleMinSeverity: AlertSeverity.LOW,
      deduplicationEnabled: true,
      enrichmentEnabled: true,
      maxStoredAlerts: DEFAULT_MAX_STORED_ALERTS,
      retentionMs: DEFAULT_RETENTION_MS,
      routingRules: [],
      channels: [],
      ...config,
    };

    // Initialize deduplicator
    if (this.config.deduplicationEnabled) {
      this.deduplicator = new AlertDeduplicator(this.config.deduplicationConfig);
    }

    // Start cleanup
    this.startCleanup();
  }

  // ==========================================
  // ALERT EMISSION
  // ==========================================

  /**
   * Emit a security alert
   *
   * @param input Alert data
   * @returns Created alert
   */
  async emit(input: AlertInput): Promise<SecurityAlert> {
    // Create full alert
    const alert: SecurityAlert = {
      ...input,
      id: this.generateAlertId(),
      timestamp: new Date(),
    };

    // Enrich alert
    if (this.config.enrichmentEnabled) {
      this.enrichAlert(alert);
    }

    // Check deduplication
    if (this.deduplicator) {
      const result = this.deduplicator.check(alert);
      if (!result.shouldAlert) {
        return alert; // Deduplicated
      }

      // Use aggregated alert if available
      const alertToSend = result.aggregatedAlert ?? alert;
      await this.routeAlert(alertToSend);
      this.storeAlert(alertToSend);
      return alertToSend;
    }

    // No deduplication
    await this.routeAlert(alert);
    this.storeAlert(alert);
    return alert;
  }

  /**
   * Handle a security event from gateway
   */
  async handleSecurityEvent(event: SecurityEvent): Promise<SecurityAlert | null> {
    const severity = event.severity ?? this.inferSeverity(event.type);

    const alert = await this.emit({
      type: event.type,
      severity,
      message: event.message,
      source: 'mcp-gateway',
      userId: event.userId,
      tenantId: event.tenantId,
      toolName: event.toolName,
      requestId: event.requestId,
      evidence: event.evidence ?? {},
    });

    return alert;
  }

  /**
   * Infer severity from event type
   */
  private inferSeverity(type: AlertType | string): AlertSeverity {
    // Critical types
    const criticalTypes = [
      AlertType.CARS_CRITICAL_RISK,
      AlertType.CROSS_TENANT_LEAK,
      AlertType.CROSS_TENANT_VIOLATION,
      AlertType.TOOL_POISONING,
      AlertType.DECEPTIVE_COMPLIANCE,
      AlertType.REWARD_HACKING,
    ];

    if (criticalTypes.includes(type as AlertType)) {
      return AlertSeverity.CRITICAL;
    }

    // High types
    const highTypes = [
      AlertType.SQL_INJECTION,
      AlertType.COMMAND_INJECTION,
      AlertType.PROMPT_INJECTION,
      AlertType.PATH_TRAVERSAL,
      AlertType.XSS_ATTEMPT,
      AlertType.CARS_HIGH_RISK,
      AlertType.TOOL_INTEGRITY_FAILURE,
      AlertType.INJECTION_BLOCKED,
    ];

    if (highTypes.includes(type as AlertType)) {
      return AlertSeverity.HIGH;
    }

    // Medium types
    const mediumTypes = [
      AlertType.TENANT_ACCESS_DENIED,
      AlertType.APPROVAL_REJECTED,
      AlertType.APPROVAL_TIMEOUT,
      AlertType.RATE_LIMIT_EXCEEDED,
      AlertType.UNKNOWN_TOOL,
    ];

    if (mediumTypes.includes(type as AlertType)) {
      return AlertSeverity.MEDIUM;
    }

    // Default to HIGH for unknown types (safety)
    return AlertSeverity.HIGH;
  }

  // ==========================================
  // ROUTING
  // ==========================================

  /**
   * Route alert to configured channels
   */
  private async routeAlert(alert: SecurityAlert): Promise<void> {
    const promises: Promise<void>[] = [];

    // Console output
    if (this.config.consoleEnabled) {
      const minSeverity = this.config.consoleMinSeverity ?? AlertSeverity.LOW;
      if (meetsMinimumSeverity(alert.severity, minSeverity)) {
        promises.push(this.sendToConsole(alert));
      }
    }

    // Check routing rules
    for (const rule of this.config.routingRules ?? []) {
      if (!rule.enabled) continue;

      if (this.matchesRule(alert, rule)) {
        promises.push(this.sendToChannel(alert, rule.channel));
      }
    }

    // Wait for all deliveries
    await Promise.allSettled(promises);
  }

  /**
   * Check if alert matches routing rule
   */
  private matchesRule(alert: SecurityAlert, rule: AlertRoutingRule): boolean {
    // Check type
    if (rule.types && rule.types.length > 0) {
      if (!rule.types.includes(alert.type)) {
        return false;
      }
    }

    // Check severity
    if (rule.minSeverity) {
      if (!meetsMinimumSeverity(alert.severity, rule.minSeverity)) {
        return false;
      }
    }

    // Check tenant
    if (rule.tenantId && alert.tenantId !== rule.tenantId) {
      return false;
    }

    return true;
  }

  /**
   * Send alert to a channel
   */
  private async sendToChannel(
    alert: SecurityAlert,
    channel: AlertChannel
  ): Promise<void> {
    switch (channel) {
      case 'console':
        await this.sendToConsole(alert);
        break;
      case 'email':
        await this.sendToEmail(alert);
        break;
      case 'slack':
        await this.sendToSlack(alert);
        break;
      case 'webhook':
        await this.sendToWebhook(alert);
        break;
      case 'pagerduty':
        await this.sendToPagerDuty(alert);
        break;
      case 'audit_log':
        await this.sendToAuditLog(alert);
        break;
    }
  }

  // ==========================================
  // CHANNEL IMPLEMENTATIONS
  // ==========================================

  /**
   * Send alert to console
   */
  private async sendToConsole(alert: SecurityAlert): Promise<void> {
    const emoji = getSeverityEmoji(alert.severity);
    const timestamp = alert.timestamp.toISOString();

    const output = [
      `${emoji} [SECURITY ALERT] ${alert.type}`,
      `   Severity: ${alert.severity}`,
      `   Message: ${alert.message}`,
      `   Source: ${alert.source}`,
      `   Time: ${timestamp}`,
    ];

    if (alert.userId) output.push(`   User: ${alert.userId}`);
    if (alert.tenantId) output.push(`   Tenant: ${alert.tenantId}`);
    if (alert.toolName) output.push(`   Tool: ${alert.toolName}`);
    if (alert.requestId) output.push(`   Request: ${alert.requestId}`);

    if (alert.evidence && Object.keys(alert.evidence).length > 0) {
      output.push(`   Evidence: ${JSON.stringify(alert.evidence)}`);
    }

    // Use appropriate console method based on severity
    if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH) {
      console.error(output.join('\n'));
    } else if (alert.severity === AlertSeverity.MEDIUM) {
      console.warn(output.join('\n'));
    } else {
      console.log(output.join('\n'));
    }
  }

  /**
   * Send alert to email (placeholder for Epic 3.7)
   */
  private async sendToEmail(alert: SecurityAlert): Promise<void> {
    // Placeholder - will be implemented in Epic 3.7
    console.log(`[EMAIL] Would send alert ${alert.id} to email`);
  }

  /**
   * Send alert to Slack (placeholder for Epic 3.7)
   */
  private async sendToSlack(alert: SecurityAlert): Promise<void> {
    // Placeholder - will be implemented in Epic 3.7
    console.log(`[SLACK] Would send alert ${alert.id} to Slack`);
  }

  /**
   * Send alert to webhook
   */
  private async sendToWebhook(alert: SecurityAlert): Promise<void> {
    const webhookConfig = this.config.channels?.find(c => c.type === 'webhook');
    if (!webhookConfig?.enabled) return;

    const url = webhookConfig.config.url as string;
    if (!url) return;

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookConfig.config.headers as Record<string, string>),
        },
        body: JSON.stringify(alert),
      });
    } catch (error) {
      console.error(`[WEBHOOK] Failed to send alert: ${(error as Error).message}`);
    }
  }

  /**
   * Send alert to PagerDuty (placeholder for Epic 3.7)
   */
  private async sendToPagerDuty(alert: SecurityAlert): Promise<void> {
    // Placeholder - will be implemented in Epic 3.7
    console.log(`[PAGERDUTY] Would send alert ${alert.id} to PagerDuty`);
  }

  /**
   * Send alert to audit log
   */
  private async sendToAuditLog(alert: SecurityAlert): Promise<void> {
    // Structured logging for audit
    const auditEntry = {
      type: 'security_alert',
      alertId: alert.id,
      alertType: alert.type,
      severity: alert.severity,
      message: alert.message,
      source: alert.source,
      timestamp: alert.timestamp.toISOString(),
      userId: alert.userId,
      tenantId: alert.tenantId,
      toolName: alert.toolName,
      requestId: alert.requestId,
    };

    console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);
  }

  // ==========================================
  // ENRICHMENT
  // ==========================================

  /**
   * Enrich alert with additional context
   */
  private enrichAlert(alert: SecurityAlert): void {
    // Add tags based on type
    alert.tags = alert.tags ?? [];

    if (alert.type.toString().includes('INJECTION')) {
      alert.tags.push('injection');
    }

    if (alert.type.toString().includes('TENANT')) {
      alert.tags.push('tenant-security');
    }

    if (alert.type.toString().includes('OAUTH')) {
      alert.tags.push('authentication');
    }

    if (alert.type.toString().includes('CARS')) {
      alert.tags.push('risk-assessment');
    }

    // Add severity tag
    alert.tags.push(alert.severity.toLowerCase());
  }

  // ==========================================
  // STORAGE & RETRIEVAL
  // ==========================================

  /**
   * Store alert in memory
   */
  private storeAlert(alert: SecurityAlert): void {
    // Check max capacity
    const maxAlerts = this.config.maxStoredAlerts ?? DEFAULT_MAX_STORED_ALERTS;
    if (this.alerts.size >= maxAlerts) {
      // Remove oldest alert
      const oldest = this.findOldestAlert();
      if (oldest) {
        this.alerts.delete(oldest);
      }
    }

    this.alerts.set(alert.id, alert);
  }

  /**
   * Find oldest alert ID
   */
  private findOldestAlert(): string | null {
    let oldest: SecurityAlert | null = null;

    for (const alert of this.alerts.values()) {
      if (!oldest || alert.timestamp < oldest.timestamp) {
        oldest = alert;
      }
    }

    return oldest?.id ?? null;
  }

  /**
   * Get alert by ID
   */
  getAlert(id: string): SecurityAlert | null {
    return this.alerts.get(id) ?? null;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 100): SecurityAlert[] {
    const all = Array.from(this.alerts.values());
    return all
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Query alerts
   */
  queryAlerts(filter: {
    type?: AlertType | string;
    severity?: AlertSeverity;
    userId?: string;
    tenantId?: string;
    since?: Date;
  }): SecurityAlert[] {
    return Array.from(this.alerts.values()).filter(alert => {
      if (filter.type && alert.type !== filter.type) return false;
      if (filter.severity && alert.severity !== filter.severity) return false;
      if (filter.userId && alert.userId !== filter.userId) return false;
      if (filter.tenantId && alert.tenantId !== filter.tenantId) return false;
      if (filter.since && alert.timestamp < filter.since) return false;
      return true;
    });
  }

  /**
   * Get alert statistics
   */
  getStats(): AlertStats {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.LOW]: 0,
      [AlertSeverity.INFO]: 0,
    };

    const byType: Record<string, number> = {};
    let unacknowledged = 0;
    let unresolved = 0;
    let lastHour = 0;
    let last24Hours = 0;

    for (const alert of this.alerts.values()) {
      bySeverity[alert.severity]++;
      byType[alert.type] = (byType[alert.type] ?? 0) + 1;

      if (!alert.acknowledged) unacknowledged++;
      if (!alert.resolved) unresolved++;

      const ts = alert.timestamp.getTime();
      if (ts >= hourAgo) lastHour++;
      if (ts >= dayAgo) last24Hours++;
    }

    return {
      total: this.alerts.size,
      bySeverity,
      byType,
      unacknowledged,
      unresolved,
      lastHour,
      last24Hours,
    };
  }

  // ==========================================
  // ALERT MANAGEMENT
  // ==========================================

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert) return false;

    alert.acknowledged = true;
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string, notes?: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolutionNotes = notes;
    return true;
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `alert_${timestamp}_${random}`;
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredAlerts();
    }, 60 * 1000); // Every minute
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
   * Clean up expired alerts
   */
  cleanupExpiredAlerts(): number {
    const retentionMs = this.config.retentionMs ?? DEFAULT_RETENTION_MS;
    const cutoff = Date.now() - retentionMs;
    let cleaned = 0;

    for (const [id, alert] of this.alerts) {
      if (alert.timestamp.getTime() < cutoff) {
        this.alerts.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Dispose of alert manager
   */
  dispose(): void {
    this.stopCleanup();
    this.deduplicator?.dispose();
    this.alerts.clear();
  }
}

// ============================================
// EXPORTS
// ============================================

export default AlertManager;
