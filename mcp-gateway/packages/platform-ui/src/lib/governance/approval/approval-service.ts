/**
 * Approval Service
 * Manages approval workflow lifecycle
 */

import { CARSAssessment } from '../cars/types';
import {
  ApprovalRequest,
  ApprovalDecision,
  ApprovalArtifact,
  ApprovalStats,
  CreateApprovalRequest,
  DecisionType,
} from './types';
import { approvalStore } from './approval-store';

const DEFAULT_DEADLINE_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ApprovalService {
  /**
   * Create a new approval request
   */
  async createRequest(input: CreateApprovalRequest): Promise<ApprovalRequest> {
    const { carsAssessment, summary, details, artifacts, workflowId } = input;

    // Critical risk requires 2 approvals, otherwise 1
    const requiredApprovals =
      carsAssessment.risk.level === 'critical' ? 2 : 1;

    const now = new Date();
    const deadline = new Date(now.getTime() + DEFAULT_DEADLINE_MS);

    const request: ApprovalRequest = {
      id: this.generateId(),
      workflowId,
      status: 'pending',
      riskLevel: carsAssessment.risk.level,
      summary,
      details: details ?? '',
      artifacts: artifacts ?? [],
      carsAssessment,
      requiredApprovals,
      receivedApprovals: 0,
      decisions: [],
      deadline,
      createdAt: now,
    };

    return approvalStore.create(request);
  }

  /**
   * Submit an approval decision
   */
  async submitDecision(
    requestId: string,
    approverId: string,
    decision: DecisionType,
    comments?: string,
    approverName?: string
  ): Promise<ApprovalRequest> {
    // 1. Validate request exists and is pending
    const request = await approvalStore.getById(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    if (request.status !== 'pending') {
      throw new Error(
        `Approval request ${requestId} is not pending (status: ${request.status})`
      );
    }

    // 2. Check approver hasn't already decided
    const existingDecision = request.decisions.find(
      (d) => d.approverId === approverId
    );
    if (existingDecision) {
      throw new Error(
        `Approver ${approverId} has already submitted a decision`
      );
    }

    // 3. Record decision
    const decisionRecord: ApprovalDecision = {
      id: this.generateDecisionId(),
      requestId,
      approverId,
      approverName,
      decision,
      comments,
      createdAt: new Date(),
    };

    await approvalStore.addDecision(requestId, decisionRecord);

    // 4. Handle rejection immediately
    if (decision === 'rejected') {
      const updated = await approvalStore.update(requestId, {
        status: 'rejected',
        resolvedAt: new Date(),
      });
      return updated!;
    }

    // 5. Update approval count
    const newReceivedApprovals = request.receivedApprovals + 1;
    const updates: Partial<ApprovalRequest> = {
      receivedApprovals: newReceivedApprovals,
    };

    // 6. Check if threshold met
    if (newReceivedApprovals >= request.requiredApprovals) {
      updates.status = 'approved';
      updates.resolvedAt = new Date();
    }

    const updated = await approvalStore.update(requestId, updates);
    return updated!;
  }

  /**
   * Check and expire overdue requests
   */
  async checkExpired(): Promise<ApprovalRequest[]> {
    const expired = await approvalStore.getExpired();
    const results: ApprovalRequest[] = [];

    for (const request of expired) {
      const updated = await approvalStore.update(request.id, {
        status: 'expired',
        resolvedAt: new Date(),
      });
      if (updated) {
        results.push(updated);
      }
    }

    return results;
  }

  /**
   * Get pending approval requests
   */
  async getPending(approverId?: string): Promise<ApprovalRequest[]> {
    if (approverId) {
      return approvalStore.getPendingForApprover(approverId);
    }
    return approvalStore.getByStatus('pending');
  }

  /**
   * Get approval request by ID
   */
  async getById(id: string): Promise<ApprovalRequest | null> {
    return approvalStore.getById(id);
  }

  /**
   * Get all approval requests with optional status filter
   */
  async getAll(status?: string): Promise<ApprovalRequest[]> {
    if (status) {
      return approvalStore.getByStatus(status as 'pending' | 'approved' | 'rejected' | 'expired');
    }
    return approvalStore.getAll();
  }

  /**
   * Get approval statistics
   */
  async getStats(): Promise<ApprovalStats> {
    const counts = await approvalStore.countByStatus();
    const resolved = await approvalStore.getResolved();

    // Calculate average decision time
    let totalDecisionTime = 0;
    let decisionCount = 0;

    for (const request of resolved) {
      if (request.resolvedAt) {
        totalDecisionTime +=
          request.resolvedAt.getTime() - request.createdAt.getTime();
        decisionCount++;
      }
    }

    const averageDecisionTime =
      decisionCount > 0 ? Math.round(totalDecisionTime / decisionCount) : 0;

    return {
      pending: counts.pending,
      approved: counts.approved,
      rejected: counts.rejected,
      expired: counts.expired,
      averageDecisionTime,
    };
  }

  /**
   * Reset store (for testing)
   */
  reset(): void {
    approvalStore.reset();
  }

  private generateId(): string {
    return `apr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDecisionId(): string {
    return `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const approvalService = new ApprovalService();
