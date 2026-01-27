import { NextResponse } from 'next/server';
import { approvalService } from '@/lib/governance/approval';

/**
 * GET /api/governance/approvals/stats
 * Get approval statistics
 */
export async function GET(): Promise<NextResponse> {
  try {
    const stats = await approvalService.getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Approvals] Failed to get stats:', error);
    return NextResponse.json(
      { error: 'Failed to get approval statistics' },
      { status: 500 }
    );
  }
}
