/**
 * MCP Gateway - Execution Audit Logger
 *
 * @epic 3.75 - Code Execution
 * @task 3.75.2.3 - Implement audit logger
 * @owner joe@arcfoundry.ai
 * @created 2026-01-22
 *
 * @description
 *   Log all execution events for compliance auditing.
 *   Aligned with:
 *   - 06_EVIDENCE_PACK § Iteration Schema
 *   - 09_DATA_PROTECTION § DP-06 (audit trail)
 */

import { AuditEvent, AuditEventType, DataClassification, PrivacyDetection } from './types';
import { privacyFilter } from './privacy-filter';

// ============================================
// AUDIT LOGGER
// ============================================

export class ExecutionAuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents: number;
  private sanitizeOutput: boolean;

  constructor(options: AuditLoggerOptions = {}) {
    this.maxEvents = options.maxEvents ?? 10000;
    this.sanitizeOutput = options.sanitizeOutput ?? true;
  }

  // ==========================================
  // LOGGING METHODS
  // ==========================================

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'timestamp'>): void {
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Sanitize details if enabled
    if (this.sanitizeOutput) {
      fullEvent.details = this.sanitizeDetails(event.details);
    }

    this.events.push(fullEvent);

    // Trim if exceeds max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Log execution start
   */
  logExecutionStart(
    sessionId: string,
    executionId: string,
    details: {
      code?: string;
      codeLength?: number;
      options?: Record<string, unknown>;
      riskLevel?: string;
      riskScore?: number;
      riskTypes?: string[];
    },
    classification?: DataClassification
  ): void {
    this.log({
      eventType: 'execution_start',
      sessionId,
      executionId,
      classification,
      riskLevel: details.riskLevel as any,
      details: {
        codeLength: details.codeLength ?? details.code?.length ?? 0,
        codeHash: details.code ? this.hashCode(details.code) : undefined,
        options: details.options,
        riskScore: details.riskScore,
        riskTypes: details.riskTypes,
      },
    });
  }

  /**
   * Log execution end
   */
  logExecutionEnd(
    sessionId: string,
    executionId: string,
    details: {
      success: boolean;
      duration: number;
      memoryUsed?: number;
      outputLength?: number;
      error?: string;
    },
    classification?: DataClassification
  ): void {
    this.log({
      eventType: 'execution_end',
      sessionId,
      executionId,
      classification,
      details: {
        success: details.success,
        duration: details.duration,
        memoryUsed: details.memoryUsed,
        outputLength: details.outputLength,
        error: details.error ? this.truncateError(details.error) : undefined,
      },
    });
  }

  /**
   * Log risk assessment
   */
  logRiskAssessment(
    sessionId: string,
    executionId: string,
    assessment: {
      level: string;
      score: number;
      types: string[];
      factors: string[];
      requiresApproval: boolean;
    }
  ): void {
    this.log({
      eventType: 'risk_assessment',
      sessionId,
      executionId,
      riskLevel: assessment.level as any,
      details: {
        score: assessment.score,
        types: assessment.types,
        factors: assessment.factors.slice(0, 10), // Limit factors
        requiresApproval: assessment.requiresApproval,
      },
    });
  }

  /**
   * Log privacy detection
   */
  logPrivacyDetection(
    sessionId: string,
    executionId: string,
    detections: PrivacyDetection[] | Array<{ type: string; category: string; count: number }>,
    action: 'blocked' | 'redacted' | 'allowed'
  ): void {
    this.log({
      eventType: 'privacy_detection',
      sessionId,
      executionId,
      classification: action === 'blocked' ? 'RESTRICTED' : 'CONFIDENTIAL',
      details: {
        detections: detections.map(d => ({
          type: d.type,
          category: d.category,
          count: 'count' in d ? d.count : 1,
        })),
        action,
        totalDetections: detections.length,
      },
    });
  }

  /**
   * Log approval request
   */
  logApprovalRequest(
    sessionId: string,
    executionId: string,
    requestId: string,
    riskLevel: string
  ): void {
    this.log({
      eventType: 'approval_request',
      sessionId,
      executionId,
      riskLevel: riskLevel as any,
      details: {
        requestId,
        requestedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Log approval response
   */
  logApprovalResponse(
    sessionId: string,
    executionId: string,
    requestId: string,
    approved: boolean,
    approver?: string,
    reason?: string
  ): void {
    this.log({
      eventType: 'approval_response',
      sessionId,
      executionId,
      details: {
        requestId,
        approved,
        approver,
        reason: reason ? this.truncate(reason, 200) : undefined,
        respondedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Log sandbox violation
   */
  logSandboxViolation(
    sessionId: string,
    executionId: string,
    violation: {
      type: 'timeout' | 'memory' | 'network' | 'filesystem' | 'permission';
      details: string;
    }
  ): void {
    this.log({
      eventType: 'sandbox_violation',
      sessionId,
      executionId,
      riskLevel: 'critical',
      details: {
        violationType: violation.type,
        violationDetails: this.truncate(violation.details, 500),
        detectedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Log error
   */
  logError(
    sessionId: string,
    executionId: string | undefined,
    error: Error | string,
    context?: Record<string, unknown>
  ): void {
    this.log({
      eventType: 'error',
      sessionId,
      executionId,
      riskLevel: 'high',
      details: {
        message: typeof error === 'string' ? error : error.message,
        name: error instanceof Error ? error.name : 'Error',
        stack: error instanceof Error ? this.truncate(error.stack ?? '', 500) : undefined,
        context,
      },
    });
  }

  // ==========================================
  // RETRIEVAL METHODS
  // ==========================================

  /**
   * Get events for a session
   */
  getEvents(sessionId?: string): AuditEvent[] {
    if (sessionId) {
      return this.events.filter(e => e.sessionId === sessionId);
    }
    return [...this.events];
  }

  /**
   * Get events for an execution
   */
  getExecutionEvents(executionId: string): AuditEvent[] {
    return this.events.filter(e => e.executionId === executionId);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: AuditEventType): AuditEvent[] {
    return this.events.filter(e => e.eventType === eventType);
  }

  /**
   * Get events within time range
   */
  getEventsInRange(startTime: Date, endTime: Date): AuditEvent[] {
    const start = startTime.toISOString();
    const end = endTime.toISOString();
    return this.events.filter(e => e.timestamp >= start && e.timestamp <= end);
  }

  // ==========================================
  // EXPORT METHODS (06_EVIDENCE_PACK)
  // ==========================================

  /**
   * Export events for Evidence Pack integration
   * Ensures no PII in exported events
   */
  exportForEvidencePack(sessionId: string): AuditEvent[] {
    return this.getEvents(sessionId).map(event => ({
      ...event,
      details: this.sanitizeDetails(event.details),
    }));
  }

  /**
   * Export execution summary for compliance
   */
  exportExecutionSummary(executionId: string): ExecutionAuditSummary | null {
    const events = this.getExecutionEvents(executionId);
    if (events.length === 0) return null;

    const startEvent = events.find(e => e.eventType === 'execution_start');
    const endEvent = events.find(e => e.eventType === 'execution_end');
    const riskEvent = events.find(e => e.eventType === 'risk_assessment');
    const privacyEvents = events.filter(e => e.eventType === 'privacy_detection');
    const violations = events.filter(e => e.eventType === 'sandbox_violation');

    return {
      executionId,
      sessionId: events[0]?.sessionId ?? '',
      startTime: startEvent?.timestamp,
      endTime: endEvent?.timestamp,
      duration: endEvent?.details.duration as number | undefined,
      success: endEvent?.details.success as boolean | undefined,
      riskLevel: riskEvent?.riskLevel,
      riskScore: riskEvent?.details.score as number | undefined,
      privacyDetections: privacyEvents.length,
      violations: violations.map(v => ({
        type: v.details.violationType as string,
        timestamp: v.timestamp,
      })),
      eventCount: events.length,
    };
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Sanitize details object - remove PII
   */
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string') {
        // Check for PII and filter
        if (value.length > 100) {
          sanitized[key] = `[TRUNCATED:${value.length}chars]`;
        } else if (privacyFilter.containsSecrets(value)) {
          sanitized[key] = '[REDACTED:contains_secret]';
        } else if (privacyFilter.containsPII(value)) {
          const filtered = privacyFilter.filter(value);
          sanitized[key] = filtered.filtered;
        } else {
          sanitized[key] = value;
        }
      } else if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 100); // Limit array size
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Hash code for audit without storing actual code
   */
  private hashCode(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `hash:${Math.abs(hash).toString(16)}`;
  }

  /**
   * Truncate string
   */
  private truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...[truncated]';
  }

  /**
   * Truncate error message
   */
  private truncateError(error: string): string {
    // Remove stack traces and long paths
    const firstLine = error.split('\n')[0] ?? error;
    return this.truncate(firstLine, 300);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get statistics
   */
  getStats(): AuditLoggerStats {
    const typeCount = new Map<string, number>();
    for (const event of this.events) {
      typeCount.set(event.eventType, (typeCount.get(event.eventType) ?? 0) + 1);
    }

    return {
      totalEvents: this.events.length,
      maxEvents: this.maxEvents,
      eventsByType: Object.fromEntries(typeCount),
      oldestEvent: this.events[0]?.timestamp,
      newestEvent: this.events[this.events.length - 1]?.timestamp,
    };
  }
}

// ============================================
// TYPES
// ============================================

export interface AuditLoggerOptions {
  /** Maximum events to retain */
  maxEvents?: number;

  /** Whether to sanitize output */
  sanitizeOutput?: boolean;
}

export interface ExecutionAuditSummary {
  executionId: string;
  sessionId: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  success?: boolean;
  riskLevel?: string;
  riskScore?: number;
  privacyDetections: number;
  violations: Array<{ type: string; timestamp: string }>;
  eventCount: number;
}

export interface AuditLoggerStats {
  totalEvents: number;
  maxEvents: number;
  eventsByType: Record<string, number>;
  oldestEvent?: string;
  newestEvent?: string;
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const executionAuditLogger = new ExecutionAuditLogger();

// ============================================
// EXPORTS
// ============================================

export default ExecutionAuditLogger;
