/**
 * Approval Store
 * In-memory store for approval requests
 */

import { ApprovalRequest, ApprovalDecision, ApprovalStatus } from './types';

class ApprovalStore {
  private requests: Map<string, ApprovalRequest> = new Map();

  /**
   * Create a new approval request
   */
  async create(request: ApprovalRequest): Promise<ApprovalRequest> {
    this.requests.set(request.id, { ...request });
    return request;
  }

  /**
   * Get approval request by ID
   */
  async getById(id: string): Promise<ApprovalRequest | null> {
    const request = this.requests.get(id);
    return request ? { ...request } : null;
  }

  /**
   * Get all approval requests
   */
  async getAll(): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values()).map((r) => ({ ...r }));
  }

  /**
   * Get requests by status
   */
  async getByStatus(status: ApprovalStatus): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values())
      .filter((r) => r.status === status)
      .map((r) => ({ ...r }));
  }

  /**
   * Get pending requests for a specific approver
   * (In production, this would check approver permissions)
   */
  async getPendingForApprover(approverId: string): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values())
      .filter((r) => {
        if (r.status !== 'pending') return false;
        // Check approver hasn't already decided
        return !r.decisions.some((d) => d.approverId === approverId);
      })
      .map((r) => ({ ...r }));
  }

  /**
   * Update approval request
   */
  async update(
    id: string,
    updates: Partial<ApprovalRequest>
  ): Promise<ApprovalRequest | null> {
    const existing = this.requests.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    this.requests.set(id, updated);
    return { ...updated };
  }

  /**
   * Add decision to request
   */
  async addDecision(
    requestId: string,
    decision: ApprovalDecision
  ): Promise<ApprovalRequest | null> {
    const existing = this.requests.get(requestId);
    if (!existing) return null;

    existing.decisions.push(decision);
    return { ...existing };
  }

  /**
   * Get expired pending requests
   */
  async getExpired(now: Date = new Date()): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values())
      .filter((r) => r.status === 'pending' && r.deadline < now)
      .map((r) => ({ ...r }));
  }

  /**
   * Check if request exists
   */
  async exists(id: string): Promise<boolean> {
    return this.requests.has(id);
  }

  /**
   * Get count by status
   */
  async countByStatus(): Promise<Record<ApprovalStatus, number>> {
    const counts: Record<ApprovalStatus, number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
    };

    Array.from(this.requests.values()).forEach((request) => {
      counts[request.status]++;
    });

    return counts;
  }

  /**
   * Get resolved requests for stats
   */
  async getResolved(): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values())
      .filter((r) => r.status === 'approved' || r.status === 'rejected')
      .map((r) => ({ ...r }));
  }

  /**
   * Reset store (for testing)
   */
  reset(): void {
    this.requests.clear();
  }
}

export const approvalStore = new ApprovalStore();
