/**
 * MCP Security Gateway - Approval Gate
 * 
 * @epic 2.5 - MCP Security Gateway
 * @task 4.1 - Human Approval Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-19
 * 
 * @description
 *   Human-in-the-loop approval gate for high-risk MCP operations.
 *   Integrates with CARS framework for risk-based approval decisions.
 */

import {
  ApprovalConfig,
  ApprovalInfo,
  CARSAssessment,
  RequestContext,
} from '../core/types';

import {
  pendingApprovals,
  approvalCallbacks,
  registerPendingApproval,
  type PendingApproval as StoredPendingApproval,
} from './pending-storage';

// ============================================
// APPROVAL GATE
// ============================================

export class ApprovalGate {
  private config: ApprovalConfig;
  private approvalHistory = new Map<string, ApprovalRecord>();
  // Use shared storage for pending approvals (shared with API route)
  // private pendingApprovals and approvalCallbacks now come from pending-storage.ts

  constructor(config: ApprovalConfig) {
    this.config = config;
  }

  // ==========================================
  // APPROVAL REQUEST
  // ==========================================

  /**
   * Request approval for a tool invocation
   */
  async requestApproval(request: ApprovalRequest): Promise<ApprovalInfo> {
    const { requestId, tool, params, context, riskAssessment } = request;

    // Create pending approval
    const pending: PendingApproval = {
      requestId,
      tool,
      params,
      context,
      riskAssessment,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.config.timeoutMs).toISOString(),
      status: 'pending',
    };

    // Notify approvers
    await this.notifyApprovers(pending);

    // Wait for approval or timeout
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        const pendingReq = pendingApprovals.get(requestId);
        if (pendingReq && pendingReq.status === 'pending') {
          pendingReq.status = 'timeout';
          pendingApprovals.delete(requestId);
          approvalCallbacks.delete(requestId);
          resolve({
            required: true,
            status: 'timeout',
          });
        }
      }, this.config.timeoutMs);

      // Register callback for approval response using shared storage
      const callback = (response: ApprovalInfo) => {
        clearTimeout(timeout);
        pendingApprovals.delete(requestId);
        approvalCallbacks.delete(requestId);

        // Record in history
        this.recordApproval(tool, response);

        resolve(response);
      };

      // Register using shared storage function
      registerPendingApproval(pending as any, callback as any);
    });
  }

  /**
   * Submit approval response
   */
  submitApproval(requestId: string, approved: boolean, approver: string, reason?: string): void {
    const callback = approvalCallbacks.get(requestId);
    if (!callback) {
      throw new Error(`No pending approval for request: ${requestId}`);
    }

    const response: ApprovalInfo = {
      required: true,
      status: approved ? 'approved' : 'denied',
      approvedBy: approver,
      approvedAt: new Date().toISOString(),
      reason,
    };

    callback(response as any);
    approvalCallbacks.delete(requestId);
  }

  /**
   * Check if tool has been previously approved
   */
  hasBeenApproved(tool: string): boolean {
    const history = this.approvalHistory.get(tool);
    return history !== undefined && history.lastApproved !== undefined;
  }

  // ==========================================
  // NOTIFICATION
  // ==========================================

  /**
   * Notify approvers of pending request
   */
  private async notifyApprovers(pending: PendingApproval): Promise<void> {
    // Build notification
    const notification: ApprovalNotification = {
      requestId: pending.requestId,
      tool: pending.tool,
      context: pending.context,
      riskAssessment: pending.riskAssessment,
      createdAt: pending.createdAt,
      expiresAt: pending.expiresAt,
      approvalUrl: this.buildApprovalUrl(pending.requestId),
    };

    // Send via callback URL if configured
    if (this.config.callbackUrl) {
      await this.sendCallback(notification);
    }

    // Also emit event for local handling
    this.emitApprovalRequest(notification);
  }

  private buildApprovalUrl(requestId: string): string {
    // Build URL for approval UI
    return `/mcp/approve/${requestId}`;
  }

  private async sendCallback(notification: ApprovalNotification): Promise<void> {
    if (!this.config.callbackUrl) return;

    try {
      await fetch(this.config.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });
    } catch (error) {
      console.error('[ApprovalGate] Failed to send callback:', error);
    }
  }

  private emitApprovalRequest(notification: ApprovalNotification): void {
    // Would emit to event bus for UI/notification handling
    console.log('[ApprovalGate] Approval requested:', {
      requestId: notification.requestId,
      tool: notification.tool,
      riskLevel: notification.riskAssessment?.riskLevel,
      expiresAt: notification.expiresAt,
    });
  }

  // ==========================================
  // HISTORY MANAGEMENT
  // ==========================================

  /**
   * Record approval in history
   */
  private recordApproval(tool: string, response: ApprovalInfo): void {
    let record = this.approvalHistory.get(tool);
    
    if (!record) {
      record = {
        tool,
        approvalCount: 0,
        denialCount: 0,
      };
      this.approvalHistory.set(tool, record);
    }

    if (response.status === 'approved') {
      record.approvalCount++;
      record.lastApproved = response.approvedAt;
      record.lastApprover = response.approvedBy;
    } else if (response.status === 'denied') {
      record.denialCount++;
      record.lastDenied = response.approvedAt;
      record.lastDenier = response.approvedBy;
      record.lastDenialReason = response.reason;
    }
  }

  /**
   * Get approval history for a tool
   */
  getApprovalHistory(tool: string): ApprovalRecord | undefined {
    return this.approvalHistory.get(tool);
  }

  /**
   * Get all pending approvals
   */
  getPendingApprovals(): PendingApproval[] {
    return Array.from(pendingApprovals.values()) as any[];
  }

  /**
   * Clear approval history
   */
  clearHistory(tool?: string): void {
    if (tool) {
      this.approvalHistory.delete(tool);
    } else {
      this.approvalHistory.clear();
    }
  }

  // ==========================================
  // POLICY EVALUATION
  // ==========================================

  /**
   * Evaluate approval policy for a tool
   */
  evaluatePolicy(tool: string, riskAssessment?: CARSAssessment): ApprovalPolicy {
    // Check explicit lists
    if (this.config.autoApprove.includes(tool)) {
      return {
        requiresApproval: false,
        reason: 'Tool is in auto-approve list',
      };
    }

    if (this.config.requireApproval.includes(tool)) {
      return {
        requiresApproval: true,
        reason: 'Tool requires explicit approval',
        escalationLevel: 'standard',
      };
    }

    // Apply default mode
    switch (this.config.defaultMode) {
      case 'always':
        return {
          requiresApproval: true,
          reason: 'All tools require approval',
          escalationLevel: 'standard',
        };

      case 'never':
        return {
          requiresApproval: false,
          reason: 'Approval disabled',
        };

      case 'first-use':
        const hasHistory = this.hasBeenApproved(tool);
        return {
          requiresApproval: !hasHistory,
          reason: hasHistory ? 'Previously approved' : 'First use requires approval',
          escalationLevel: 'standard',
        };

      case 'risk-based':
        return this.evaluateRiskBasedPolicy(tool, riskAssessment);

      default:
        return {
          requiresApproval: true,
          reason: 'Unknown policy mode',
          escalationLevel: 'standard',
        };
    }
  }

  /**
   * Evaluate risk-based approval policy (CARS integration)
   */
  private evaluateRiskBasedPolicy(tool: string, riskAssessment?: CARSAssessment): ApprovalPolicy {
    if (!riskAssessment) {
      return {
        requiresApproval: true,
        reason: 'No risk assessment available',
        escalationLevel: 'standard',
      };
    }

    const threshold = this.config.carsIntegration.riskThreshold;
    const score = riskAssessment.score;

    if (score >= 0.9) {
      return {
        requiresApproval: true,
        reason: `Critical risk level (${(score * 100).toFixed(0)}%)`,
        escalationLevel: 'executive',
        blockRecommended: true,
      };
    }

    if (score >= threshold) {
      return {
        requiresApproval: true,
        reason: `Risk score ${(score * 100).toFixed(0)}% exceeds threshold ${(threshold * 100).toFixed(0)}%`,
        escalationLevel: score >= 0.8 ? 'manager' : 'standard',
      };
    }

    if (score >= 0.5) {
      return {
        requiresApproval: true,
        reason: `Medium risk level (${(score * 100).toFixed(0)}%)`,
        escalationLevel: 'standard',
      };
    }

    return {
      requiresApproval: false,
      reason: `Low risk level (${(score * 100).toFixed(0)}%)`,
    };
  }
}

// ============================================
// TYPES
// ============================================

export interface ApprovalRequest {
  requestId: string;
  tool: string;
  params: Record<string, unknown>;
  context: RequestContext;
  riskAssessment?: CARSAssessment;
}

export interface PendingApproval {
  requestId: string;
  tool: string;
  params: Record<string, unknown>;
  context: RequestContext;
  riskAssessment?: CARSAssessment;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'denied' | 'timeout';
}

export interface ApprovalRecord {
  tool: string;
  approvalCount: number;
  denialCount: number;
  lastApproved?: string;
  lastApprover?: string;
  lastDenied?: string;
  lastDenier?: string;
  lastDenialReason?: string;
}

export interface ApprovalNotification {
  requestId: string;
  tool: string;
  context: RequestContext;
  riskAssessment?: CARSAssessment;
  createdAt: string;
  expiresAt: string;
  approvalUrl: string;
}

export interface ApprovalPolicy {
  requiresApproval: boolean;
  reason: string;
  escalationLevel?: 'standard' | 'manager' | 'executive';
  blockRecommended?: boolean;
}

type ApprovalCallback = (response: ApprovalInfo) => void;

// ============================================
// EXPORTS
// ============================================

export default ApprovalGate;
