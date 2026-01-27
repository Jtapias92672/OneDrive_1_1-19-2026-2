import { NextRequest, NextResponse } from 'next/server';
import { approvalService } from '@/lib/governance/approval';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/governance/approvals/:id
 * Get approval request details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const approval = await approvalService.getById(id);

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(approval);
  } catch (error) {
    console.error('[Approvals] Failed to get approval:', error);
    return NextResponse.json(
      { error: 'Failed to get approval request' },
      { status: 500 }
    );
  }
}
