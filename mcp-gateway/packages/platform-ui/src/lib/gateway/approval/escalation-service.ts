/**
 * Approval Escalation Service
 *
 * @epic 3.75 - Code Execution
 * @task RECOVERY-02.6 - Add escalation logic for timeout
 * @owner joe@arcfoundry.ai
 * @created 2026-01-23
 *
 * @description
 *   Handles escalation when approvals approach timeout.
 *   Notifies administrators and logs to audit system.
 *   Integrates with decision-waiter.ts callbacks.
 */

import { ApprovalRequest } from './database';
import {
  NotificationService,
  Approver,
  NotificationResult,
  getDefaultNotificationService,
} from './notification-service';
import {
  DecisionWaiter,
  EscalationCallback,
  TimeoutCallback,
  getDefaultDecisionWaiter,
} from './decision-waiter';

// ============================================
// TYPES
// ============================================

/**
 * Configuration for escalation service
 */
export interface EscalationServiceConfig {
  /** Admin approvers to notify on escalation */
  adminApprovers: Approver[];

  /** Enable audit logging */
  enableAuditLogging: boolean;

  /** Custom escalation message template */
  escalationMessageTemplate?: string;

  /** Custom timeout message template */
  timeoutMessageTemplate?: string;
}

/**
 * Escalation event for audit logging
 */
export interface EscalationEvent {
  type: 'escalation' | 'timeout' | 'auto_deny';
  requestId: string;
  timestamp: Date;
  elapsedMs: number;
  remainingMs?: number;
  notificationsSent: number;
  notificationsSucceeded: number;
  details: Record<string, unknown>;
}

/**
 * Audit logger interface (to be implemented by actual audit system)
 */
export interface IAuditLogger {
  logEscalationEvent(event: EscalationEvent): Promise<void>;
}

// ============================================
// ESCALATION SERVICE
// ============================================

/**
 * Service for handling approval escalations.
 *
 * @example
 * ```typescript
 * const escalationService = new EscalationService({
 *   adminApprovers: [
 *     { id: 'admin-1', email: 'admin@example.com', slackUserId: 'U123' },
 *   ],
 * });
 *
 * // Wire up to decision waiter
 * escalationService.attachToDecisionWaiter(decisionWaiter);
 *
 * // Now decision waiter will automatically escalate at 75% timeout
 * ```
 */
export class EscalationService {
  private config: EscalationServiceConfig;
  private notificationService: NotificationService;
  private auditLogger: IAuditLogger | null = null;

  constructor(
    config?: Partial<EscalationServiceConfig>,
    notificationService?: NotificationService
  ) {
    this.config = {
      adminApprovers: [],
      enableAuditLogging: true,
      escalationMessageTemplate: 'Approval request {requestId} requires attention - {remainingMs}ms remaining',
      timeoutMessageTemplate: 'Approval request {requestId} has timed out and been auto-denied',
      ...config,
    };
    this.notificationService = notificationService || getDefaultNotificationService();
  }

  /**
   * Set the audit logger for recording escalation events
   */
  setAuditLogger(logger: IAuditLogger): void {
    this.auditLogger = logger;
  }

  /**
   * Set admin approvers who receive escalation notifications
   */
  setAdminApprovers(approvers: Approver[]): void {
    this.config.adminApprovers = approvers;
  }

  /**
   * Attach escalation handlers to a decision waiter
   */
  attachToDecisionWaiter(waiter: DecisionWaiter): void {
    waiter.onEscalation(this.handleEscalation.bind(this));
    waiter.onTimeout(this.handleTimeout.bind(this));
  }

  /**
   * Handle escalation at 75% timeout threshold
   */
  async handleEscalation(
    request: ApprovalRequest,
    elapsedMs: number,
    remainingMs: number
  ): Promise<void> {
    console.log(
      `[EscalationService] Escalating request ${request.requestId} ` +
      `(${elapsedMs}ms elapsed, ${remainingMs}ms remaining)`
    );

    // Send notifications to admin approvers
    const results = await this.notifyAdmins(request, 'escalation', {
      elapsedMs,
      remainingMs,
      thresholdReached: '75%',
    });

    // Log to audit system
    if (this.config.enableAuditLogging) {
      await this.logEvent({
        type: 'escalation',
        requestId: request.requestId,
        timestamp: new Date(),
        elapsedMs,
        remainingMs,
        notificationsSent: results.length,
        notificationsSucceeded: results.filter(r => r.success).length,
        details: {
          riskLevel: request.riskLevel,
          toolName: request.toolName,
          requestingUserId: request.requestingUserId,
          tenantId: request.tenantId,
        },
      });
    }
  }

  /**
   * Handle timeout when approval expires
   */
  async handleTimeout(
    request: ApprovalRequest,
    elapsedMs: number
  ): Promise<void> {
    console.log(
      `[EscalationService] Request ${request.requestId} timed out after ${elapsedMs}ms`
    );

    // Send timeout notifications to admin approvers
    const results = await this.notifyAdmins(request, 'timeout', {
      elapsedMs,
      autoDenied: true,
    });

    // Log to audit system
    if (this.config.enableAuditLogging) {
      await this.logEvent({
        type: 'timeout',
        requestId: request.requestId,
        timestamp: new Date(),
        elapsedMs,
        notificationsSent: results.length,
        notificationsSucceeded: results.filter(r => r.success).length,
        details: {
          riskLevel: request.riskLevel,
          toolName: request.toolName,
          requestingUserId: request.requestingUserId,
          tenantId: request.tenantId,
          autoDenied: true,
          reason: 'Approval timeout - fail-closed behavior',
        },
      });

      // Also log the auto-deny event
      await this.logEvent({
        type: 'auto_deny',
        requestId: request.requestId,
        timestamp: new Date(),
        elapsedMs,
        notificationsSent: 0,
        notificationsSucceeded: 0,
        details: {
          riskLevel: request.riskLevel,
          toolName: request.toolName,
          decision: 'denied',
          decisionSource: 'system',
          reason: 'Automatic denial due to approval timeout (fail-closed)',
        },
      });
    }
  }

  /**
   * Manually escalate an approval request
   */
  async escalateApproval(
    request: ApprovalRequest,
    reason: string
  ): Promise<NotificationResult[]> {
    console.log(
      `[EscalationService] Manual escalation for ${request.requestId}: ${reason}`
    );

    const results = await this.notifyAdmins(request, 'manual_escalation', {
      reason,
      manuallyTriggered: true,
    });

    if (this.config.enableAuditLogging) {
      await this.logEvent({
        type: 'escalation',
        requestId: request.requestId,
        timestamp: new Date(),
        elapsedMs: Date.now() - request.createdAt.getTime(),
        notificationsSent: results.length,
        notificationsSucceeded: results.filter(r => r.success).length,
        details: {
          riskLevel: request.riskLevel,
          reason,
          manuallyTriggered: true,
        },
      });
    }

    return results;
  }

  /**
   * Send notifications to admin approvers
   */
  private async notifyAdmins(
    request: ApprovalRequest,
    eventType: string,
    context: Record<string, unknown>
  ): Promise<NotificationResult[]> {
    if (this.config.adminApprovers.length === 0) {
      console.warn('[EscalationService] No admin approvers configured');
      return [];
    }

    // Create escalation request with additional context
    const escalationRequest: ApprovalRequest = {
      ...request,
      context: {
        ...request.context,
        escalationType: eventType,
        escalationContext: context,
      },
    };

    return this.notificationService.notifyApprovers(
      escalationRequest,
      this.config.adminApprovers
    );
  }

  /**
   * Log escalation event to audit system
   */
  private async logEvent(event: EscalationEvent): Promise<void> {
    if (this.auditLogger) {
      try {
        await this.auditLogger.logEscalationEvent(event);
      } catch (error) {
        console.error('[EscalationService] Failed to log event:', error);
      }
    } else {
      // Fallback: console logging
      console.log('[EscalationService] Audit Event:', JSON.stringify(event, null, 2));
    }
  }
}

// ============================================
// CONSOLE AUDIT LOGGER (Default Implementation)
// ============================================

/**
 * Simple console-based audit logger for development/testing
 */
export class ConsoleAuditLogger implements IAuditLogger {
  async logEscalationEvent(event: EscalationEvent): Promise<void> {
    const emoji = event.type === 'escalation' ? '⚠️' :
                  event.type === 'timeout' ? '⏰' :
                  event.type === 'auto_deny' ? '🚫' : '📋';

    console.log(`${emoji} [AUDIT] ${event.type.toUpperCase()}: ${event.requestId}`);
    console.log(`   Timestamp: ${event.timestamp.toISOString()}`);
    console.log(`   Elapsed: ${event.elapsedMs}ms`);
    if (event.remainingMs !== undefined) {
      console.log(`   Remaining: ${event.remainingMs}ms`);
    }
    console.log(`   Notifications: ${event.notificationsSucceeded}/${event.notificationsSent} succeeded`);
    console.log(`   Details:`, event.details);
  }
}

// ============================================
// FACTORY AND DEFAULT INSTANCE
// ============================================

let defaultEscalationService: EscalationService | null = null;

/**
 * Get or create the default escalation service
 */
export function getDefaultEscalationService(): EscalationService {
  if (!defaultEscalationService) {
    defaultEscalationService = new EscalationService();
    // Set up console audit logger by default
    defaultEscalationService.setAuditLogger(new ConsoleAuditLogger());
  }
  return defaultEscalationService;
}

/**
 * Create an escalation service with custom configuration
 */
export function createEscalationService(
  config?: Partial<EscalationServiceConfig>,
  notificationService?: NotificationService
): EscalationService {
  return new EscalationService(config, notificationService);
}

/**
 * Wire up escalation service to default decision waiter
 */
export function setupDefaultEscalation(): void {
  const escalationService = getDefaultEscalationService();
  const decisionWaiter = getDefaultDecisionWaiter();
  escalationService.attachToDecisionWaiter(decisionWaiter);
}
