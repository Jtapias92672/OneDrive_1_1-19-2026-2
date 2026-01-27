import { NextRequest, NextResponse } from 'next/server';
import { approvalService } from '@/lib/governance/approval';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface DecideRequest {
  approverId: string;
  approverName?: string;
  decision: 'approved' | 'rejected';
  comments?: string;
}

/**
 * POST /api/governance/approvals/:id/decide
 * Submit approval decision
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as DecideRequest;

    if (!body.approverId || typeof body.approverId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid approverId' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(body.decision)) {
      return NextResponse.json(
        { error: 'Decision must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    const updated = await approvalService.submitDecision(
      id,
      body.approverId,
      body.decision,
      body.comments,
      body.approverName
    );

    console.log(
      `[Approvals] Decision submitted for ${id}: ${body.decision} by ${body.approverId}`
    );

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Approvals] Failed to submit decision:', message);

    // Check for specific error types
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes('not pending') || message.includes('already submitted')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to submit decision' },
      { status: 500 }
    );
  }
}
