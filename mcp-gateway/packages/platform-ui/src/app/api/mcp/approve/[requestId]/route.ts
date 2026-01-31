/**
 * MCP Approval API - Human-in-the-Loop Approval Endpoint
 *
 * Phase 5 Implementation - Approval Gates
 *
 * GET /api/mcp/approve/:requestId - Get pending approval details
 * POST /api/mcp/approve/:requestId - Submit approval decision
 */

import { NextRequest, NextResponse } from 'next/server';

// Approval state storage (in production, use Redis or database)
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

// In-memory storage for demo (production should use Redis/DB)
const pendingApprovals = new Map<string, PendingApproval>();
const approvalCallbacks = new Map<string, (decision: ApprovalDecision) => void>();

interface ApprovalDecision {
  approved: boolean;
  approver: string;
  reason?: string;
  timestamp: string;
}

/**
 * GET /api/mcp/approve/:requestId
 *
 * Retrieve pending approval details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const { requestId } = params;

  const pending = pendingApprovals.get(requestId);

  if (!pending) {
    return NextResponse.json(
      { error: 'Approval request not found or expired' },
      { status: 404 }
    );
  }

  if (pending.status !== 'pending') {
    return NextResponse.json(
      { error: `Request already ${pending.status}` },
      { status: 400 }
    );
  }

  // Check if expired
  if (new Date(pending.expiresAt) < new Date()) {
    pending.status = 'timeout';
    pendingApprovals.delete(requestId);
    return NextResponse.json(
      { error: 'Approval request expired' },
      { status: 410 }
    );
  }

  return NextResponse.json({
    requestId: pending.requestId,
    tool: pending.tool,
    params: pending.params,
    context: pending.context,
    riskAssessment: pending.riskAssessment,
    createdAt: pending.createdAt,
    expiresAt: pending.expiresAt,
    timeRemaining: Math.floor((new Date(pending.expiresAt).getTime() - Date.now()) / 1000),
  });
}

/**
 * POST /api/mcp/approve/:requestId
 *
 * Submit approval decision (approve or deny)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const { requestId } = params;

  try {
    const body = await request.json();
    const { approved, approver, reason } = body;

    // Validate input
    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid "approved" field (must be boolean)' },
        { status: 400 }
      );
    }

    if (!approver || typeof approver !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "approver" field (must be string)' },
        { status: 400 }
      );
    }

    // Check if request exists
    const pending = pendingApprovals.get(requestId);
    if (!pending) {
      return NextResponse.json(
        { error: 'Approval request not found or expired' },
        { status: 404 }
      );
    }

    // Check if already decided
    if (pending.status !== 'pending') {
      return NextResponse.json(
        { error: `Request already ${pending.status}` },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(pending.expiresAt) < new Date()) {
      pending.status = 'timeout';
      pendingApprovals.delete(requestId);
      return NextResponse.json(
        { error: 'Approval request expired' },
        { status: 410 }
      );
    }

    // Create decision
    const decision: ApprovalDecision = {
      approved,
      approver,
      reason,
      timestamp: new Date().toISOString(),
    };

    // Update status
    pending.status = approved ? 'approved' : 'denied';

    // Trigger callback (resume waiting request)
    const callback = approvalCallbacks.get(requestId);
    if (callback) {
      callback(decision);
      approvalCallbacks.delete(requestId);
    }

    // Clean up
    pendingApprovals.delete(requestId);

    // Return success
    return NextResponse.json({
      success: true,
      decision: {
        requestId,
        approved,
        approver,
        reason,
        timestamp: decision.timestamp,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Approval API] Error processing approval:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to process approval', details: errorMessage },
      { status: 500 }
    );
  }
}

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
 * Get all pending approvals (admin endpoint)
 */
export async function getAll(request: NextRequest) {
  const pending = Array.from(pendingApprovals.values()).filter(
    (p) => p.status === 'pending' && new Date(p.expiresAt) > new Date()
  );

  return NextResponse.json({
    pending,
    count: pending.length,
  });
}
