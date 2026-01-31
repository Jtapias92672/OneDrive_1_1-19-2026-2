/**
 * Pending Approval Storage
 *
 * In-memory storage for pending approvals (production should use Redis/DB)
 */

interface PendingApproval {
  requestId: string;
  tool: string;
  params: Record<string, unknown>;
  context: {
    tenantId: string;
    userId?: string;
    sessionId?: string;
  };
  riskAssessment?: {
    score: number;
    riskLevel: string;
    factors: string[];
  };
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'denied' | 'timeout';
}

interface ApprovalDecision {
  approved: boolean;
  approver: string;
  reason?: string;
  timestamp: string;
}

// In-memory storage for demo (production should use Redis/DB)
export const pendingApprovals = new Map<string, PendingApproval>();
export const approvalCallbacks = new Map<string, (decision: ApprovalDecision) => void>();

/**
 * Register a pending approval (called by ApprovalGate)
 */
export function registerPendingApproval(
  pending: PendingApproval,
  callback: (decision: ApprovalDecision) => void
): void {
  pendingApprovals.set(pending.requestId, pending);
  approvalCallbacks.set(pending.requestId, callback);
}

/**
 * Get all pending approvals
 */
export function getAllPendingApprovals(): PendingApproval[] {
  return Array.from(pendingApprovals.values()).filter(
    (p) => p.status === 'pending' && new Date(p.expiresAt) > new Date()
  );
}

/**
 * Get a specific pending approval
 */
export function getPendingApproval(requestId: string): PendingApproval | undefined {
  return pendingApprovals.get(requestId);
}

/**
 * Delete a pending approval
 */
export function deletePendingApproval(requestId: string): void {
  pendingApprovals.delete(requestId);
  approvalCallbacks.delete(requestId);
}

/**
 * Get approval callback
 */
export function getApprovalCallback(requestId: string): ((decision: ApprovalDecision) => void) | undefined {
  return approvalCallbacks.get(requestId);
}

/**
 * Delete approval callback
 */
export function deleteApprovalCallback(requestId: string): void {
  approvalCallbacks.delete(requestId);
}

// Export types
export type { PendingApproval, ApprovalDecision };
