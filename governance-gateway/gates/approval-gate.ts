/**
 * FORGE Governance Gateway - Approval Gate
 * 
 * @epic 13 - Governance Gateway (Agentic SDLC)
 * @task 5.1 - Human Review Gates Implementation
 * @owner joe@arcfoundry.ai
 * @created 2026-01-20
 * 
 * @description
 *   Manages human approval checkpoints at critical decisions including
 *   configurable gates, timeout handling, escalation, and approval recording.
 */

import {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalDecision,
  ApprovalContext,
  ApprovalArtifact,
  RiskLevel,
  ApprovalConfig,
} from '../core/types';

// ============================================
// APPROVAL GATE
// ============================================

export class ApprovalGate {
  private config: ApprovalConfig;
  private pendingRequests: Map<string, ApprovalRequest> = new Map();
  private completedRequests: Map<string, ApprovalRequest> = new Map();
  private callbacks: Map<string, ApprovalCallback> = new Map();

  constructor(config?: Partial<ApprovalConfig>) {
    this.config = {
      defaultTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
      autoEscalate: true,
      escalationChain: [],
      bypassLowRisk: true,
      ...config,
    };

    // Start timeout checker
    this.startTimeoutChecker();
  }

  // ==========================================
  // REQUEST MANAGEMENT
  // ==========================================

  /**
   * Create a new approval request
   */
  async createRequest(params: CreateRequestParams): Promise<ApprovalRequest> {
    // Check if bypass allowed for low risk
    if (this.config.bypassLowRisk && params.riskLevel === 'low') {
      return this.createAutoApprovedRequest(params);
    }

    const request: ApprovalRequest = {
      id: this.generateRequestId(),
      taskId: params.taskId,
      workflowId: params.workflowId,
      type: params.type,
      status: 'pending',
      riskLevel: params.riskLevel,
      requiredApprovers: this.determineApprovers(params.riskLevel, params.requiredApprovers),
      currentApprovers: [],
      requiredCount: this.getRequiredCount(params.riskLevel),
      deadline: new Date(Date.now() + (params.timeoutMs || this.config.defaultTimeoutMs)),
      context: params.context,
      createdAt: new Date(),
    };

    this.pendingRequests.set(request.id, request);

    // Notify approvers
    await this.notifyApprovers(request);

    return request;
  }

  private createAutoApprovedRequest(params: CreateRequestParams): ApprovalRequest {
    const request: ApprovalRequest = {
      id: this.generateRequestId(),
      taskId: params.taskId,
      workflowId: params.workflowId,
      type: params.type,
      status: 'approved',
      riskLevel: params.riskLevel,
      requiredApprovers: [],
      currentApprovers: [{
        approverId: 'system',
        approverName: 'Auto-Approval (Low Risk)',
        decision: 'approved',
        reason: 'Low-risk items auto-approved per policy',
        timestamp: new Date(),
      }],
      requiredCount: 0,
      context: params.context,
      createdAt: new Date(),
      resolvedAt: new Date(),
    };

    this.completedRequests.set(request.id, request);
    return request;
  }

  /**
   * Submit an approval decision
   */
  async submitDecision(
    requestId: string,
    approverId: string,
    approverName: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ): Promise<ApprovalRequest | null> {
    const request = this.pendingRequests.get(requestId);
    if (!request) return null;

    // Check if approver is authorized
    if (!this.isAuthorizedApprover(request, approverId)) {
      throw new Error('Not authorized to approve this request');
    }

    // Check for duplicate decisions
    if (request.currentApprovers.some(a => a.approverId === approverId)) {
      throw new Error('Already submitted decision for this request');
    }

    // Add decision
    const decisionRecord: ApprovalDecision = {
      approverId,
      approverName,
      decision,
      reason,
      timestamp: new Date(),
    };

    request.currentApprovers.push(decisionRecord);

    // Check if request is resolved
    if (decision === 'rejected') {
      // Any rejection immediately rejects
      request.status = 'rejected';
      request.resolvedAt = new Date();
      this.moveToCompleted(request);
    } else if (this.hasEnoughApprovals(request)) {
      request.status = 'approved';
      request.resolvedAt = new Date();
      this.moveToCompleted(request);
    }

    // Trigger callback if resolved
    if (request.status !== 'pending') {
      await this.triggerCallback(request);
    }

    return request;
  }

  /**
   * Cancel an approval request
   */
  cancelRequest(requestId: string, reason?: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    request.status = 'expired';
    request.resolvedAt = new Date();
    request.context.details['cancellationReason'] = reason;

    this.moveToCompleted(request);
    return true;
  }

  // ==========================================
  // ESCALATION
  // ==========================================

  /**
   * Escalate a request to the next level
   */
  async escalate(requestId: string, reason?: string): Promise<boolean> {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    request.status = 'escalated';
    
    // Add escalation info
    request.context.details['escalatedAt'] = new Date().toISOString();
    request.context.details['escalationReason'] = reason;
    request.context.previousAttempts = (request.context.previousAttempts || 0) + 1;

    // Get next approvers from escalation chain
    const escalationLevel = request.context.previousAttempts;
    if (escalationLevel < this.config.escalationChain.length) {
      request.requiredApprovers = [this.config.escalationChain[escalationLevel]];
      request.currentApprovers = [];
      request.status = 'pending';
      
      // Reset deadline
      request.deadline = new Date(Date.now() + this.config.defaultTimeoutMs);
      
      await this.notifyApprovers(request);
      return true;
    }

    // No more escalation levels - mark as expired
    request.status = 'expired';
    request.resolvedAt = new Date();
    this.moveToCompleted(request);
    await this.triggerCallback(request);

    return false;
  }

  // ==========================================
  // QUERY
  // ==========================================

  /**
   * Get a request by ID
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.pendingRequests.get(requestId) || this.completedRequests.get(requestId);
  }

  /**
   * Get pending requests for an approver
   */
  getPendingForApprover(approverId: string): ApprovalRequest[] {
    const results: ApprovalRequest[] = [];
    
    for (const request of this.pendingRequests.values()) {
      if (this.isAuthorizedApprover(request, approverId)) {
        // Check not already approved by this user
        if (!request.currentApprovers.some(a => a.approverId === approverId)) {
          results.push(request);
        }
      }
    }

    return results;
  }

  /**
   * Get pending requests for a workflow
   */
  getPendingForWorkflow(workflowId: string): ApprovalRequest[] {
    const results: ApprovalRequest[] = [];
    
    for (const request of this.pendingRequests.values()) {
      if (request.workflowId === workflowId) {
        results.push(request);
      }
    }

    return results;
  }

  /**
   * Get all pending requests
   */
  getAllPending(): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Get completed requests
   */
  getCompleted(limit: number = 100): ApprovalRequest[] {
    const completed = Array.from(this.completedRequests.values());
    return completed.slice(-limit);
  }

  // ==========================================
  // CALLBACKS
  // ==========================================

  /**
   * Register a callback for when a request is resolved
   */
  onResolved(requestId: string, callback: ApprovalCallback): void {
    this.callbacks.set(requestId, callback);
  }

  private async triggerCallback(request: ApprovalRequest): Promise<void> {
    const callback = this.callbacks.get(request.id);
    if (callback) {
      try {
        await callback(request);
      } catch (error) {
        console.error('Approval callback error:', error);
      }
      this.callbacks.delete(request.id);
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private determineApprovers(riskLevel: RiskLevel, suggested?: string[]): string[] {
    if (suggested?.length) return suggested;

    const defaultApprovers: Record<RiskLevel, string[]> = {
      low: [],
      medium: ['team-lead'],
      high: ['team-lead', 'security-reviewer'],
      critical: ['team-lead', 'security-reviewer', 'executive'],
    };

    return defaultApprovers[riskLevel] || ['team-lead'];
  }

  private getRequiredCount(riskLevel: RiskLevel): number {
    const counts: Record<RiskLevel, number> = {
      low: 0,
      medium: 1,
      high: 2,
      critical: 3,
    };
    return counts[riskLevel] || 1;
  }

  private isAuthorizedApprover(request: ApprovalRequest, approverId: string): boolean {
    // If no specific approvers, anyone can approve
    if (request.requiredApprovers.length === 0) return true;
    
    // Check if in required list (by ID or role)
    return request.requiredApprovers.some(a => 
      a === approverId || a.toLowerCase() === approverId.toLowerCase()
    );
  }

  private hasEnoughApprovals(request: ApprovalRequest): boolean {
    const approvals = request.currentApprovers.filter(a => a.decision === 'approved');
    return approvals.length >= request.requiredCount;
  }

  private moveToCompleted(request: ApprovalRequest): void {
    this.pendingRequests.delete(request.id);
    this.completedRequests.set(request.id, request);
  }

  private async notifyApprovers(_request: ApprovalRequest): Promise<void> {
    // In production, this would send emails/Slack/etc.
    // For now, just a placeholder
  }

  private generateRequestId(): string {
    return `apr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ==========================================
  // TIMEOUT HANDLING
  // ==========================================

  private startTimeoutChecker(): void {
    // Check every minute for expired requests
    setInterval(() => this.checkTimeouts(), 60000);
  }

  private async checkTimeouts(): Promise<void> {
    const now = new Date();

    for (const request of this.pendingRequests.values()) {
      if (request.deadline && request.deadline < now) {
        if (this.config.autoEscalate) {
          await this.escalate(request.id, 'Timeout - auto-escalated');
        } else {
          request.status = 'expired';
          request.resolvedAt = now;
          this.moveToCompleted(request);
          await this.triggerCallback(request);
        }
      }
    }
  }

  // ==========================================
  // STATS
  // ==========================================

  getStats(): ApprovalStats {
    let approved = 0;
    let rejected = 0;
    let expired = 0;
    let avgResolutionTime = 0;
    let resolutionTimes: number[] = [];

    for (const request of this.completedRequests.values()) {
      if (request.status === 'approved') approved++;
      else if (request.status === 'rejected') rejected++;
      else if (request.status === 'expired') expired++;

      if (request.resolvedAt) {
        const duration = request.resolvedAt.getTime() - request.createdAt.getTime();
        resolutionTimes.push(duration);
      }
    }

    if (resolutionTimes.length > 0) {
      avgResolutionTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
    }

    return {
      pending: this.pendingRequests.size,
      approved,
      rejected,
      expired,
      total: this.completedRequests.size + this.pendingRequests.size,
      avgResolutionTimeMs: avgResolutionTime,
    };
  }
}

// ============================================
// SUPPORTING TYPES
// ============================================

interface CreateRequestParams {
  taskId: string;
  workflowId: string;
  type: ApprovalRequest['type'];
  riskLevel: RiskLevel;
  context: ApprovalContext;
  requiredApprovers?: string[];
  timeoutMs?: number;
}

type ApprovalCallback = (request: ApprovalRequest) => Promise<void> | void;

interface ApprovalStats {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  total: number;
  avgResolutionTimeMs: number;
}

// ============================================
// EXPORTS
// ============================================

export default ApprovalGate;
