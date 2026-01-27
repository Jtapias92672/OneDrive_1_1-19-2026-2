import { NextResponse } from 'next/server';
import { auditLogger } from '@/lib/governance/audit';

/**
 * GET /api/governance/audit/stats
 * Get audit statistics for dashboard
 */
export async function GET(): Promise<NextResponse> {
  try {
    const stats = await auditLogger.getStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Audit] Failed to get stats:', error);
    return NextResponse.json(
      { error: 'Failed to get audit statistics' },
      { status: 500 }
    );
  }
}
