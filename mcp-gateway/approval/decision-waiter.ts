/**
 * Approval Decision Waiter
 *
 * @epic 3.75 - Code Execution
 * @task RECOVERY-02.5 - Implement waitForDecision with configurable timeout
 * @owner joe@arcfoundry.ai
 * @created 2026-01-23
 *
 * @description
 *   Implements the core logic for waiting on human approval decisions.
 *   Polls the database for decisions with configurable interval and timeout.
 *   Returns auto-deny on timeout to ensure fail-closed behavior.
 */

import {
  IApprovalDatabase,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalDatabaseService,
  getDefaultApprovalDatabase,
} from './database.js';

// ============================================
// TYPES
// ============================================

/**
 * Configuration for decision waiting
 */
export interface DecisionWaiterConfig {
  /** Polling interval in milliseconds (default: 1000ms) */
  pollIntervalMs: number;

  /** Default timeout in milliseconds (default: 300000 = 5 minutes) */
  defaultTimeoutMs: number;

  /** Percentage of timeout at which to escalate (default: 0.75 = 75%) */
  escalationThreshold: number;

  /** Whether to enable escalation (default: true) */
  enableEscalation: boolean;
}

/**
 * Result of waiting for a decision
 */
export interface WaitForDecisionResult {
  /** The decision (either from approver or auto-generated) */
  decision: ApprovalDecision;

  /** Whether the decision was made by a human */
  isHumanDecision: boolean;

  /** Whether the request timed out */
  timedOut: boolean;

  /** Whether escalation was triggered */
  escalated: boolean;

  /** Total wait time in milliseconds */
  waitTimeMs: number;
}

/**
 * Callback for escalation events
 */
export type EscalationCallback = (
  request: ApprovalRequest,
  elapsedMs: number,
  remainingMs: number
) => Promise<void>;

/**
 * Callback for timeout events
 */
export type TimeoutCallback = (
  request: ApprovalRequest,
  elapsedMs: number
) => Promise<void>;

// ============================================
// DECISION WAITER CLASS
// ============================================

/**
 * Waits for approval decisions with polling and timeout support.
 *
 * @example
 * ```typescript
 * const waiter = new DecisionWaiter(database);
 *
 * // Set up escalation callback
 * waiter.onEscalation(async (request, elapsed, remaining) => {
 *   await notificationService.notifyAdmins(request, 'Approval pending - 75% timeout');
 * });
 *
 * // Wait for decision
 * const result = await waiter.waitForDecision('request-123', 300000);
 *
 * if (result.timedOut) {
 *   console.log('Request auto-denied due to timeout');
 * } else {
 *   console.log(`Decision: ${result.decision.approved ? 'APPROVED' : 'DENIED'}`);
 * }
 * ```
 */
export class DecisionWaiter {
  private db: IApprovalDatabase;
  private config: DecisionWaiterConfig;
  private escalationCallback: EscalationCallback | null = null;
  private timeoutCallback: TimeoutCallback | null = null;

  constructor(
    db?: IApprovalDatabase,
    config?: Partial<DecisionWaiterConfig>
  ) {
    this.db = db || getDefaultApprovalDatabase();
    this.config = {
      pollIntervalMs: 1000,
      defaultTimeoutMs: 300000, // 5 minutes
      escalationThreshold: 0.75,
      enableEscalation: true,
      ...config,
    };
  }

  /**
   * Set callback for escalation events (triggered at escalation threshold)
   */
  onEscalation(callback: EscalationCallback): void {
    this.escalationCallback = callback;
  }

  /**
   * Set callback for timeout events (triggered when request times out)
   */
  onTimeout(callback: TimeoutCallback): void {
    this.timeoutCallback = callback;
  }

  /**
   * Wait for a decision on an approval request.
   *
   * @param requestId - The approval request ID to wait for
   * @param timeoutMs - Optional timeout override (uses default if not specified)
   * @returns Result containing decision and metadata
   */
  async waitForDecision(
    requestId: string,
    timeoutMs?: number
  ): Promise<WaitForDecisionResult> {
    const timeout = timeoutMs ?? this.config.defaultTimeoutMs;
    const startTime = Date.now();
    const escalationTime = timeout * this.config.escalationThreshold;
    let escalated = false;

    // Get the request to have context for callbacks
    const request = await this.db.getApprovalRequest(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    // Poll for decision
    while (true) {
      const elapsedMs = Date.now() - startTime;
      const remainingMs = timeout - elapsedMs;

      // Check for timeout
      if (elapsedMs >= timeout) {
        // Call timeout callback
        if (this.timeoutCallback) {
          try {
            await this.timeoutCallback(request, elapsedMs);
          } catch (error) {
            console.error('[DecisionWaiter] Timeout callback error:', error);
          }
        }

        // Update request status to expired
        try {
          await this.db.updateApprovalStatus(requestId, 'expired');
        } catch (error) {
          console.error('[DecisionWaiter] Failed to update status to expired:', error);
        }

        // Return auto-deny decision
        const autoDecision: ApprovalDecision = {
          id: `auto-${Date.now()}`,
          requestId,
          approved: false,
          reason: `Approval timeout after ${Math.round(elapsedMs / 1000)} seconds - auto-denied for safety`,
          approverId: 'system',
          approverName: 'System (Timeout)',
          decidedAt: new Date(),
          responseLatencyMs: elapsedMs,
        };

        return {
          decision: autoDecision,
          isHumanDecision: false,
          timedOut: true,
          escalated,
          waitTimeMs: elapsedMs,
        };
      }

      // Check for escalation threshold
      if (
        this.config.enableEscalation &&
        !escalated &&
        elapsedMs >= escalationTime &&
        this.escalationCallback
      ) {
        escalated = true;
        try {
          await this.escalationCallback(request, elapsedMs, remainingMs);
        } catch (error) {
          console.error('[DecisionWaiter] Escalation callback error:', error);
        }
      }

      // Check for decision in database
      const decision = await this.db.getDecision(requestId);
      if (decision) {
        return {
          decision,
          isHumanDecision: true,
          timedOut: false,
          escalated,
          waitTimeMs: Date.now() - startTime,
        };
      }

      // Also check if request status changed (could be cancelled, etc.)
      const currentRequest = await this.db.getApprovalRequest(requestId);
      if (currentRequest && currentRequest.status !== 'pending') {
        // Request was processed outside of normal flow
        const statusDecision: ApprovalDecision = {
          id: `status-${Date.now()}`,
          requestId,
          approved: currentRequest.status === 'approved',
          reason: `Request status changed to: ${currentRequest.status}`,
          approverId: 'system',
          decidedAt: new Date(),
          responseLatencyMs: Date.now() - startTime,
        };

        return {
          decision: statusDecision,
          isHumanDecision: false,
          timedOut: currentRequest.status === 'expired',
          escalated,
          waitTimeMs: Date.now() - startTime,
        };
      }

      // Wait before next poll
      await this.sleep(this.config.pollIntervalMs);
    }
  }

  /**
   * Wait for decision with a specific deadline (absolute time)
   */
  async waitForDecisionUntil(
    requestId: string,
    deadline: Date
  ): Promise<WaitForDecisionResult> {
    const remainingMs = deadline.getTime() - Date.now();
    if (remainingMs <= 0) {
      throw new Error('Deadline has already passed');
    }
    return this.waitForDecision(requestId, remainingMs);
  }

  /**
   * Cancel waiting for a specific request
   * Note: This doesn't stop the polling loop directly -
   * the request status should be updated to 'cancelled' in the database
   */
  async cancelWait(requestId: string): Promise<void> {
    await this.db.updateApprovalStatus(requestId, 'cancelled');
  }

  /**
   * Get current configuration
   */
  getConfig(): DecisionWaiterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DecisionWaiterConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// FACTORY AND DEFAULT INSTANCE
// ============================================

let defaultDecisionWaiter: DecisionWaiter | null = null;

/**
 * Get or create the default decision waiter instance
 */
export function getDefaultDecisionWaiter(): DecisionWaiter {
  if (!defaultDecisionWaiter) {
    defaultDecisionWaiter = new DecisionWaiter();
  }
  return defaultDecisionWaiter;
}

/**
 * Create a decision waiter with custom configuration
 */
export function createDecisionWaiter(
  db?: IApprovalDatabase,
  config?: Partial<DecisionWaiterConfig>
): DecisionWaiter {
  return new DecisionWaiter(db, config);
}

// ============================================
// HELPER FOR SAFE-EXECUTE INTEGRATION
// ============================================

/**
 * Simplified interface for safe-execute.ts integration
 * Returns just the decision info needed for CARSApprovalResponse
 */
export async function waitForApprovalDecision(
  requestId: string,
  timeoutMs: number,
  callbacks?: {
    onEscalation?: EscalationCallback;
    onTimeout?: TimeoutCallback;
  }
): Promise<{
  approved: boolean;
  reason?: string;
  approver?: string;
  timestamp: string;
  timedOut: boolean;
}> {
  const waiter = getDefaultDecisionWaiter();

  if (callbacks?.onEscalation) {
    waiter.onEscalation(callbacks.onEscalation);
  }
  if (callbacks?.onTimeout) {
    waiter.onTimeout(callbacks.onTimeout);
  }

  const result = await waiter.waitForDecision(requestId, timeoutMs);

  return {
    approved: result.decision.approved,
    reason: result.decision.reason,
    approver: result.isHumanDecision ? result.decision.approverId : undefined,
    timestamp: result.decision.decidedAt.toISOString(),
    timedOut: result.timedOut,
  };
}
